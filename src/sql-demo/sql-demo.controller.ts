import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SqlUserKeywordDto } from './dto/sql-user-keyword.dto';
import { SqlDemoService } from './sql-demo.service';

@ApiTags('sql-demo')
@Controller('sql-demo')
export class SqlDemoController {
  constructor(
    private readonly sqlDemoService: SqlDemoService,
    private readonly configService: ConfigService,
  ) {}

  // GET /sql-demo/users 必须放在 users/:id 前面。
  @Get('users')
  @ApiOperation({ summary: '开发 Demo：参数化 LIKE 查询 User 安全字段' })
  searchUsers(@Query() query: SqlUserKeywordDto) {
    return this.sqlDemoService.searchUsers(query.keyword);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '开发 Demo：$queryRaw 按 id 查 User，不返回 passwordHash' })
  findUserById(@Param('id') id: string) {
    return this.sqlDemoService.findUserById(Number(id));
  }

  @Get('orders-details')
  @ApiOperation({ summary: '开发 Demo：Prisma include vs Raw JOIN' })
  getOrderDetails() {
    return this.sqlDemoService.getOrderDetails();
  }

  @Get('orders-by-status')
  @ApiOperation({ summary: '开发 Demo：Prisma groupBy vs Raw GROUP BY' })
  getOrdersByStatus() {
    return this.sqlDemoService.getOrdersByStatus();
  }

  @Get('user-order-stats')
  @ApiOperation({ summary: '开发 Demo：CTE 统计每个用户订单数/金额' })
  getUserOrderStats() {
    return this.sqlDemoService.getUserOrderStats();
  }

  @Get('execute-raw-noop')
  @ApiOperation({ summary: '开发 Demo：$executeRaw no-op，仅 development' })
  demoExecuteRawNoop(@Query('productId') productId?: string) {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return this.sqlDemoService.demoExecuteRawNoop(Number(productId ?? '1'));
  }
}
