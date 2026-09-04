import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// CanActivate：NestJS Guard 的核心接口。实现它必须提供 canActivate()。
// return true → 允许请求继续进入后续 Pipe / Controller。
// return false 或 throw 异常 → 拒绝请求；Guard 是 Controller 门口的门卫。
@Injectable()
// @Injectable()：Guard 作为 Provider，由 NestJS DI 管理，不要手动 new ApiKeyGuard。
export class ApiKeyGuard implements CanActivate {
  // ConfigService：通过 NestJS DI 统一读取配置。ApiKey → ConfigService → LEARNING_API_KEY。
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // ExecutionContext：当前请求执行上下文，可获取 HTTP Request。
    // 不直接依赖某个 Controller 参数，Guard 从 context 读请求信息。
    // switchToHttp()：ExecutionContext 可代表 HTTP/WebSocket/RPC 等协议；
    // 这里表示按 HTTP 上下文读取 request/response。
    const request = context.switchToHttp().getRequest<Request>();

    const apiKeyHeader = request.headers['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    // getOrThrow()：启动校验已要求 LEARNING_API_KEY 存在；这里再按 key 读取，类型期望是 string。
    const expectedKey = this.configService.getOrThrow<string>('LEARNING_API_KEY');

    // 同一个 Request 在 Middleware 里生成的 requestId，Guard 也能读到。
    console.log(`[${request.requestId}] guard checking x-api-key...`);

    if (!apiKey || apiKey !== expectedKey) {
      // UnauthorizedException：HTTP 401，表示没有提供有效身份凭证。
      // 优先 throw 语义化异常，而不是只 return false，这样错误信息更明确。
      throw new UnauthorizedException('无效的 API Key');
    }

    return true;
  }
}
