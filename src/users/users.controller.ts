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
import {
  CreateUserInput,
  UpdateUserInput,
  UsersService,
} from './users.service';

// @Controller('users')：当前路由前缀是 /users。
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 固定路径（search / request-info / upsert）放在动态 :id 前面，阅读更清晰。

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  search(@Query('keyword') keyword: string) {
    return this.usersService.search(keyword);
  }

  @Get('request-info')
  getRequestInfo(@Headers('x-client-name') clientName: string) {
    return { clientName };
  }

  // POST /users/upsert：根据 email 有则更新、无则创建。
  @Post('upsert')
  upsert(@Body() body: CreateUserInput) {
    return this.usersService.upsert(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // schema 中 User.id 是 Int，Prisma 查询要求 number；HTTP 路径参数默认是 string。
    // 当前继续 Number(id)；ParseIntPipe 后面再学。
    return this.usersService.findOne(Number(id));
  }

  @Post()
  create(@Body() body: CreateUserInput) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserInput) {
    return this.usersService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }
}
