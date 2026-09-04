import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService, ApiKeyGuard],
})
export class ProductsModule {}
