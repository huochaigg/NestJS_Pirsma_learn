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
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// @Controller('users')：当前路由前缀是 /users。
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 固定路径（simple / search / request-info / upsert）放在动态 :id 前面。

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('simple')
  findSimple() {
    return this.usersService.findSimple();
  }

  @Get('search')
  search(@Query() query: SearchUserDto) {
    return this.usersService.search(query.keyword);
  }

  @Get('request-info')
  getRequestInfo(@Headers('x-client-name') clientName: string) {
    return { clientName };
  }

  @Post('upsert')
  upsert(@Body() createUserDto: CreateUserDto) {
    return this.usersService.upsert(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Path Param 暂不使用 DTO / ParseIntPipe，继续 Number(id)。
    return this.usersService.findOne(Number(id));
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // 不再手写 if 判断 name/email。格式校验由 DTO + ValidationPipe 完成。
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(Number(id), updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }
}
