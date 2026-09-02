import { Injectable, NotFoundException } from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      // Order.userId 必须引用一个真实存在的 User，否则会变成孤儿订单。
      throw new NotFoundException('用户不存在');
    }

    try {
      // 最底层关系就是写入外键 userId，V9 不使用 connect / nested create。
      return await this.prisma.order.create({
        data: {
          orderNo: data.orderNo,
          amount: data.amount,
          userId: data.userId,
          status: data.status,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  findAll() {
    // 当前只返回订单自己的字段，能看到 userId 即可。include user 放到 V10。
    return this.prisma.order.findMany();
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`订单 ${id} 不存在`);
    }
    return order;
  }

  async findByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    // 没有用 include。数据库已经有 userId，直接按外键查询：WHERE userId = ?
    return this.prisma.order.findMany({
      where: { userId },
    });
  }

  async remove(id: number) {
    try {
      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }
}
