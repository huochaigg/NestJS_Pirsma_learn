import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

// JwtAuthGuard = Authentication：验证 JWT，确认“你是谁”，并把 payload 写入 request.user。
// RolesGuard = Authorization：看过身份证以后，检查你能不能进这个房间。
// 和 V15 ApiKeyGuard 不同：ApiKey 只是 Header 值比较 Demo；这里验证的是用户 login 得到的 JWT。
// CanActivate / ExecutionContext 已在 V15 学过：true 放行，throw 拒绝。
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Guard 也是 NestJS Provider，可以 DI 注入 JwtService，不要自己 new，也不要再硬编码 secret。
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    // 缺 Token / 不是 Bearer → 401，不是 400。这是认证失败，不是参数格式错误。
    if (!token) {
      throw new UnauthorizedException('未登录或 Token 无效');
    }

    try {
      // 每个受保护请求先验证签名和有效期；失败则进不了 Controller。
      // secret 来自 JwtModule.registerAsync + ConfigService，verifyAsync 不必再自己传一遍。
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // payload.sub = 登录时写入的 User.id。从这一刻服务器知道“当前请求代表哪个用户”。
      // payload.role 同样来自签名后的 JWT，不是 Header x-role / Body.role。
      // 手动改 payload 却不重新签名 → verifyAsync 失败 → 401，轮不到 RolesGuard 把你当 ADMIN。
      // Guard 不只判断 true/false，还可以把认证结果放到 Request 上，给后面的 Controller / RolesGuard 用。
      // 只放 JWT 里已验证的最小 payload（sub/email/role/iat/exp），不要放完整 User 或 passwordHash。
      request.user = payload;
      return true;
    } catch (error) {
      // 篡改、过期、签名错误都统一 401，不要把 JWT 库原始错误回给客户端。
      console.error(error);
      throw new UnauthorizedException('未登录或 Token 无效');
    }
  }

  private extractTokenFromHeader(request: Request) {
    // Authorization 标准格式：Bearer eyJ...
    // Bearer 是认证 scheme（告诉服务器“后面是令牌”）；空格后的字符串才是真正的 accessToken。
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
