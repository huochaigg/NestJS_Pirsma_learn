import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

// ExceptionFilter：捕获请求处理过程中抛出的异常，并统一决定最终 HTTP Response 格式。
// Filter 负责“格式”；Service 负责“业务语义”（例如 V8 把 P2002 转成 ConflictException）。
// @UseFilters() 可以对某个 Controller/Route 局部启用；当前用全局注册。
// @Catch()：告诉 NestJS 当前 Filter 要捕获哪些异常。不传参数表示捕获所有异常。
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // ArgumentsHost：类似 ExecutionContext，但用于异常场景。
  // 通过它切换到 HTTP 上下文，拿到当前 request/response。
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    if (request.originalUrl.startsWith('/lifecycle')) {
      console.log(`[lifecycle] ExceptionFilter requestId=${request.requestId}`);
    }

    let statusCode = 500;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      // getStatus()：取出这个 HttpException 对应的 HTTP 状态码，例如 404/409。
      statusCode = exception.getStatus();
      // getResponse()：取出异常内容，可能是 string，也可能是对象
      //（ValidationPipe 的 BadRequestException 常见 { statusCode, message: string[], error }）。
      message = this.extractMessage(exception.getResponse());
    } else {
      // 未知异常不要把 exception.message 直接回给客户端，可能含 SQL/连接串/堆栈。
      // 前端只看到统一 500；服务端必须留下真实日志方便排查。
      console.error(exception);
    }

    response.status(statusCode).json({
      code: statusCode,
      message,
      data: null,
      requestId: request.requestId,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(raw: string | object): string | string[] {
    if (typeof raw === 'string') {
      return raw;
    }
    if (raw && typeof raw === 'object' && 'message' in raw) {
      const value = (raw as { message: unknown }).message;
      if (typeof value === 'string' || Array.isArray(value)) {
        return value;
      }
    }
    return 'Internal server error';
  }
}
