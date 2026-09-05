import { LogLevel, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  // bootstrap 时 ConfigService 还不存在，日志级别只能先读 NODE_ENV。
  // production 关掉 debug/verbose，减少噪音；error/warn/log 必须保留。
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const loggerLevels: LogLevel[] =
    nodeEnv === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'];

  const app = await NestFactory.create(AppModule, { logger: loggerLevels });
  const configService = app.get(ConfigService);

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
  // Filter 需要注入 RequestContextService，所以从 DI 取出，不要 new。
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // NODE_ENV：development / test / production。这里只用来决定要不要开 Swagger。
  // Swagger title/version 是文档常量，部署环境之间不变，不必放进 .env。
  const appNodeEnv = configService.get<string>('NODE_ENV', 'development');
  if (appNodeEnv !== 'production') {
    // DocumentBuilder：配置 OpenAPI 文档的基本信息（title / description / version）。
    // build() 生成这份基础配置对象。Bearer 只用于 Swagger Authorize，不负责运行时校验。
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS + Prisma Learning API')
      .setDescription('NestJS + Prisma V1-Vn 学习接口')
      .setVersion('1.0')
      // addBearerAuth()：只告诉 Swagger UI 有 Bearer Token 方案，从而出现 Authorize 按钮。
      // 它本身不验证 JWT；验证由 JwtAuthGuard 完成。
      .addBearerAuth()
      .build();

    // SwaggerModule.createDocument()：根据 Controller、路由、DTO 生成 OpenAPI Document。
    // 链路：Nest Controller/DTO → createDocument() → OpenAPI 描述。
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);

    // SwaggerModule.setup()：把 Swagger UI 挂到指定路径。
    // 打开 http://localhost:4070/api-docs 就能看接口并用 Try it out 发请求。
    // 不用 /api，避免以后业务 API 前缀和文档地址混在一起。
    SwaggerModule.setup('api-docs', app, documentFactory);
  }

  // .env 里的 PORT 可能是字符串。validationSchema 会校验，这里再 Number() 一次，不假设一定自动转换。
  // PORT 可以有默认值 3000；JWT_SECRET / DATABASE_URL 这种关键配置绝不能给弱默认值。
  const port = Number(configService.get('PORT', 3000));
  // app.listen()：启动底层 HTTP 服务器，并开始监听指定端口。
  await app.listen(port);
}

// main.ts 是整个 NestJS 应用的启动入口。
// 执行流程：main.ts → NestFactory.create(AppModule) → ConfigModule 校验环境变量 → 创建 Application → app.listen()。
bootstrap();
