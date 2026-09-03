import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

// @Controller('stats')：当前路由前缀是 /stats。
@Controller('stats')
export class StatsController {
  // 保持分层：StatsController → StatsService → UsersService。
  // 这里不要直接注入 UsersService。
  constructor(private readonly statsService: StatsService) {}

  // GET /stats/users：查询当前用户数量。
  @Get('users')
  getUserCount() {
    return this.statsService.getUserCount();
  }

  @Get('users-with-orders')
  getUsersWithOrderCount() {
    return this.statsService.getUsersWithOrderCount();
  }
}
