import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  // AuthModule：拿到 JwtAuthGuard / RolesGuard。
  // UsersModule：GET /admin/users 复用 UsersService.findAll。
  imports: [AuthModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
