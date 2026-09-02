import {
  BadRequestException,
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
    if (Number.isNaN(id)) {
      throw new NotFoundException('用户不存在');
    }
    // findUnique()：根据“唯一字段”查询最多一条记录。
    // where 里的字段必须是 @id、@unique 或其他唯一约束字段。
    // 这里 id 是 @id，所以可以用 findUnique。不能拿 name 这种非唯一字段来 findUnique。
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      // 查不到时 Prisma 返回 null。这里用 NotFoundException 返回 404。
      // 完整全局异常处理放到 V8。
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByEmail(email: string) {
    // email 在 schema 里有 @unique，和 id 一样属于唯一字段，所以也可以 findUnique。
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
      // create()：向对应数据表插入一条记录。
      // data：要写入数据库的字段。
      // 成功后返回创建完成的 User 对象。
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  async update(id: number, data: UpdateUserDto) {
    if (Number.isNaN(id)) {
      throw new NotFoundException('用户不存在');
    }
    try {
      // update()：修改一条已经存在的记录。
      // where：定位要更新的那一条（必须能唯一定位，这里用 id）。
      // data：需要修改的字段。PATCH 可以只传部分字段。
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.throwIfNotFound(error);
      throw error;
    }
  }

  async remove(id: number) {
    if (Number.isNaN(id)) {
      throw new NotFoundException('用户不存在');
    }
    try {
      // delete()：删除一条唯一确定的记录。
      // where：定位要删除的目标。
      // 成功后默认返回被删除的 User。当前不用 deleteMany()。
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      this.throwIfNotFound(error);
      throw error;
    }
  }

  async upsert(data: CreateUserDto) {
    try {
      // upsert() = update + insert：有则更新、无则创建。
      // where：用唯一字段判断记录是否存在，这里用 email。
      // update：记录已存在时要改哪些字段。
      // create：记录不存在时按这些字段新建。
      return await this.prisma.user.upsert({
        where: { email: data.email },
        update: { name: data.name, age: data.age },
        create: data,
      });
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  private throwIfUniqueConflict(error: unknown) {
    // @unique 是真正的 MySQL 约束，不是 TypeScript 类型限制。
    // 重复 email 时数据库会拒绝写入。完整错误码映射到 409 放到 V8。
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('email 已存在');
    }
  }

  private throwIfNotFound(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('用户不存在');
    }
  }
}
