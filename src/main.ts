import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// dotenv/config：启动时把 .env 里的 DATABASE_URL 加载进 process.env。
// PrismaService 创建 adapter 时会读取它，所以必须在 NestFactory.create 之前加载。

async function bootstrap() {
  // NestFactory：NestJS 提供的应用工厂类，负责“造出”整个应用实例。
  // NestFactory.create()：根据根模块创建 NestJS Application。
  // 这里必须传入 AppModule，因为 NestJS 要从根模块开始读取 Controller、Provider 并建立依赖注入关系。
  const app = await NestFactory.create(AppModule);

  // useGlobalPipes()：给整个应用注册全局 Pipe。
  // Pipe 在 Controller 方法真正拿到参数之前执行。
  // ValidationPipe：根据 DTO 上的 class-validator 装饰器做运行时校验。
  // 校验失败直接 400，不会进入 Controller / Service / Prisma。
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist：删掉 DTO 里没有声明的多余字段。
      // 例如 CreateUserDto 只有 name/email/age，多传 role 会被移除。
      whitelist: true,
      // forbidNonWhitelisted：发现多余字段直接报错，而不是默默删掉。
      // 和 whitelist 搭配后，非法字段会被拒绝，学习时更明显。
      forbidNonWhitelisted: true,
      // transform：按 DTO 做一定程度转换，并把普通对象变成 DTO class 实例。
      // 它不会把所有字符串都自动变成正确 number，转换细节后面再学。
      transform: true,
    }),
  );

  // app.listen()：启动底层 HTTP 服务器，并开始监听指定端口。
  // 调用之后，浏览器或其他客户端才能访问本应用。
  // V1 固定监听 3000，启动成功后访问 http://localhost:3000
  await app.listen(3000);
}

// main.ts 是整个 NestJS 应用的启动入口。
// 执行流程：main.ts → NestFactory.create(AppModule) → 创建 Application → app.listen() → HTTP 服务开始监听。
bootstrap();
