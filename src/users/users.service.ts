import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { hashPassword } from '../auth/password';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithOrdersDto } from './dto/create-user-with-orders.dto';
import { CursorUserDto } from './dto/cursor-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserWithOrderDto } from './dto/update-user-with-order.dto';
import { userPublicSelect } from './user-public.select';

// @Injectable()：V1 已学过。UsersService 负责用户业务逻辑，PrismaService 负责提供数据库访问能力。
// UsersService 不直接写 SQL，而是调用 Prisma Client。
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Prisma 的 create / findMany / findUnique / findFirst / update / delete / upsert 都是异步数据库 I/O。
  // await 会等数据库操作完成后再拿到结果；Service 返回 Promise 时，Controller 可以直接 return，
  // NestJS 会等 Promise resolve 后再发送 HTTP Response。
  //
  // this.prisma 是 PrismaClient（经 PrismaService 注入）。
  // this.prisma.user 是根据 schema.prisma 里 model User 自动生成的 User Model Client。
  // create / findMany 等是这个 Model Client 提供的 CRUD API：
  // PrismaClient → User Model Client → CRUD Method

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder ?? 'desc');
    // Offset Pagination：客户端用 page/pageSize 表示“第几页”，服务端转成 skip/take。
    // skip = 跳过前多少条；take = 最多取多少条。
    // page=3&pageSize=10 → skip=20、take=10，也就是第 21 到 30 条。
    // 适合后台表格：需要明确第 1/2/3 页，并且经常需要 total / totalPages，还能直接跳第 N 页。
    // skip 很大时（例如 skip 100000 再 take 10）数据库仍要处理前面大量行，可能越来越慢。
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // findMany 和 count 必须用同一个 where，否则 total 和 list 条件不一致。
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: userPublicSelect,
      }),
      // count()：统计符合 where 的记录数，不返回具体数据，用来做分页 total。
      this.prisma.user.count({ where }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findCursor(query: CursorUserDto) {
    const limit = query.limit ?? 10;
    const cursor = query.cursor;

    if (cursor !== undefined) {
      const cursorUser = await this.prisma.user.findUnique({
        where: { id: cursor },
        select: { id: true },
      });
      if (!cursorUser) {
        throw new NotFoundException(`cursor ${cursor} 对应的用户不存在`);
      }
    }

    // Cursor Pagination：用某条唯一记录作为“从哪里继续”的位置，不是“跳过多少条”。
    // cursor 必须用唯一且顺序稳定的字段。这里用 User.id；不要用 name，name 可能重复。
    // cursor: { id } 表示从这条记录附近继续。
    // skip: 1 跳过 cursor 自己，避免上一页最后一条（例如 id=10）再出现一次。
    // take: limit + 1 多取一条，用来判断后面还有没有数据。limit=10 就取 11 条。
    // orderBy 必须固定，且和 cursor 字段一致。V12 固定 id asc，不做动态 sortBy cursor。
    // 不返回 total：聊天/Feed/Agent 历史/无限滚动通常只关心“还有没有下一批”。
    const users = await this.prisma.user.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { id: 'asc' },
      select: userPublicSelect,
    });

    // hasNextPage：实际条数 > limit，说明多出来的那条是“后面还有”。
    const hasNextPage = users.length > limit;
    const list = hasNextPage ? users.slice(0, limit) : users;
    // nextCursor：有下一页时，用当前 list 最后一条的 id；没有则 null。
    const nextCursor = hasNextPage ? list[list.length - 1].id : null;

    return { list, nextCursor, hasNextPage };
  }

  findSimple() {
    // select：指定数据库返回哪些字段。true 表示返回该字段，没选中的字段不会出现。
    // 适合列表只需要部分字段时减少传输；不是每个查询都要强行 select。
    // include 通常用于关联数据，当前 User 还没有 Relation，放到后面再学。
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  private buildWhere(query: QueryUserDto): Prisma.UserWhereInput {
    // where：描述“查询哪些数据”，相当于 SQL 的 WHERE。
    // 只有 query 里真正传了对应参数，才加入条件，不要把所有过滤写死。
    const where: Prisma.UserWhereInput = {};
    const keyword = query.keyword?.trim();

    if (keyword) {
      // contains：字段中包含指定字符串，类似 SQL LIKE '%keyword%'。
      // OR：多个条件满足任意一个即可。keyword 会同时搜 name 或 email。
      where.OR = [
        { name: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }

    if (query.age !== undefined) {
      // equals：字段等于某个值。也可以写成 age: query.age，equals 更显式。
      // Prisma 顶层多个条件默认是 AND：既要满足 keyword 的 OR，又要 age 相等。
      where.age = { equals: query.age };
    }

    if (query.namePrefix?.trim()) {
      // startsWith：字符串以指定内容开头，类似 SQL LIKE 'Tom%'。
      where.name = { startsWith: query.namePrefix.trim() };
    }

    if (query.ids) {
      const idList = query.ids
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((id) => !Number.isNaN(id));
      if (idList.length > 0) {
        // in：字段值是否属于某个集合，类似 SQL IN (1,2,3)。
        where.id = { in: idList };
      }
    }

    if (query.excludeEmail?.trim()) {
      // not：排除某个条件。这里排除指定 email。
      where.email = { not: query.excludeEmail.trim() };
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.UserOrderByWithRelationInput {
    // orderBy：数据库排序。asc 升序，desc 降序。
    // sortBy 只允许白名单字段，不能把客户端任意字符串直接传给 Prisma。
    switch (sortBy) {
      case 'id':
        return { id: sortOrder };
      case 'name':
        return { name: sortOrder };
      case 'age':
        return { age: sortOrder };
      case 'updatedAt':
        return { updatedAt: sortOrder };
      case 'createdAt':
      default:
        return { createdAt: sortOrder };
    }
  }


  async findOne(id: number) {
    this.assertValidId(id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) {
      // throw 后当前方法立刻停止。
      // NestJS 会捕获这个异常并转成 HTTP Response，Controller 不用 try/catch。
      // NotFoundException：HTTP 404，表示请求的资源不存在。
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    return user;
  }

  async findOrders(userId: number) {
    this.assertValidId(userId);
    await this.findOne(userId);
    // 没有用 include。直接按 Order.userId 外键查询该用户的订单。
    return this.prisma.order.findMany({
      where: { userId },
    });
  }

  async findOneWithOrders(id: number) {
    this.assertValidId(id);
    // include orders：User schema 里有 orders Order[]，所以 Client 允许 include: { orders: true }。
    // 查用户时顺带查出他的订单。User 表里并没有 orders 列，数据仍来自 Order.userId。
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userPublicSelect,
        orders: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    return user;
  }

  findWithPendingOrders() {
    // some：关联的 Order 数组里“至少有一条”满足条件。
    return this.prisma.user.findMany({
      where: {
        orders: {
          some: { status: 'pending' },
        },
      },
      select: userPublicSelect,
    });
  }

  findWithEveryPendingOrder() {
    // every：所有关联 Order 都满足条件。
    // 没有任何订单的 User，every 在 SQL 里常被当成“全部满足”，结果可能也被查出来，使用时要注意。
    return this.prisma.user.findMany({
      where: {
        orders: {
          every: { status: 'pending' },
        },
      },
      select: userPublicSelect,
    });
  }

  findWithoutOrders() {
    // none：没有任何关联记录满足条件。none: {} 表示没有任何 Order。
    return this.prisma.user.findMany({
      where: {
        orders: {
          none: {},
        },
      },
      select: userPublicSelect,
    });
  }

  findWithOrderCount() {
    // _count.orders：某个 User 关联了多少条 Order，不用把订单数据全部查回来。
    // 区别：prisma.user.count() 统计有多少个 User；_count.orders 统计某个 User 有多少订单。
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    // 这是“检查用户是否存在”的辅助方法，找不到就返回 null，不抛 404。
    // 是否抛异常取决于业务语义：findOne 必须找到用户，所以抛 404。
    return this.prisma.user.findUnique({
      where: { email },
      select: userPublicSelect,
    });
  }

  async search(keyword?: string) {
    // findFirst()：根据普通条件查询符合条件的第一条记录。
    // 和 findUnique 的最大区别：不要求查询字段具有唯一约束。
    // name 不是唯一字段，多个同名 User 时 findFirst 只返回其中第一条。
    if (!keyword) {
      return null;
    }
    return this.prisma.user.findFirst({
      where: { name: keyword },
      select: userPublicSelect,
    });
  }

  async create(data: CreateUserDto) {
    try {
      // POST /users 是用户管理，不是注册。正式注册走 AuthModule。
      // 这里没有用户密码，写入随机 Hash，该用户不能用已知密码登录。
      return await this.prisma.user.create({
        data: {
          ...data,
          passwordHash: await hashPassword(randomUUID()),
        },
        select: userPublicSelect,
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async createWithOrders(data: CreateUserWithOrdersDto) {
    try {
      // nested create：创建父记录 User 时，通过 Relation 字段 orders 同时创建关联 Order。
      // Prisma 会自动写入 Order.userId，不必先拿 user.id 再循环 create。
      // 普通写法：create User → 拿 id → 循环 create Order。
      // nested create：一次 Relation 写操作表达“创建 User 同时创建 Orders”。
      return await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          age: data.age,
          passwordHash: await hashPassword(randomUUID()),
          orders: {
            create: data.orders,
          },
        },
        select: {
          ...userPublicSelect,
          orders: true,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async connectOrder(userId: number, orderId: number) {
    this.assertValidId(userId);
    this.assertValidId(orderId);
    await this.findOne(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`订单 ${orderId} 不存在`);
    }
    try {
      // connect：关联已经存在的记录，不会新建 Order。
      // create = 新建关联记录；connect = 把已有记录接到当前 Relation。
      // 当前 Order 只能属于一个 User，所以 connect 会把这个订单改挂到当前用户。
      // disconnect = 只解除关系、不删除记录。当前 Order.userId 必填，
      // 不能把订单 disconnect 成“不属于任何人”，所以 V11 不提供 disconnect 接口。
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          orders: {
            connect: { id: orderId },
          },
        },
        select: {
          ...userPublicSelect,
          orders: true,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async updateWithOrder(id: number, data: UpdateUserWithOrderDto) {
    this.assertValidId(id);
    await this.findOne(id);
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });
    if (!order || order.userId !== id) {
      throw new NotFoundException('订单不存在或不属于当前用户');
    }
    try {
      // nested update：从 User update 进入 orders Relation，再改关联 Order。
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          orders: {
            update: {
              where: { id: data.orderId },
              data: { status: data.status },
            },
          },
        },
        select: {
          ...userPublicSelect,
          orders: true,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async nestedDeleteOrder(userId: number, orderId: number) {
    this.assertValidId(userId);
    this.assertValidId(orderId);
    await this.findOne(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在或不属于当前用户');
    }
    try {
      // nested delete：通过父 Model 的 Relation 删除某条关联记录。
      // 这是真的 DELETE Order 数据，不是只解除关系。
      // delete = 删除关联记录；disconnect = 解除关系但记录还在。
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          orders: {
            delete: { id: orderId },
          },
        },
        select: {
          ...userPublicSelect,
          orders: true,
        },
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async update(id: number, data: UpdateUserDto) {
    this.assertValidId(id);
    try {
      // 方案 B：直接 update，捕获 Prisma 错误再转换 HTTP 状态。
      // 记录不存在 → P2025 → 404；email 冲突 → P2002 → 409。
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userPublicSelect,
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async remove(id: number) {
    this.assertValidId(id);
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: userPublicSelect,
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async upsert(data: CreateUserDto) {
    try {
      return await this.prisma.user.upsert({
        where: { email: data.email },
        update: { name: data.name, age: data.age },
        create: {
          ...data,
          passwordHash: await hashPassword(randomUUID()),
        },
        select: userPublicSelect,
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  private assertValidId(id: number) {
    // BadRequestException：HTTP 400，表示客户端请求参数/业务输入不合法。
    // 参数格式不对（NaN、id <= 0）→ 400；格式对但库里没有 → 404。
    // 也可以写成 new HttpException('...', HttpStatus.BAD_REQUEST)，
    // 但更推荐 BadRequestException 这种语义化子类。HttpStatus 是状态码枚举，避免写魔法数字。
    if (Number.isNaN(id) || id <= 0) {
      throw new BadRequestException('用户 id 不合法');
    }
  }
}
