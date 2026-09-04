import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  // 继续用 V3 的显式模块依赖：imports PrismaModule 才能注入 PrismaService。
  // imports AuthModule：拿到它 exports 的 JwtAuthGuard（及其依赖的 JwtService），
  // 不要在这里再 providers 一份 JwtService。
  imports: [PrismaModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
