import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// PrismaModule：专门提供数据库能力的模块。
@Module({
  // providers：把 PrismaService 注册进 DI 容器。
  providers: [PrismaService],
  // exports：暴露 PrismaService 后，UsersModule 等业务模块才能 imports PrismaModule 并注入它。
  // 当前不要做成 @Global()，继续用显式 Module 依赖学习跨模块 DI。
  exports: [PrismaService],
})
export class PrismaModule {}
