import { Prisma } from '../generated/prisma/client';

// userPublicSelect：统一控制哪些 User 字段允许返回给客户端。
// passwordHash 即使不是明文，也属于敏感认证数据，HTTP Response 一律不返回。
// role 可以返回：前端可据此隐藏菜单，但真正安全边界仍是服务端 RolesGuard。
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  age: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
