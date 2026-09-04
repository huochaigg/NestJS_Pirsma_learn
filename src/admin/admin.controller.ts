import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/types/role';
import { UsersService } from '../users/users.service';

@ApiTags('admin')
@Controller('admin')
// Guard 顺序：先 JwtAuthGuard（Authentication：你是谁），再 RolesGuard（Authorization：你能不能进）。
// Controller 级 @UseGuards：下面方法默认都走这两个 Guard，不必每个方法再写一遍。
@UseGuards(JwtAuthGuard, RolesGuard)
// Controller 级 @Roles：整个 Controller 默认要求 ADMIN。方法级还可以再写，覆盖类级配置。
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  // GET /admin/dashboard：ADMIN only。没有方法级 @Roles，沿用类上的 Role.ADMIN。
  @Get('dashboard')
  dashboard() {
    return { message: 'admin dashboard' };
  }

  // 方法级 @Roles：演示 metadata 也可以标在单个 Route 上。
  // 这里仍然是 ADMIN，与类级一致，避免写出互相矛盾的权限。
  // GET /admin/users：管理员查看用户列表，复用已有 UsersService，不重写。
  @Get('users')
  @Roles(Role.ADMIN)
  findUsers() {
    return this.usersService.findAll({});
  }
}
