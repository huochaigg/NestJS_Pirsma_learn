import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

// StatsModule：统计功能的 Feature Module，演示如何跨模块使用 UsersService。
@Module({
  // imports: [UsersModule]：因为 StatsService 需要使用 UsersService，
  // 而 UsersService 属于 UsersModule，所以这里必须导入 UsersModule。
  // 同时 UsersModule 必须 exports UsersService，少一步都注入失败。
  // 关系：UsersModule.providers + UsersModule.exports → StatsModule.imports → StatsService 可注入 UsersService。
  imports: [UsersModule],

  // controllers：本模块的 HTTP 入口，对应 /stats。
  controllers: [StatsController],

  // providers：本模块自己创建 StatsService，供 StatsController 注入。
  // 当前没有其他 Module 需要 StatsService，所以不 exports。
  // Provider 是否 exports，取决于要不要给其他 Module 用；仅内部使用就不用导出。
  providers: [StatsService],
})
export class StatsModule {}
