import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    // skip：跳过前多少条。take：最多取多少条。
    // 例如 page=3&pageSize=10 → skip=20，take=10，也就是第 21 到 30 条。
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // findMany 和 count 互不依赖，用 Promise.all 并行等待，减少总耗时。
    // list 和 total 必须用同一个 where，否则分页数字会对不上。
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
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
    });
    if (!user) {
      // throw 后当前方法立刻停止。
      // NestJS 会捕获这个异常并转成 HTTP Response，Controller 不用 try/catch。
      // NotFoundException：HTTP 404，表示请求的资源不存在。
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    return user;
  }

  async findByEmail(email: string) {
    // 这是“检查用户是否存在”的辅助方法，找不到就返回 null，不抛 404。
    // 是否抛异常取决于业务语义：findOne 必须找到用户，所以抛 404。
    return this.prisma.user.findUnique({
      where: { email },
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
    });
  }

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      this.handlePrismaError(error);
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
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    this.assertValidId(id);
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async upsert(data: CreateUserDto) {
    try {
      return await this.prisma.user.upsert({
        where: { email: data.email },
        update: { name: data.name, age: data.age },
        create: data,
      });
    } catch (error) {
      this.handlePrismaError(error);
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

  private handlePrismaError(error: unknown): never {
    // PrismaClientKnownRequestError：Prisma 已识别的数据库请求错误，带有稳定的 error.code。
    // 用 unknown + instanceof 收窄类型，不要用 any 把所有错误都当业务错误。
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002：唯一约束冲突。User.email 有 @unique 时，create/update/upsert 都可能触发。
      // 转换成 ConflictException：HTTP 409，请求格式正确，但和当前资源状态冲突。
      if (error.code === 'P2002') {
        throw new ConflictException('邮箱已经存在');
      }
      // P2025：操作依赖的记录不存在，例如 update/delete 找不到目标。
      if (error.code === 'P2025') {
        throw new NotFoundException('用户不存在');
      }
    }
    // 未知错误（断库、代码 bug、配置错误）继续 throw，由 NestJS 按 500 处理。
    // 不要把所有数据库错误都包装成 400，那会掩盖真正的服务器问题。
    throw error;
  }
}
