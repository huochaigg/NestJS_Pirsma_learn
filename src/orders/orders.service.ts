import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderConnectOrCreateDto } from './dto/create-order-connect-or-create.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateTransactionOrderDto } from './dto/create-transaction-order.dto';
import { CursorOrderDto } from './dto/cursor-order.dto';
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
      // 这是普通多步写法，不是事务：create Order、扣库存、写流水彼此没有原子性。
      // 如果第二步或第三步失败，已经成功的数据不会自动撤销。
      // 库存一致性请走 createWithTransaction。
      return await this.prisma.order.create({
        data: {
          orderNo: data.orderNo,
          amount: data.amount,
          userId: data.userId,
          productId: data.productId,
          quantity: data.quantity,
          status: data.status,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async createWithTransaction(data: CreateTransactionOrderDto) {
    try {
      // Interactive Transaction：有 if 判断、后一步依赖前一步结果时用回调形式。
      // transaction boundary：从回调开始到 return/throw，这一组操作同属一个事务。
      // tx 是“事务中的 Prisma Client”。回调里所有数据库操作都必须用 tx.xxx，
      // 不能用 this.prisma.xxx，否则那个操作不在同一个事务里。
      // callback 正常 return → Prisma COMMIT，改动全部生效。
      // callback 里 throw → Prisma ROLLBACK，代码“执行过”也不代表最终提交成功。
      // Transaction != Automatically No Oversell：事务保证一组操作一起提交/回滚，
      // 但两个事务可能都先读到 stock=1 再都认为库存足够。防超卖要到 V27。
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: data.userId },
        });
        if (!user) {
          throw new NotFoundException('用户不存在');
        }

        const product = await tx.product.findUnique({
          where: { id: data.productId },
        });
        if (!product) {
          throw new NotFoundException('商品不存在');
        }

        // 库存不足是当前资源状态无法满足请求，409 比 500 更合理。
        if (product.stock < data.quantity) {
          throw new ConflictException('库存不足');
        }

        const order = await tx.order.create({
          data: {
            orderNo: data.orderNo,
            amount: data.amount,
            userId: data.userId,
            productId: data.productId,
            quantity: data.quantity,
          },
        });

        const productAfter = await tx.product.update({
          where: { id: data.productId },
          // decrement：数据库层原子执行 stock = stock - quantity。
          // increment 则是 stock = stock + n，入库用。两者都比先在 JS 里加减再 update 更适合并发写入。
          data: { stock: { decrement: data.quantity } },
        });

        // simulateFail：仅 V13 学习测试用，正式项目应删除。
        // 此时 Order 已 create、stock 已 decrement，但尚未 COMMIT；throw 后全部 ROLLBACK。
        if (data.simulateFail) {
          throw new Error('模拟事务失败');
        }

        const inventoryLog = await tx.inventoryLog.create({
          data: {
            productId: data.productId,
            change: -data.quantity,
            type: 'OUT',
            remark: `order:${data.orderNo}`,
          },
        });

        return { order, productAfter, inventoryLog };
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async createWithConnectOrCreate(data: CreateOrderConnectOrCreateDto) {
    try {
      // connectOrCreate：按唯一条件找关联记录；存在就 connect，不存在就 create 后再连接。
      // where 必须能唯一定位，这里用 User.email（@unique）。
      // 和 upsert 不同：upsert 针对当前 Model 本身有则 update、无则 create；
      // connectOrCreate 针对关联 Relation 有则连接、无则创建后连接。
      return await this.prisma.order.create({
        data: {
          orderNo: data.orderNo,
          amount: data.amount,
          status: data.status,
          user: {
            connectOrCreate: {
              where: { email: data.user.email },
              create: {
                name: data.user.name,
                email: data.user.email,
                age: data.user.age,
              },
            },
          },
          product: {
            connect: { id: data.productId },
          },
          quantity: data.quantity,
        },
        include: { user: true },
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

  async findCursor(query: CursorOrderDto) {
    const limit = query.limit ?? 10;
    const cursor = query.cursor;

    if (cursor !== undefined) {
      const cursorOrder = await this.prisma.order.findUnique({
        where: { id: cursor },
      });
      if (!cursorOrder) {
        throw new NotFoundException(`cursor ${cursor} 对应的订单不存在`);
      }
    }

    // 订单 cursor 分页和 User 同一套：cursor + skip:1 + take:limit+1 + id asc。
    // 真实消息流常用 createdAt + id 做复合排序；V12 只把自增 id 原理学明白，不实现复合 cursor。
    const orders = await this.prisma.order.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { id: 'asc' },
    });

    const hasNextPage = orders.length > limit;
    const list = hasNextPage ? orders.slice(0, limit) : orders;
    const nextCursor = hasNextPage ? list[list.length - 1].id : null;

    return { list, nextCursor, hasNextPage };
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
