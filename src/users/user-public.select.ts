import { Prisma } from '../generated/prisma/client';

// userPublicSelect：统一控制哪些 User 字段允许返回给客户端。
// passwordHash 即使不是明文，也属于敏感认证数据，HTTP Response 一律不返回。
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  age: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
