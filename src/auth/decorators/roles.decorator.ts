import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role';

// ROLES_KEY：metadata 的 key。装饰器写入、RolesGuard 读取时必须用同一个字符串。
export const ROLES_KEY = 'roles';

// SetMetadata()：给 Controller 类或某个 Route handler 附加自定义 metadata。
// 这里 key 是 'roles'，value 是允许访问该接口的角色数组，例如 [Role.ADMIN]。
// 它只是“贴标签”，声明这个接口需要什么角色；真正拦截请求的是 RolesGuard。
// @Roles() 本身不会阻止任何请求。
//
// ...roles：RBAC 语义是“这些角色任意一个即可”，不是必须同时具备全部角色。
// @Roles(Role.ADMIN) → 只要 ADMIN。
// @Roles(Role.ADMIN, Role.WAREHOUSE) → ADMIN 或 WAREHOUSE 都能进。
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
