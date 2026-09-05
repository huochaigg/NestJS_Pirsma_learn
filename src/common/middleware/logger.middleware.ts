import { randomUUID } from 'crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service';

// NestMiddleware：NestJS 的 class Middleware 接口。实现它必须提供 use(req, res, next)。
// 这里的日志是 HTTP access log：method、url、statusCode、duration。
// Service Logger 才是业务日志（cache miss、登录失败）。两种都要，内容不同。
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // Logger：NestJS 内置日志工具，可按级别输出，并用 context 标明来自哪个类。
  private readonly logger = new Logger(LoggerMiddleware.name);

  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;
    req.requestId = randomUUID();

    res.on('finish', () => {
      const duration = Date.now() - start;
      // 只保留完成日志，减少噪音。成功/4xx/5xx 都记，方便排查。
      // 不要打印完整 headers：里面可能有 Authorization、Cookie。
      this.logger.log(
        `request completed requestId=${req.requestId} method=${method} path=${originalUrl} status=${res.statusCode} duration=${duration}ms`,
      );
    });

    // 必须在 ALS.run 里调用 next()，后续 await 的 Service 才能读到同一个 requestId。
    this.requestContext.run(req.requestId, () => next());
  }
}
