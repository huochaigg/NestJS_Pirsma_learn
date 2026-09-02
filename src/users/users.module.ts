import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// UsersModule：Feature Module，按业务功能组织代码，专门管理用户相关的 Controller、Service。
// 以后项目会继续按 auth、order、product、inventory 等业务拆分 Module。
//
// @Module() 四个常用配置：
// imports：当前模块需要使用哪些其他模块。
// controllers：当前模块有哪些 Controller，负责接收 HTTP 请求。
// providers：当前模块创建和管理哪些 Provider；默认只在本模块内部可见。
// exports：当前模块把哪些 Provider 暴露给其他模块使用。
@Module({
  // imports PrismaModule：UsersService 需要注入 PrismaService。
  // 链路：UsersModule imports PrismaModule → PrismaModule exports PrismaService → UsersService 可注入。
  imports: [PrismaModule],

  // controllers：注册本模块的 HTTP 入口。UsersController 只在这里登记，不再放到 AppModule。
  controllers: [UsersController],

  // providers：注册本模块自己创建的 Provider。
  // UsersService 注册后，UsersController 等本模块内部类可以注入它。
  // 但其他 Module 默认不能直接注入 UsersService——Module 不只是整理文件，还决定 Provider 的可见范围。
  providers: [UsersService],

  // exports：把本模块内部的 Provider 暴露出去，供导入了 UsersModule 的其他模块使用。
  // 必须先在 providers 里注册，再 exports，对方才能注入 UsersService。
  // exports 主要用来共享 Provider，不是用来导出 Controller。
  //
  // 常见错误（不要这么写）：如果漏掉 exports: [UsersService]，
  // StatsService 注入 UsersService 时可能报
  // “Nest can't resolve dependencies of the StatsService”。
  // 遇到这类错误，优先检查：Provider 是否注册、所在 Module 是否 exports、当前 Module 是否 imports 对方。
  exports: [UsersService],
})
export class UsersModule {}
