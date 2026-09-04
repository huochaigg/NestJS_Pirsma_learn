import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

// JwtModule：NestJS 提供的 JWT 功能模块。注册后可通过 DI 注入 JwtService，用来签发和验证 JWT。
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        // expiresIn：Token 有效期。1h 后过期，JWT 不是永久凭证。当前不做 RefreshToken。
        expiresIn: '1h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  // 导出 Guard + JwtModule：其他 Module imports AuthModule 后才能注入 Guard，
  // 且 Guard 依赖的 JwtService 仍然来自这里的 JwtModule，不要在业务 Module 再注册一份。
  // 暂不全局启用 JwtAuthGuard / RolesGuard：/auth/login、/auth/register 必须公开。
  // 后面如果要全局 JWT Guard，再用自定义 metadata（例如 @Public()）标记公开接口。
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
