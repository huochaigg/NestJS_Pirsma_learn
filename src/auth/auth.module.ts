import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { StringValue } from 'ms';

// JwtModule：NestJS 提供的 JWT 功能模块。注册后可通过 DI 注入 JwtService，用来签发和验证 JWT。
@Module({
  imports: [
    PrismaModule,
    // registerAsync()：当 Module 配置依赖其他 Provider（这里是 ConfigService）时，
    // 不能在文件顶部同步读 process.env，要用工厂函数等 Nest DI 准备好再生成配置。
    JwtModule.registerAsync({
      // ConfigModule 已在 AppModule 设为 isGlobal，这里不必再 imports ConfigModule。
      // inject：告诉 NestJS 要把哪些 Provider 当作 useFactory 的参数传进来。
      inject: [ConfigService],
      // useFactory：NestJS 调用这个函数，动态生成 JwtModule 的 secret / 过期时间。
      // ConfigService：通过 NestJS DI 统一读配置，避免业务代码散落 process.env。
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.getOrThrow<string>('JWT_EXPIRES_IN');
        return {
          // getOrThrow()：配置缺失时立刻抛错，而不是返回 undefined 让后面莫名失败。
          // JWT_SECRET 不能写 || 'secret'：缺失必须失败，不能退化成公开弱密钥。
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            // jsonwebtoken 要求 expiresIn 为 number 或 ms.StringValue（例如 1h），不要用 any。
            expiresIn: expiresIn as StringValue,
          },
        };
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
