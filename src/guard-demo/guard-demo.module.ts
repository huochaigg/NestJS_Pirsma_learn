import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { GuardDemoController } from './guard-demo.controller';

@Module({
  controllers: [GuardDemoController],
  // Guard 注册为 Provider 后，NestJS 才能通过 DI 实例化 @UseGuards(ApiKeyGuard)。
  providers: [ApiKeyGuard, AdminRoleGuard],
})
export class GuardDemoModule {}
