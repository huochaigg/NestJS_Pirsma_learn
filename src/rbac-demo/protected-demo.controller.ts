import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/types/role';

// ProtectedDemoController：只验证多角色权限，不是完整仓库业务。
@ApiTags('warehouse')
@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProtectedDemoController {
  // 方法级 @Roles：ADMIN 或 WAREHOUSE 任一角色即可。普通 USER → 403。
  @Post('inbound-demo')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  inboundDemo() {
    return { message: 'warehouse inbound demo' };
  }
}
