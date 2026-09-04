import { randomUUID } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// NestMiddleware：NestJS 的 class Middleware 接口。实现它必须提供 use(req, res, next)。
// Middleware 在请求进入路由处理之前执行，适合日志、requestId、读 Header 等通用前置逻辑。
// 不要在这里写 User/Order 业务，也不要做登录校验（那是 Guard）。
// 当前项目用 Express adapter；如果换成 Fastify，req/res 类型会不同。V14 不切换。
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // req：当前 HTTP Request。res：当前 HTTP Response。
    // next：把控制权交给后面的处理链。不是“结束 Middleware”。
    // 忘记 next() 且自己也不结束 response，请求会一直挂住。
    // 也可以在这里直接 res.status(403).send(...) 且不 next()，请求就不会进 Controller；
    // V14 只说明这个能力，不真的拦截正常接口。
    const start = Date.now();
    const { method, originalUrl } = req;

    // Middleware 可以给 request 增加上下文，后续 Controller 可通过 @Req() 读取。
    req.requestId = randomUUID();

    const clientName =
      req.headers['x-client-name'] ?? req.headers['user-agent'] ?? '-';

    console.log(`--> ${method} ${originalUrl}`);
    console.log(`    requestId=${req.requestId} client=${clientName}`);
    if (originalUrl.startsWith('/lifecycle')) {
      console.log(`[lifecycle] Middleware before requestId=${req.requestId}`);
    }

    // finish：HTTP Response 已经发送完成。此时才有最终 statusCode，才能算整段耗时。
    // 不能在 next() 后面立刻 Date.now()：next() 只是把请求交给后面，
    // Controller/Service/Prisma 往往是异步的，当时请求还没真正结束。
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`<-- ${method} ${originalUrl} ${res.statusCode} ${ms}ms`);
      if (originalUrl.startsWith('/lifecycle')) {
        console.log(
          `[lifecycle] Middleware finish requestId=${req.requestId} ${res.statusCode}`,
        );
      }
    });

    next();
  }
}
