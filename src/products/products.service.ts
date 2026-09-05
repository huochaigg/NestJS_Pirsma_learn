import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RequestContextService } from '../common/context/request-context.service';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { Product } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { InboundProductDto } from './dto/inbound-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_CACHE_TTL_SECONDS = 60;

@Injectable()
export class ProductsService {
  // ProductsService.name 作为 Logger context：日志会带上类名，方便定位来源。
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly requestContext: RequestContextService,
  ) {}

  private productCacheKey(id: number) {
    return `product:${id}`;
  }

  async create(data: CreateProductDto) {
    try {
      return await this.prisma.product.create({ data });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  findAll() {
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const key = this.productCacheKey(id);

    try {
      const cached = await this.redis.getJson<Product>(key);
      if (cached) {
        // debug：调试细节。HIT 很常见，正式环境默认不刷屏。
        this.logger.debug(
          this.requestContext.prefix(`getProduct id=${id} cache=hit`),
        );
        return cached;
      }
      // log：普通运行信息。MISS 意味着这次会打 MySQL，值得记一笔。
      this.logger.log(
        this.requestContext.prefix(`getProduct id=${id} cache=miss`),
      );
    } catch {
      // warn：可恢复但值得关注。Redis 失败后降级 MySQL，请求仍应成功。
      this.logger.warn(
        this.requestContext.prefix(
          `getProduct id=${id} cache=fallback query=mysql`,
        ),
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`商品 ${id} 不存在`);
    }

    try {
      await this.redis.setJson(key, product, PRODUCT_CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn(
        this.requestContext.prefix(`setCache key=${key} failed, return db`),
      );
    }

    return product;
  }

  async update(id: number, data: UpdateProductDto) {
    await this.ensureExists(id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data,
      });
      await this.invalidateProductCache(id);
      this.logger.log(
        this.requestContext.prefix(`updateProduct id=${id} success`),
      );
      return product;
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async remove(id: number) {
    await this.ensureExists(id);
    try {
      const product = await this.prisma.product.delete({
        where: { id },
      });
      await this.invalidateProductCache(id);
      return product;
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async inbound(id: number, data: InboundProductDto) {
    await this.ensureExists(id);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.update({
          where: { id },
          data: { stock: { increment: data.quantity } },
        });
        const inventoryLog = await tx.inventoryLog.create({
          data: {
            productId: id,
            change: data.quantity,
            type: 'IN',
            remark: `inbound:${data.quantity}`,
          },
        });
        return { product, inventoryLog };
      });
      await this.invalidateProductCache(id);
      return result;
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  private async ensureExists(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`商品 ${id} 不存在`);
    }
  }

  private async invalidateProductCache(id: number) {
    const key = this.productCacheKey(id);
    try {
      await this.redis.del(key);
    } catch {
      this.logger.warn(
        this.requestContext.prefix(`delCache key=${key} failed`),
      );
    }
  }
}
