import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service';

// ExceptionFilter：捕获请求处理过程中抛出的异常，并统一决定最终 HTTP Response 格式。
// Filter 负责“格式”；Service 负责“业务语义”（例如 V8 把 P2002 转成 ConflictException）。
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly requestContext: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const requestId =
      request.requestId ?? this.requestContext.getRequestId();

    let statusCode = 500;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      message = this.extractMessage(exception.getResponse());
    }

    if (statusCode >= 500) {
      // stack：服务端定位调用链用，绝不能返回给客户端。
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `[requestId=${requestId}] path=${request.originalUrl} status=${statusCode}`,
        stack,
      );
    } else {
      // 4xx 是客户端/业务可预期失败（404/401/409），用 warn，不要全部打成 error。
      this.logger.warn(
        `[requestId=${requestId}] path=${request.originalUrl} status=${statusCode}`,
      );
    }

    response.status(statusCode).json({
      code: statusCode,
      message:
        statusCode >= 500 && !(exception instanceof HttpException)
          ? 'Internal server error'
          : message,
      data: null,
      requestId,
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
