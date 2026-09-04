// 复用 Prisma 根据 schema enum Role 生成的类型，不要再手写一套 'USER' | 'ADMIN' 字符串。
// 两套 enum 很容易漏改一边，导致 JWT / Guard / 数据库角色对不上。
export { Role } from '../../generated/prisma/client';
