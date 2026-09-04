import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  // exports RedisService：其他 Module imports RedisModule 后才能注入它。继续用 V3 显式依赖，不做成 Global。
  exports: [RedisService],
})
export class RedisModule {}
