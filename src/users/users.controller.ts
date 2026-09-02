import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';

// @Controller('users')：给当前 Controller 加上统一前缀 /users。
// 下面每个路由方法写的路径，都会拼在 /users 后面。
// 例如 @Get() → GET /users，@Get(':id') → GET /users/:id。
@Controller('users')
export class UsersController {
  // constructor DI：同模块依赖。UsersService 在 UsersModule.providers 里，这里可以直接注入。
  constructor(private readonly usersService: UsersService) {}

  // 路由声明顺序：先写固定路径（search、request-info），再写动态参数路径（:id）。
  // 固定路径优先，阅读更清晰，也避免把 /users/search 误当成 /users/:id。

  // @Get()：把 HTTP GET 映射到当前方法，语义是“查询资源”。
  // Controller 前缀是 /users，这里不再写额外路径，所以最终是 GET /users。
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // @Get('search')：固定路径，最终对应 GET /users/search。
  // @Query()：从 URL 问号后面的 Query 参数取值，不从路径段取值。
  // 例如 GET /users/search?keyword=Tom，@Query('keyword') 得到 "Tom"。
  // 对比：/users/10 里的 10 是 Path Param，要用 @Param()；?keyword=Tom 才是 Query。
  @Get('search')
  search(@Query('keyword') keyword: string) {
    return this.usersService.search(keyword);
  }

  // @Get('request-info')：固定路径，最终对应 GET /users/request-info。
  // @Headers()：从 HTTP Request Header 取值，不从 Path / Query / Body 取值。
  // 例如请求头 x-client-name: web，@Headers('x-client-name') 得到 "web"。
  // 这个接口只用来认识 Header，不涉及认证。
  @Get('request-info')
  getRequestInfo(@Headers('x-client-name') clientName: string) {
    return { clientName };
  }

  // @Get(':id')：动态路径，最终对应 GET /users/:id，例如 GET /users/1。
  // @Param()：从 URL 路径参数取值。路由是 /users/:id 时，@Param('id') 取出那段 id。
  // HTTP 路径参数默认是字符串，所以 /users/10 拿到的是 "10"，不是数字 10。
  // V2 先手动 Number(id) 转换；Pipe / ParseIntPipe 后面再学。
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }

  // @Post()：把 HTTP POST 映射到当前方法，语义是“创建资源”。
  // 因为前缀是 /users，所以最终是 POST /users。
  // @Body()：从 HTTP Request Body 取值，通常是 JSON。
  // 例如 Body 为 { "name": "Jack", "age": 26 } 时，@Body() 得到这个对象。
  @Post()
  create(@Body() body: { name: string; age: number }) {
    return this.usersService.create(body);
  }

  // @Patch()：把 HTTP PATCH 映射到当前方法，语义是“部分修改资源”。
  // 最终对应 PATCH /users/:id。可以只改 name，不必提交完整 User。
  // 这里同时用 @Param() 取路径里的 id，用 @Body() 取要改的字段。
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; age?: number },
  ) {
    return this.usersService.update(Number(id), body);
  }

  // @Delete()：把 HTTP DELETE 映射到当前方法，语义是“删除资源”。
  // 最终对应 DELETE /users/:id，例如 DELETE /users/1 表示删除 id = 1 的用户。
  // id 仍然通过 @Param('id') 从路径中取出。
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }
}
