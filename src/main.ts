import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // NestFactory：NestJS 提供的应用工厂类，负责“造出”整个应用实例。
  // NestFactory.create()：根据根模块创建 NestJS Application。
  // 这里必须传入 AppModule，因为 NestJS 要从根模块开始读取 Controller、Provider 并建立依赖注入关系。
  const app = await NestFactory.create(AppModule);

  // app.listen()：启动底层 HTTP 服务器，并开始监听指定端口。
  // 调用之后，浏览器或其他客户端才能访问本应用。
  // V1 固定监听 3000，启动成功后访问 http://localhost:3000
  await app.listen(3000);
}

// main.ts 是整个 NestJS 应用的启动入口。
// 执行流程：main.ts → NestFactory.create(AppModule) → 创建 Application → app.listen() → HTTP 服务开始监听。
bootstrap();
