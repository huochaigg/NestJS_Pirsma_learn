import {
  Controller,
  Get,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AppService } from './app.service';

// @Controller()：声明当前类是 NestJS Controller。
// Controller 主要负责接收 HTTP 请求，并把请求交给对应业务逻辑处理。
// 这里没有传路径，所以它对应应用根路径，例如 GET /。
@ApiTags('debug')
@Controller()
export class AppController {
  // constructor DI：这里没有手动 new AppService()。
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  // @Get()：把 HTTP GET 请求映射到当前方法。
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('request-info')
  // @Req()：直接拿到底层 HTTP Request。需要 Middleware 挂上的 requestId 时再用。
  getRequestInfo(@Req() req: Request) {
    return { requestId: req.requestId };
  }

  // 仅 development 用来验证 ExceptionFilter：客户端 500 不带 stack，服务端日志有 stack + requestId。
  @Get('debug/error')
  triggerInternalError() {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    throw new Error('test internal error');
  }
}
