// JwtPayload：JWT verify 成功后的声明。不要用 any。
// sub 必须和 User.id 类型一致：当前 User.id 是 Int，所以 sub 用 number。
// V19 不做 Role/Permission，payload 里先不放 role。
export type JwtPayload = {
  sub: number;
  email: string; 
  iat?: number; 
  exp?: number;
};
