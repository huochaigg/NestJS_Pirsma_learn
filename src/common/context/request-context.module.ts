import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [RequestContextService],
  // requestId 是每个请求都可能用到的基础能力，做成全局模块，避免每个 Feature Module 都 imports。
  exports: [RequestContextService],
})
export class RequestContextModule {}
