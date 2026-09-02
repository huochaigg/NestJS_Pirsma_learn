import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

// @Module()：从模块化角度看，它用来声明一个模块，并配置 imports / controllers / providers / exports。
// AppModule 是根模块，负责组装整个应用，而不是把所有 Controller、Service 都塞进来。
@Module({
  // imports：导入其他 Module，让当前模块组合这些模块提供的功能。
  // AppModule → imports UsersModule / StatsModule
  //   → UsersModule 自己管理 UsersController + UsersService
  //   → StatsModule 自己管理 StatsController + StatsService
  // StatsModule 内部已经 imports UsersModule，AppModule 再 imports 一次也是允许的。
  imports: [UsersModule, StatsModule],

  // controllers：只保留根模块自己的 HTTP 入口。用户和统计路由已下沉到各自 Feature Module。
  controllers: [AppController],

  // providers：只保留根模块自己的 Provider。UsersService 不再注册在这里。
  providers: [AppService],
})
export class AppModule {}
