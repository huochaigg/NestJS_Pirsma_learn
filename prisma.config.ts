import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// prisma.config.ts：Prisma CLI 的配置文件（migrate / generate / studio 会读它）。
// 执行 prisma migrate 时 NestJS 根本没有启动，也就没有 ConfigService。
// 所以 DATABASE_URL 必须存在于 Prisma CLI 能读到的环境里（.env + env()）。
// Nest 运行时用 ConfigService；Prisma CLI 直接读环境变量。两者生命周期不同，不要互相注入。
export default defineConfig({
  // schema：Prisma schema 文件位置。
  schema: 'prisma/schema.prisma',
  // migrations.path：migration SQL 的保存目录。这些文件是数据库结构的版本历史，不会执行完就消失。
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx --yes tsx prisma/seed.ts',
  },
  // datasource.url：真正的数据库连接地址。
  // env("DATABASE_URL") 从 .env 读取，避免把用户名密码写进代码。
  datasource: {
    url: env('DATABASE_URL'),
  },
});
