import 'express';
import { JwtPayload } from '../auth/types/jwt-payload.type';

// 扩展 Express Request：requestId 来自 Middleware；user 来自 JwtAuthGuard。
// 公开接口没有 Guard，所以 user 是可选的。
declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: JwtPayload;
  }
}
