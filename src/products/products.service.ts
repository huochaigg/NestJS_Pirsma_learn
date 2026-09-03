import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { InboundProductDto } from './dto/inbound-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`商品 ${id} 不存在`);
    }
    return product;
  }

  async inbound(id: number, data: InboundProductDto) {
    await this.findOne(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }
}
