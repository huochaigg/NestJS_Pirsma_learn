import { Injectable } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

// @Injectable()：让 PrismaService 进入 NestJS DI 容器。
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    // PrismaMariaDb adapter：当前 Prisma 连接 MySQL 必须通过 Driver Adapter。
    // Adapter 负责把 PrismaClient 的查询交给 mariadb 驱动去真正访问 MySQL。
    // 连接信息仍然来自 DATABASE_URL，不要在代码里写死账号密码。
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);

    // extends PrismaClient：PrismaClient 是 prisma generate 根据 schema 生成的数据库客户端。
    // 里面会自动出现 user 等模型访问 API，例如 this.user.findMany()。
    // PrismaService 只是给 PrismaClient 包一层 NestJS Provider，让业务模块可以注入它。
    super({ adapter });
  }
}
