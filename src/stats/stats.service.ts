import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

// @Injectable()：V1 已学过。本类作为 Provider 注册到 StatsModule.providers。
@Injectable()
export class StatsService {
  // Service 也可以依赖另一个 Service，不只是 Controller 依赖 Service。
  // 这里能注入 UsersService，是因为同时满足跨模块 DI 三步：
  // 1. UsersModule.providers 注册了 UsersService
  // 2. UsersModule.exports 暴露了 UsersService
  // 3. StatsModule.imports 了 UsersModule
  constructor(private readonly usersService: UsersService) {}

  getUserCount(): { userCount: number } {
    return { userCount: this.usersService.findAll().length };
  }
}
