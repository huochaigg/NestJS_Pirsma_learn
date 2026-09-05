import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

// @Injectable()：让 PrismaService 进入 NestJS DI 容器。
@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: ConfigService) {
    // Nest 运行时用 ConfigService 读 DATABASE_URL，不要在业务代码里散落 process.env。
    // Prisma CLI（migrate / generate / studio）启动时 Nest 根本还没起来，
    // 不可能注入 ConfigService，所以 prisma.config.ts 仍然直接读环境变量。两套生命周期不矛盾。
    const adapter = new PrismaMariaDb(
      configService.getOrThrow<string>('DATABASE_URL'),
    );

    // extends PrismaClient：PrismaClient 是 prisma generate 根据 schema 生成的数据库客户端。
    // 里面会自动出现 user 等模型访问 API，例如 this.user.findMany()。
    // PrismaService 只是给 PrismaClient 包一层 NestJS Provider，让业务模块可以注入它。
    super({ adapter });
    // Prisma 可以 log: ['query'] 打印每条 SQL。开发可选，生产默认不要全开：很吵，还可能带敏感参数。V23 不开启。
  }
}
