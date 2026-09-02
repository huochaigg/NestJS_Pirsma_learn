import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

// @Module()：NestJS 的模块装饰器。
// NestJS 使用 Module 来组织 Controller、Service 等功能。
// AppModule 是当前项目的根模块，NestFactory.create() 会从这里开始组装整个应用。
@Module({
  // controllers：注册当前模块管理的 Controller，负责接收 HTTP 请求。
  controllers: [
    AppController,
    // UsersController 放到 controllers：它负责接收 /users 相关的 HTTP 请求。
    UsersController,
  ],

  // providers：注册可以被 NestJS DI 容器管理和注入的 Provider/Service。
  providers: [
    AppService,
    // UsersService 放到 providers：交给 DI 容器创建实例，再注入 UsersController。
    // 链路：AppModule → 注册 UsersService → 创建实例 → 注入 UsersController。
    UsersService,
  ],
})
export class AppModule {}
