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

  @Get('with-pending-orders')
  findWithPendingOrders() {
    return this.usersService.findWithPendingOrders();
  }

  @Get('with-every-pending-order')
  findWithEveryPendingOrder() {
    return this.usersService.findWithEveryPendingOrder();
  }

  @Get('without-orders')
  findWithoutOrders() {
    return this.usersService.findWithoutOrders();
  }

  @Get('with-order-count')
  findWithOrderCount() {
    return this.usersService.findWithOrderCount();
  }

  @Post('upsert')
  upsert(@Body() createUserDto: CreateUserDto) {
    return this.usersService.upsert(createUserDto);
  }

  // GET /users/:id/orders 放在 GET /users/:id 前面，阅读更清晰。
  @Get(':id/orders-details')
  findOneWithOrders(@Param('id') id: string) {
    return this.usersService.findOneWithOrders(Number(id));
  }

  @Get(':id/orders')
  findOrders(@Param('id') id: string) {
    return this.usersService.findOrders(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Controller 只负责接参数并调 Service。业务异常由 Service throw，NestJS 自动转成 HTTP 状态码。
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
