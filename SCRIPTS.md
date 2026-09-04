# 常用命令说明

本项目用 **pnpm**。在仓库根目录执行。

示例：`pnpm start:dev`、`pnpm prisma:seed`。

---

## NestJS 应用

| 命令 | 做什么 | 什么时候用 |
| --- | --- | --- |
| `pnpm start:dev` | 开发模式启动，改代码自动重启 | **日常开发最常用**。默认端口 `4070`，Swagger：`http://localhost:4070/api-docs` |
| `pnpm start` | 普通启动一次，不监听文件变化 | 偶尔快速跑一下；平时更推荐 `start:dev` |
| `pnpm start:debug` | 带调试器的 watch 模式 | 需要断点调试 Nest 时 |
| `pnpm build` | 编译到 `dist/` | 打包 / 上线前检查能否编译通过 |
| `pnpm start:prod` | 跑编译后的 `dist/main` | 本地模拟生产启动；需先 `pnpm build` |

---

## Prisma

| 命令 | 做什么 | 什么时候用 |
| --- | --- | --- |
| `pnpm prisma:generate` | 根据 `schema.prisma` 生成 Client（`src/generated/prisma`） | 改了 schema、或刚 clone 项目、或生成代码缺失时报类型/导入错误时。**只生成代码，不改数据库表结构** |
| `pnpm prisma:migrate` | 根据 schema 变更生成 migration，并应用到本地数据库 | **改了 model / enum / 字段** 之后。会改 MySQL 表结构，并顺带 `generate` |
| `pnpm prisma:studio` | 打开 Prisma Studio（可视化看表数据） | 想直接看/改库里的 User、Order 等，不想写 SQL 时 |
| `pnpm prisma:seed` | 执行种子脚本 `prisma/seed.ts`，往库里写入/更新演示数据 | **需要固定可登录账号做 RBAC / 权限联调时**（见下） |

### `prisma:seed` 具体说明

`package.json` 里：

```json
"prisma:seed": "prisma db seed"
```

`prisma db seed` 会去读 `prisma.config.ts` 里配置的 seed 命令，当前是：

```ts
seed: 'npx --yes tsx prisma/seed.ts'
```

也就是跑 `prisma/seed.ts`。

当前种子会 **upsert** 三个账号（密码都是 `12345678`）：

| 邮箱 | 角色 |
| --- | --- |
| `v20.user@example.com` | USER |
| `v20.admin@example.com` | ADMIN |
| `v20.warehouse@example.com` | WAREHOUSE |

**什么时候跑 seed**

- 刚做完带 `Role` 的 migration，想马上用 ADMIN / WAREHOUSE 测权限
- 本地库空了、或这些演示账号被删了 / 角色乱了
- 想重置这三个账号的密码为 `12345678`

**什么时候不用跑**

- 只改 Nest 业务代码、没动数据库演示数据
- 只改 schema 字段结构 → 先用 `prisma:migrate`，不是 seed
- 正式环境 / 生产库：**不要**随便跑开发用 seed

Seed **不会**替代 migrate：它不负责建表，只往已有表里写数据。表结构仍靠 `prisma:migrate`。

---

## 常见顺序（新机器 / 新库）

1. 配置好 `.env` 里的 `DATABASE_URL`（可参考 `.env.example`）
2. `pnpm install`
3. `pnpm prisma:migrate`（建表 + 生成 Client）
4. `pnpm prisma:seed`（需要演示账号时）
5. `pnpm start:dev`

---

## 和「直接敲 prisma」的关系

`pnpm prisma:xxx` 只是 `package.json` scripts 的短名字，等价于：

| 脚本 | 实际执行 |
| --- | --- |
| `pnpm prisma:generate` | `prisma generate` |
| `pnpm prisma:migrate` | `prisma migrate dev` |
| `pnpm prisma:studio` | `prisma studio` |
| `pnpm prisma:seed` | `prisma db seed` |

用脚本的好处：不用记完整子命令，团队统一入口。
