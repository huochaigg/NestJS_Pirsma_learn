import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RequestContextService } from '../common/context/request-context.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SqlOrderDetailRow,
  SqlOrderStatusRow,
  SqlUserOrderStatRow,
  SqlUserRow,
} from './sql-demo.types';

const DETAIL_TAKE = 20;

@Injectable()
export class SqlDemoService {
  private readonly logger = new Logger(SqlDemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async findUserById(id: number) {
    this.assertPositiveInt(id);
    this.logger.debug(this.requestContext.prefix(`action=findUserById id=${id}`));

    // $queryRaw：执行会返回查询结果的原生 SQL（典型是 SELECT），结果一般是对象数组。
    // 它是 Prisma ORM 的补充，不是默认方案。简单 findUnique 应继续用 Prisma API。
    // tagged template：`${id}` 不会拼进 SQL 文本，而是参数绑定，降低 SQL Injection 风险。
    // 不要写："SELECT ... WHERE id = " + id
    // 也不要使用 $queryRawUnsafe：它接收普通字符串 SQL，一旦拼接用户输入就很容易注入。
    const rows = await this.runRaw(async () =>
      this.prisma.$queryRaw<SqlUserRow[]>`
        SELECT id, name, email, age, role
        FROM \`User\`
        WHERE id = ${id}
      `,
    );

    const user = rows[0];
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    return user;
  }

  async searchUsers(keyword?: string) {
    const trimmed = keyword?.trim();
    this.logger.debug(
      this.requestContext.prefix(
        `action=searchUsers hasKeyword=${trimmed ? 'yes' : 'no'}`,
      ),
    );

    // LIKE 的 %pattern% 可以在 JS 里拼好，再作为“值”绑定。不要把 keyword 拼进 SQL 文本。
    // 危险写法（禁止）："WHERE name = '" + keyword + "'"
    // 若 keyword = "' OR 1=1 --"，会改变 SQL 结构，这就是 SQL Injection。
    // Prisma.sql：安全的 SQL 片段。Prisma.empty：没有额外条件时占位。
    // Prisma.join 可拼接多个片段；本查询只有一个可选 WHERE，不必用。
    // 参数化只能保护“值”。表名/列名不能当参数绑；动态 ORDER BY 必须服务端白名单，V25 不开放。
    const pattern = trimmed ? `%${trimmed}%` : undefined;
    const whereSql = pattern
      ? Prisma.sql`WHERE name LIKE ${pattern} OR email LIKE ${pattern}`
      : Prisma.empty;

    return this.runRaw(async () =>
      this.prisma.$queryRaw<SqlUserRow[]>`
        SELECT id, name, email, age, role
        FROM \`User\`
        ${whereSql}
        ORDER BY id ASC
        LIMIT ${DETAIL_TAKE}
      `,
    );
  }

  async getOrderDetails() {
    this.logger.debug(this.requestContext.prefix('action=getOrderDetails'));

    const [prismaOrm, rawSql] = await Promise.all([
      this.findOrderDetailsWithPrisma(),
      this.findOrderDetailsWithSql(),
    ]);

    return {
      note: '同一需求两种写法，比较表达方式，不比较谁更快。简单查询优先 Prisma。',
      prismaOrm,
      rawSql,
    };
  }

  private findOrderDetailsWithPrisma() {
    return this.prisma.order.findMany({
      take: DETAIL_TAKE,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        quantity: true,
        status: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    });
  }

  private async findOrderDetailsWithSql() {
    // JOIN Raw SQL：一条 SQL 把多表关联成扁平结果。
    // Prisma include/select 也能拿 relation；复杂报表、CTE、多表聚合时 SQL 往往更直接。
    // INNER JOIN：只返回能关联上的行。当前 Order.userId/productId 必填，用 INNER JOIN 即可。
    // 禁止 SELECT u.*：Raw SQL 不会自动隐藏敏感字段，User.passwordHash 会被一起返回。
    const rows = await this.runRaw(async () =>
      this.prisma.$queryRaw<
        Array<{
          orderId: number;
          orderNo: string;
          amount: number;
          quantity: number;
          status: string;
          userName: string;
          productName: string;
        }>
      >`
        SELECT
          o.id AS orderId,
          o.orderNo AS orderNo,
          o.amount AS amount,
          o.quantity AS quantity,
          o.status AS status,
          u.name AS userName,
          p.name AS productName
        FROM \`Order\` o
        INNER JOIN \`User\` u ON o.userId = u.id
        INNER JOIN \`Product\` p ON o.productId = p.id
        ORDER BY o.id ASC
        LIMIT ${DETAIL_TAKE}
      `,
    );

    return rows.map(
      (row): SqlOrderDetailRow => ({
        orderId: this.toCount(row.orderId),
        orderNo: row.orderNo,
        amount: this.toSum(row.amount),
        quantity: this.toCount(row.quantity),
        status: row.status,
        userName: row.userName,
        productName: row.productName,
      }),
    );
  }

  async getOrdersByStatus() {
    this.logger.debug(this.requestContext.prefix('action=getOrdersByStatusSql'));

    const [viaPrisma, viaRawSql] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { amount: { gt: 0 } },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { status: 'asc' },
      }),
      this.findOrdersByStatusWithSql(),
    ]);

    return {
      note: '简单 groupBy 用 Prisma 就够。多表 JOIN + CASE WHEN + 子查询 + CTE 时，Raw SQL 可能更清晰。',
      viaPrisma: viaPrisma.map((group) => ({
        status: group.status,
        count: group._count._all,
        totalAmount: group._sum.amount ?? 0,
      })),
      viaRawSql,
    };
  }

  private async findOrdersByStatusWithSql() {
    // COUNT(*) AS count、SUM(amount) AS totalAmount：SQL alias，方便结果直接对上 API 字段。
    // MySQL/驱动里 COUNT/SUM 可能是 bigint/string，不能假设永远是 JS number。
    const rows = await this.runRaw(async () =>
      this.prisma.$queryRaw<
        Array<{ status: string; count: unknown; totalAmount: unknown }>
      >`
        SELECT
          status,
          COUNT(*) AS count,
          SUM(amount) AS totalAmount
        FROM \`Order\`
        WHERE amount > 0
        GROUP BY status
        ORDER BY status ASC
      `,
    );

    return rows.map((row): SqlOrderStatusRow => ({
      status: row.status,
      count: this.toCount(this.readField(row, 'count')),
      totalAmount: this.toSum(this.readField(row, 'totalAmount')),
    }));
  }

  async getUserOrderStats() {
    this.logger.debug(this.requestContext.prefix('action=getUserOrderStatsCte'));

    // CTE（Common Table Expression）：用 WITH 把复杂查询拆成命名的临时结果块，提高可读性。
    // 这是 Raw SQL 相对 ORM 的典型价值。Window Function（ROW_NUMBER/RANK）以后再说，V25 不展开。
    const rows = await this.runRaw(async () =>
      this.prisma.$queryRaw<
        Array<{
          userId: unknown;
          name: string;
          orderCount: unknown;
          totalAmount: unknown;
        }>
      >`
        WITH order_stats AS (
          SELECT
            userId,
            COUNT(*) AS orderCount,
            SUM(amount) AS totalAmount
          FROM \`Order\`
          GROUP BY userId
        )
        SELECT
          u.id AS userId,
          u.name AS name,
          os.orderCount,
          os.totalAmount
        FROM order_stats os
        INNER JOIN \`User\` u ON u.id = os.userId
        ORDER BY u.id ASC
      `,
    );

    return rows.map((row): SqlUserOrderStatRow => ({
      userId: this.toCount(this.readField(row, 'userId')),
      name: String(this.readField(row, 'name') ?? ''),
      orderCount: this.toCount(this.readField(row, 'orderCount')),
      totalAmount: this.toSum(this.readField(row, 'totalAmount')),
    }));
  }

  async demoExecuteRawNoop(productId: number) {
    this.assertPositiveInt(productId);
    this.logger.debug(
      this.requestContext.prefix(`action=executeRawNoop productId=${productId}`),
    );

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`商品 ${productId} 不存在`);
    }

    // $executeRaw：执行不以“返回查询结果”为主要目标的 SQL（UPDATE/DELETE 等），返回受影响行数。
    // queryRaw = 查数据，返回 rows；executeRaw = 执行命令，返回 affected rows。
    // 这只是 SQL API 演示：stock = stock 不改变库存。正式库存必须走 V13 事务，不能用 Raw SQL 绕过业务规则。
    // 不要 $executeRaw('ALTER TABLE ...') 管 schema；表结构仍由 schema.prisma + migrate 管理。
    // 不要 $executeRawUnsafe。
    const affectedRows = await this.runRaw(async () =>
      this.prisma.$executeRaw`
        UPDATE \`Product\`
        SET stock = stock
        WHERE id = ${productId}
      `,
    );

    return {
      productId,
      affectedRows,
      note: '开发 Demo：no-op UPDATE，不是正式库存接口。',
    };
  }

  private assertPositiveInt(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('id 必须是正整数');
    }
  }

  private async runRaw<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      // Raw SQL 出错：服务端只记 action，不把 SQL / 敏感参数 / 驱动 stack 返回客户端。
      this.logger.error(this.requestContext.prefix('raw sql failed'));
      throw new InternalServerErrorException('查询失败');
    }
  }

  private readField(row: object, key: string): unknown {
    const record = row as Record<string, unknown>;
    if (record[key] !== undefined) {
      return record[key];
    }
    const matched = Object.keys(record).find(
      (item) => item.toLowerCase() === key.toLowerCase(),
    );
    return matched ? record[matched] : undefined;
  }

  private toCount(value: unknown): number {
    return this.toJsonNumber(value, 0) ?? 0;
  }

  private toSum(value: unknown): number {
    // MySQL 的 SUM(INT) 实际返回 DECIMAL，Prisma 常包装成 Decimal 对象，不是普通 number。
    // 当前业务金额是 Int，这里用 toString 再转 number。若以后列改成 Decimal，应走统一金额转换，不要到处 Number()。
    return this.toJsonNumber(value, 0) ?? 0;
  }

  private toJsonNumber(value: unknown, fallback: number | null): number | null {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === 'bigint') {
      // JSON.stringify 不能序列化 BigInt，会直接抛错。不要给 BigInt.prototype 打 toJSON 补丁。
      if (
        value > BigInt(Number.MAX_SAFE_INTEGER) ||
        value < BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        throw new InternalServerErrorException('数值超出安全整数范围');
      }
      return Number(value);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof value === 'object') {
      if (value instanceof Prisma.Decimal || Prisma.Decimal.isDecimal(value)) {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : fallback;
      }
    }
    return fallback;
  }
}
