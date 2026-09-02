import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
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

  async findAll() {
    // findMany()：查询多条记录。
    // 当前不传 where 等条件，相当于查询全部 User。
    // 返回值是 User[]。分页、排序、复杂 where 放到 V7。
    return this.prisma.user.findMany();
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
