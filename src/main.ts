import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// @nestjs/swagger：NestJS 官方 OpenAPI / Swagger 集成包。
// OpenAPI：描述 HTTP API 的规范（路径、参数、Body）。
// Swagger UI：根据 OpenAPI Document 生成浏览器调试页面。
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

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

  // useGlobalInterceptors()：注册全局 Interceptor，所有 Controller 成功响应都经过它包装。
  app.useGlobalInterceptors(new ResponseInterceptor());

  // useGlobalFilters()：注册全局 ExceptionFilter，所有请求抛出的异常都统一走这里格式化。
  app.useGlobalFilters(new HttpExceptionFilter());

  // DocumentBuilder：配置 OpenAPI 文档的基本信息（title / description / version）。
  // build() 生成这份基础配置对象。当前不配 JWT、license、多 Server。
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS + Prisma Learning API')
    .setDescription('NestJS + Prisma V1-Vn 学习接口')
    .setVersion('1.0')
    .build();

  // SwaggerModule.createDocument()：根据 Controller、路由、DTO 生成 OpenAPI Document。
  // 链路：Nest Controller/DTO → createDocument() → OpenAPI 描述。
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  // SwaggerModule.setup()：把 Swagger UI 挂到指定路径。
  // 打开 http://localhost:4070/api-docs 就能看接口并用 Try it out 发请求。
  // 不用 /api，避免以后业务 API 前缀和文档地址混在一起。
  SwaggerModule.setup('api-docs', app, documentFactory);

  // app.listen()：启动底层 HTTP 服务器，并开始监听指定端口。
  // 调用之后，浏览器或其他客户端才能访问本应用。
  // V1 固定监听 4070，启动成功后访问 http://localhost:4070
  await app.listen(4070);
}

// main.ts 是整个 NestJS 应用的启动入口。
// 执行流程：main.ts → NestFactory.create(AppModule) → 创建 Application → app.listen() → HTTP 服务开始监听。
bootstrap();
