import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../src/generated/prisma/client';

// 仅开发环境使用：准备 USER / ADMIN / WAREHOUSE 三个可登录账号。
// 不要提供公开 HTTP 接口让普通用户改自己的 role。
async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash('12345678', 10);

  const accounts = [
    {
      name: 'V20 User',
      email: 'v20.user@example.com',
      role: Role.USER,
    },
    {
      name: 'V20 Admin',
      email: 'v20.admin@example.com',
      role: Role.ADMIN,
    },
    {
      name: 'V20 Warehouse',
      email: 'v20.warehouse@example.com',
      role: Role.WAREHOUSE,
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        role: account.role,
        passwordHash,
        name: account.name,
      },
      create: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
      },
    });
  }

  console.log(
    'V20 seed ready: v20.user / v20.admin / v20.warehouse @example.com, password 12345678',
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
