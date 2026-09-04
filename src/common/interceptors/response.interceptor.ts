import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { map, Observable } from 'rxjs';

export interface ApiSuccessResponse<T> {
  code: 0;
  message: 'success';
  data: T | null;
  requestId?: string;
  timestamp: string;
  duration: number;
}

// NestInterceptor：NestJS 拦截器接口，实现后必须提供 intercept()。
// Interceptor 可以包裹 Controller 方法：执行前做准备，执行后加工返回值。
// 成功结果由 Interceptor 包装；异常不走这里的 map()，而是交给 ExceptionFilter。
// @UseInterceptors() 可以对某个 Controller/Route 局部启用；当前用全局注册，不必每个接口再写一遍。
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    // CallHandler：代表后续真正要执行的 Controller 处理流程。
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    if (request.originalUrl.startsWith('/lifecycle')) {
      console.log(`[lifecycle] Interceptor before requestId=${request.requestId}`);
    }

    // next.handle()：不是立刻拿到 Controller 的普通返回值，
    // 而是得到一个 RxJS Observable，表示后续执行结果。
    // Observable：NestJS Interceptor 用它表达 Controller 后续结果；
    // V16 只需会 next.handle().pipe(map(...))，不展开 RxJS 理论。
    // pipe()：组合 Observable 操作。
    // map()：把 Controller 返回的 data 转成统一成功结构。
    return next.handle().pipe(
      map((data) => {
        if (request.originalUrl.startsWith('/lifecycle')) {
          console.log(
            `[lifecycle] Interceptor after requestId=${request.requestId}`,
          );
        }

        // Middleware 先生成 requestId，Interceptor 从同一个 request 继续读取。
        // Interceptor 在 Controller return 之后才 map，所以适合统计路由/Controller 阶段耗时。
        // Middleware 的 res.finish 测的是更完整的 HTTP 请求耗时，两者用途不同。
        // code=0 只表示业务成功；真实 HTTP 状态码仍由 NestJS 决定（GET 200、POST 201）。
        return {
          code: 0 as const,
          message: 'success' as const,
          data: data === undefined ? null : data,
          requestId: request.requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
        };
      }),
    );
  }
}
