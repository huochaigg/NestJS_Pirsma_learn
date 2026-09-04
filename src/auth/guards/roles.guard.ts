import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../types/role';

// RolesGuard = Authorization：在已经知道“你是谁”之后，判断你有没有资格访问这个接口。
// 它不解析 JWT。request.user 必须由前面的 JwtAuthGuard（Authentication）写入。
// 顺序必须是：JwtAuthGuard → RolesGuard。反过来时 request.user 还不存在。
@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector：NestJS 提供的 metadata 读取工具。
  // @Roles() 通过 SetMetadata 写在 Controller/Handler 上的数据，要靠 Reflector 读出来。
  // Guard 只“执行规则”，规则内容（需要哪些角色）来自装饰器 metadata，而不是写死在 Guard 里。
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getHandler()：当前真正要执行的 Controller 方法，例如 AdminController.dashboard。
    // getClass()：当前 Controller 类，例如 AdminController。
    // 两级都要读：权限可以标在整个 Controller 上，也可以标在某一个方法上。
    //
    // getAllAndOverride()：按数组顺序读取 metadata，后面的会被前面已有的覆盖。
    // [handler, class] → 方法上如果写了 @Roles，就覆盖 Controller 级 @Roles。
    // 不要只读 Handler，否则 class 级 @Roles(Role.ADMIN) 会失效。
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有配置 @Roles：这个接口没有角色门槛，RolesGuard 直接放行。
    // 认证接口 ≠ 都需要角色限制。例如 GET /auth/profile、GET /orders/my 只需要登录。
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // 只信任 JwtAuthGuard verify 成功后写入的 payload.role。
    // 不要读 Header x-role、Query、Body.role：那些是客户端自报，可以伪造。
    const user = request.user;

    if (!user) {
      // 正常架构下 JwtAuthGuard 会先挡住无 Token 请求。这里是安全兜底。
      throw new UnauthorizedException('未登录或 Token 无效');
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // 身份有效但角色不够 → 403，不是 401。
    // 401 = 没有有效身份（没登录 / Token 无效）。
    // 403 = 知道你是谁，但你不能进这个房间。
    throw new ForbiddenException('权限不足');
  }
}
