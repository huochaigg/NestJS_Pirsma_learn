import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateMyOrderDto } from './dto/create-my-order.dto';
import { CreateOrderConnectOrCreateDto } from './dto/create-order-connect-or-create.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateTransactionOrderDto } from './dto/create-transaction-order.dto';
import { CursorOrderDto } from './dto/cursor-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get('cursor')
  findCursor(@Query() query: CursorOrderDto) {
    return this.ordersService.findCursor(query);
  }

  @Get('simple-details')
  findSimpleDetails() {
    return this.ordersService.findSimpleDetails();
  }

  // GET /orders/my 必须放在 GET /orders/:id 之前，否则 my 会被当成 id。
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findMyOrders(user.sub);
  }

  @Post('connect-or-create')
  createWithConnectOrCreate(@Body() dto: CreateOrderConnectOrCreateDto) {
    return this.ordersService.createWithConnectOrCreate(dto);
  }

  @Post('transaction-create')
  createWithTransaction(@Body() dto: CreateTransactionOrderDto) {
    return this.ordersService.createWithTransaction(dto);
  }

  // userId 来自 JWT payload.sub，CreateMyOrderDto 没有 userId，客户端无法伪造别人的身份。
  @Post('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMyOrderDto,
  ) {
    return this.ordersService.createMy(user.sub, dto);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.ordersService.findByUserId(Number(userId));
  }

  @Get(':id/details')
  findOneWithUser(@Param('id') id: string) {
    return this.ordersService.findOneWithUser(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(Number(id));
  }

  // 仍允许 Body 带 userId：这是学习/后台创建订单。正式“我的订单”请走 POST /orders/my。
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(Number(id));
  }
}
