import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

// @ApiHeader：只告诉 Swagger UI 这个接口需要填 Header，不负责真正校验。
// 真正校验由 ApiKeyGuard 执行；删掉 @ApiHeader，Guard 仍然有效，只是 Swagger 不方便填。
@ApiTags('guard-demo')
@Controller('guard-demo')
// @UseGuards()：告诉 NestJS 当前 Controller 下所有路由执行前先经过指定 Guard。
// Controller 级 Guard → 保护整个 Controller 的所有接口。
@UseGuards(ApiKeyGuard)
@ApiHeader({ name: 'x-api-key', description: 'V15 学习用 API Key' })
export class GuardDemoController {
  @Get('protected')
  protectedDemo() {
    console.log('guard-demo protected controller executed');
    return { message: 'Controller 级 ApiKeyGuard 通过' };
  }

  @Get('admin-only')
  @UseGuards(AdminRoleGuard)
  @ApiHeader({ name: 'x-role', description: '演示 403，需要 admin' })
  adminOnly() {
    console.log('guard-demo admin-only controller executed');
    return { message: 'admin 权限通过' };
  }
}
