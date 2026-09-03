import { Injectable, NotFoundException } from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    try {
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

  findAll(query: QueryOrderDto) {
    const where: Prisma.OrderWhereInput = {};

    if (query.userId !== undefined) {
      // A. 直接用外键 scalar field 过滤，相当于 WHERE userId = ?
      where.userId = query.userId;
    }

    if (query.userName?.trim()) {
      // C. relation filter：不是过滤 Order 自己的字段，
      // 而是要求“这条 Order 关联的 User 满足条件”。
      where.user = { name: query.userName.trim() };
    }

    // include：查询当前 Model 时，同时加载关联 Relation。
    // findMany() 默认只返回 Order 自己的 scalar fields（含 userId）。
    // include: { user: true } 后会额外返回关联的 user 对象。
    // userId 是 Order 表里的外键值；user 是 Prisma 按 Relation 组装出来的对象。
    //
    // 不要先 findMany Order，再 for 循环每个订单 findUnique User——那是 N+1 查询。
    // include 会按关联一次性把 User 带出来。
    return this.prisma.order.findMany({
      where,
      include: {
        user: true,
      },
    });
  }

  findSimpleDetails() {
    // select：指定返回哪些字段。
    // include：在当前 Model 全部默认字段之外，再加载关联。
    // 真正需要“只选部分 Order 字段 + 部分 User 字段”时，用 nested select，不要混用顶层 select 和 include。
    return this.prisma.order.findMany({
      select: {
        id: true,
        orderNo: true,
        amount: true,
        // nested select：select 里可以继续进入 Relation，再选子字段。
        // 这里不会返回 User.email、createdAt，也不会返回 Order.status。
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
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

  async findOneWithUser(id: number) {
    // include 也可以和 findUnique 一起用。
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
      },
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
