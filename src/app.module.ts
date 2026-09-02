import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// @Module()：NestJS 的模块装饰器。
// NestJS 使用 Module 来组织 Controller、Service 等功能。
// AppModule 是当前项目的根模块，NestFactory.create() 会从这里开始组装整个应用。
@Module({
  // controllers：注册当前模块管理的 Controller。
  // 只有注册进来的 Controller，才能接收并处理 HTTP 请求。
  controllers: [AppController],

  // providers：注册可以被 NestJS DI 容器管理和注入的 Provider/Service。
  // 注册后，NestJS 会创建对应实例，并在 Controller 等需要的地方自动注入。
  providers: [AppService],
})
export class AppModule {}
