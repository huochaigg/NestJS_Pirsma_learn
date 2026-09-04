import { Role } from './role';

// JwtPayload：JWT verify 成功后的声明。不要用 any。
// sub 必须和 User.id 类型一致：当前 User.id 是 Int，所以 sub 用 number。
// role：登录签发时写入的角色快照。RolesGuard 读这个字段判断权限，当前请求不再查数据库。
// 限制：数据库里改了 User.role 后，旧 Token 过期前 payload.role 不会自动变。V20 先接受。
export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
};
