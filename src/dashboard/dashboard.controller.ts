import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/overview：SCM 总览。CRUD 返回实体；Dashboard 返回统计结果。
  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  // GET /dashboard/orders-by-status：按订单状态分组的数量和金额。
  @Get('orders-by-status')
  getOrdersByStatus() {
    return this.dashboardService.getOrdersByStatus();
  }

  // GET /dashboard/users-with-order-stats：按 userId 分组，再补 User.name。
  @Get('users-with-order-stats')
  getUsersWithOrderStats() {
    return this.dashboardService.getUsersWithOrderStats();
  }
}
