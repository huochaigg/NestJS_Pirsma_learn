import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// prisma.config.ts：Prisma CLI 的配置文件（migrate / generate 等命令会读它）。
// 当前 Prisma 推荐把数据库连接放在这里，而不是写进 schema.prisma。
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
