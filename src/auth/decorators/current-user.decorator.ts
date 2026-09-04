import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

// createParamDecorator()：用来创建自定义 Controller 参数装饰器。
// 它在 Controller 方法执行前，从当前 ExecutionContext 取出数据，再当作方法参数传入。
// @CurrentUser() 不是新的认证逻辑：真正认证仍是 JwtAuthGuard（verify + 写 request.user）。
// 这里只是把 Guard 已经写好的 request.user 方便地取出来，不要在装饰器里调用 verifyAsync。
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload;
  },
);
