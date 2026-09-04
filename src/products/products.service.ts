import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { Product } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { InboundProductDto } from './dto/inbound-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// TTL：Time To Live，缓存最多存活秒数。到期后 Redis 自动过期，下次请求重新 Cache Miss。
// 不要永久缓存 Product：数据库会变，永不过期会长期返回旧数据。
const PRODUCT_CACHE_TTL_SECONDS = 60;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // Cache Key 必须稳定、可预测、带业务前缀，例如 product:1 和 user:1 互不冲突。
  // 不要用随机字符串，否则下一次 GET 找不到同一份缓存。
  private productCacheKey(id: number) {
    return `product:${id}`;
  }

  async create(data: CreateProductDto) {
    try {
      // POST 创建成功后不主动写 Redis。等第一次 GET 再 Cache Aside Lazy Load。
      return await this.prisma.product.create({ data });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  findAll() {
    // 列表缓存 key 要拼 keyword/page/sort，V22 只缓存详情，先把核心模式吃透。
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const key = this.productCacheKey(id);

    try {
      const cached = await this.redis.getJson<Product>(key);
      if (cached) {
        // Cache Hit：Redis 里找到了这份 Product，直接返回，不访问 MySQL。
        console.log(`[CACHE HIT] ${key}`);
        return cached;
      }
      // Cache Miss：Redis 没有该 key（不存在或已过期），需要查数据库再回填缓存。
      console.log(`[CACHE MISS] ${key}`);
    } catch (error) {
      // Cache Fallback/Degradation：缓存是性能层。Redis 出错时降级走 MySQL，业务仍可用，只是变慢。
      // 这里只 catch Redis 失败，不要把 Prisma 错误当成缓存降级。
      console.warn(`[CACHE FALLBACK] ${key} redis get failed, query mysql`);
    }

    // Cache Aside：Application 先查 Cache；Miss 后再查 DB；DB 结果由 Application 写回 Cache。
    // Redis 不会自己去查 MySQL。MySQL 才是 Product 的最终真相来源。
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      // 不缓存“不存在”。不断查 999999 会每次 MISS→MySQL，这是 Cache Penetration 概念。
      // 后续可用短 TTL 缓存 not found；也要注意刚创建的数据可能短暂不可见。V22 只说明不实现。
      throw new NotFoundException(`商品 ${id} 不存在`);
    }

    try {
      // 学习项目缓存完整 Product（含 stock）。真实库存若要求强一致，应缩短 TTL、不缓存 stock，或单独处理。
      // Redis 里的 stock 只是副本，不是库存最终来源。
      await this.redis.setJson(key, product, PRODUCT_CACHE_TTL_SECONDS);
    } catch {
      console.warn(`[CACHE] ${key} redis set failed, still return db result`);
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
      // Cache Invalidation：数据库改成功后 DEL 旧缓存。下次 GET 会 Miss，再从 MySQL 回填最新数据。
      // V22 用 Update DB → Delete Cache，不在这里直接改 Redis 值。
      await this.invalidateProductCache(id);
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
          // increment：数据库层原子执行 stock = stock + quantity，适合入库。
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
      console.warn(`[CACHE] ${key} redis del failed`);
    }
  }
}
