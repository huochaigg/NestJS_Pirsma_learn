import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// @Controller()：声明当前类是 NestJS Controller。
// Controller 主要负责接收 HTTP 请求，并把请求交给对应业务逻辑处理。
// 这里没有传路径，所以它对应应用根路径，例如 GET /。
@Controller()
export class AppController {
  // constructor DI：这里没有手动 new AppService()。
  // 为什么不写 new AppService()？
  // 因为 NestJS 会根据 AppModule.providers 的配置，由依赖注入容器自动创建 AppService 实例，
  // 再把这个实例注入到 AppController。我们只需要在构造函数里声明“我需要 AppService”。
  //
  // 完整链路：
  // AppModule.providers
  //   ↓
  // NestJS DI Container
  //   ↓
  // 创建 AppService
  //   ↓
  // 注入 AppController
  //   ↓
  // Controller 就可以调用 this.appService
  constructor(private readonly appService: AppService) {}

  // @Get()：把 HTTP GET 请求映射到当前方法。
  // 因为 Controller 没有额外路径，所以这里对应 GET /。
  // Controller 只负责接收请求并返回响应，具体返回什么文字由 Service 决定。
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
