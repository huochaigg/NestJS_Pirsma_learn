import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GuardDemoModule } from './guard-demo/guard-demo.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { RbacDemoModule } from './rbac-demo/rbac-demo.module';
import { ProductsModule } from './products/products.module';
import { StatsModule } from './stats/stats.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

// @Module()：从模块化角度看，它用来声明一个模块，并配置 imports / controllers / providers / exports。
// AppModule 是根模块，负责组装整个应用，而不是把所有 Controller、Service 都塞进来。
@Module({
  // imports：导入其他 Module，让当前模块组合这些模块提供的功能。
  // AppModule → imports UsersModule / StatsModule
  //   → UsersModule 自己管理 UsersController + UsersService
  //   → StatsModule 自己管理 StatsController + StatsService
  // StatsModule 内部已经 imports UsersModule，AppModule 再 imports 一次也是允许的。
  imports: [UsersModule, StatsModule, OrdersModule, ProductsModule, TransactionsModule, GuardDemoModule, LifecycleModule, AuthModule, AdminModule, RbacDemoModule],

  // controllers：只保留根模块自己的 HTTP 入口。用户和统计路由已下沉到各自 Feature Module。
  controllers: [AppController],

  // providers：只保留根模块自己的 Provider。UsersService 不再注册在这里。
  providers: [AppService],
})
export class AppModule implements NestModule {
  // NestModule：需要配置 Middleware 的 Module 要实现这个接口，并提供 configure()。
  // class Middleware 创建出来还不够，必须通过 MiddlewareConsumer 注册到路由，否则不会执行。
  configure(consumer: MiddlewareConsumer) {
    // MiddlewareConsumer：用来把 Middleware 绑到指定路由。
    consumer
      // apply()：指定要应用哪些 Middleware。
      .apply(LoggerMiddleware)
      // exclude()：排除不希望应用 Middleware 的路由，避免 Swagger 静态资源刷屏。
      .exclude(
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/{*path}', method: RequestMethod.ALL },
      )
      // forRoutes()：指定 Middleware 对哪些路由生效。
      // NestJS 11 + Express 5 要用命名通配符 {*path}，不要再用旧写法 forRoutes('*')。
      .forRoutes('{*path}');
  }
}
