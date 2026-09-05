import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '../common/context/request-context.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async getOverview() {
    this.logger.debug(
      this.requestContext.prefix('action=getOverview'),
    );

    // Promise.all：JavaScript 并发等待多个互不依赖的异步查询，减少串行等待。
    // 它不是数据库事务。$transaction 管的是原子性/隔离；Dashboard 这几个独立 read 不需要包事务。
    const [userCount, productCount, pendingOrderCount, orderStats, stockStats] =
      await Promise.all([
        // count()：统计符合条件的记录数量，不返回具体记录。
        // V7 分页用过 count；这里是统计分析：Dashboard 只要“有多少条”，不要 User[]。
        this.prisma.user.count(),
        this.prisma.product.count(),
        // count 和 findMany 一样能带 where。这里只数 pending 订单，不会把订单行查回来。
        this.prisma.order.count({
          where: { status: 'pending' },
        }),
        this.aggregateOrderAmounts(),
        this.aggregateProductStock(),
      ]);

    return {
      userCount,
      productCount,
      pendingOrderCount,
      orderCount: orderStats.orderCount,
      orderAmount: {
        total: orderStats.total,
        average: orderStats.average,
        min: orderStats.min,
        max: orderStats.max,
      },
      totalStock: stockStats,
    };
  }

  private async aggregateOrderAmounts() {
    // aggregate()：对一组记录做聚合计算（总和/平均/最小/最大/条数），返回统计结果，不返回每一条 Order。
    // 错误思路：findMany 全部 Order → Node.js reduce。推荐让数据库算：少传输、少占 Node 内存/CPU。
    // 特别复杂的业务规则才可能在应用层再算；V24 先掌握常规数据库聚合。不要 $queryRaw（V25）。
    const stats = await this.prisma.order.aggregate({
      // _count._all：这一批被聚合的记录有多少条。
      // 和 V10 relation _count.orders 不同：那边是“某个 User 有多少订单”；这里是“这批 Order 一共多少条”。
      _count: { _all: true },
      // _sum：对指定数值字段求和。这里是所有订单 amount 总和。
      // 当前 amount 是 Int，Prisma 返回 number | null，不是 Decimal。
      // 若以后改成 Decimal：Prisma 会返回 Decimal 对象。JS number 有浮点误差，金额不要到处 Number()。
      _sum: { amount: true },
      // _avg：计算数值字段平均值。
      _avg: { amount: true },
      // _min：匹配记录中该字段的最小值。
      _min: { amount: true },
      // _max：匹配记录中该字段的最大值。
      // 一次 aggregate 同时要 _sum/_avg/_min/_max，不要为同一个字段打四次查询。
      _max: { amount: true },
    });

    // 没有订单时 Prisma 的 _sum/_avg/_min/_max 可能是 null，不要假设永远是 number。
    // sum → 0：没有订单时总额按 0 合理。
    // avg/min/max → null：避免把“没有数据”误导成“真实最小值是 0”。
    // 用 ?? 而不是 ||：真实金额 0 不应被当成缺省值。
    return {
      orderCount: stats._count._all,
      total: stats._sum.amount ?? 0,
      average: stats._avg.amount,
      min: stats._min.amount,
      max: stats._max.amount,
    };
  }

  private async aggregateProductStock() {
    const stats = await this.prisma.product.aggregate({
      _sum: { stock: true },
    });
    return stats._sum.stock ?? 0;
  }

  async getOrdersByStatus() {
    this.logger.debug(
      this.requestContext.prefix('action=getOrdersByStatus'),
    );

    // groupBy()：按某个字段把数据分组，再对每组做 count/sum/avg。相当于 SQL GROUP BY 的 ORM 表达。
    // 执行顺序思想：where 先筛原始记录 → groupBy 再分组 → 每组做聚合。
    // having（本版不实现）：过滤分组后的聚合结果，例如“只保留 count >= 2 的 status”。
    // where 看的是分组前的每一行；having 看的是分组后的统计值。不要把两者当成一回事。
    const groups = await this.prisma.order.groupBy({
      // by：指定按哪些字段分组。by: ['status'] 表示 status 相同的 Order 放进同一组。
      by: ['status'],
      // where：分组前先筛数据。这里演示只统计 amount > 0 的订单，不引入日期范围。
      where: { amount: { gt: 0 } },
      _count: { _all: true },
      _sum: { amount: true },
      _avg: { amount: true },
      orderBy: { status: 'asc' },
    });

    // Prisma 原始形状是 { status, _count: { _all }, _sum: { amount } }。
    // Service 转成前端更好读的 { status, count, totalAmount }。
    return groups.map((group) => ({
      status: group.status,
      count: group._count._all,
      totalAmount: group._sum.amount ?? 0,
      averageAmount: group._avg.amount,
    }));
  }

  async getUsersWithOrderStats() {
    this.logger.debug(
      this.requestContext.prefix('action=getUsersWithOrderStats'),
    );

    // groupBy 不只能按 status。按 userId 一次查出每个用户的订单数/总金额。
    // 不要循环每个 User 再 count Order（N+1）。groupBy 一次查询搞定统计。
    const groups = await this.prisma.order.groupBy({
      by: ['userId'],
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { userId: 'asc' },
    });

    // groupBy 不能在这里 JOIN User。需要 name 时再查一次 User，不要在循环里逐个 findUnique。
    const userIds = groups.map((group) => group.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    return groups.map((group) => ({
      userId: group.userId,
      name: nameById.get(group.userId) ?? null,
      orderCount: group._count._all,
      totalAmount: group._sum.amount ?? 0,
    }));
  }
}
