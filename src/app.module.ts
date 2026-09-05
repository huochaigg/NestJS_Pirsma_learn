import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestContextModule } from './common/context/request-context.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GuardDemoModule } from './guard-demo/guard-demo.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
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
  imports: [
    // ConfigModule：NestJS 官方配置管理模块。读取 .env 和系统环境变量，再通过 DI 提供 ConfigService。
    // forRoot()：在根模块初始化配置。业务代码不要再散落 process.env.xxx。
    ConfigModule.forRoot({
      // isGlobal: true → 把 ConfigModule 做成全局模块。
      // 其他 Feature Module 不必反复 imports ConfigModule，也能注入 ConfigService。
      // 这和 V3“少用 Global”不矛盾：配置是整个应用都要用的基础能力，全局化是合理场景。
      isGlobal: true,
      // validationSchema：启动时检查环境变量是否存在、格式是否合法。
      // 配错直接阻止启动（Fail Fast），而不是某个接口运行时才发现 JWT_SECRET 是 undefined。
      validationSchema: envValidationSchema,
    }),
    RequestContextModule,
    UsersModule,
    StatsModule,
    OrdersModule,
    ProductsModule,
    TransactionsModule,
    GuardDemoModule,
    LifecycleModule,
    AuthModule,
    AdminModule,
    RbacDemoModule,
    DashboardModule,
  ],

  // controllers：只保留根模块自己的 HTTP 入口。用户和统计路由已下沉到各自 Feature Module。
  controllers: [AppController],

  // providers：只保留根模块自己的 Provider。UsersService 不再注册在这里。
  providers: [AppService, LoggerMiddleware, HttpExceptionFilter],
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
