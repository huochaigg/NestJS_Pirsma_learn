import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

// 极小 Forbidden 演示：不是完整 RoleGuard，V20 再系统学 RBAC。
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const roleHeader = request.headers['x-role'];
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;

    console.log(`[${request.requestId}] admin role guard checking...`);

    if (role !== 'admin') {
      // ForbiddenException：HTTP 403，表示身份可能已确认，但没有权限执行此操作。
      // 401 = 没有有效凭证；403 = 知道你是谁，但你不能做这个操作。
      throw new ForbiddenException('需要 admin 角色');
    }

    return true;
  }
}
