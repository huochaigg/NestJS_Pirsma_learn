import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderConnectOrCreateDto } from './dto/create-order-connect-or-create.dto';
import { CreateOrderDto } from './dto/create-order.dto';
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

  @Get('simple-details')
  findSimpleDetails() {
    return this.ordersService.findSimpleDetails();
  }

  @Post('connect-or-create')
  createWithConnectOrCreate(@Body() dto: CreateOrderConnectOrCreateDto) {
    return this.ordersService.createWithConnectOrCreate(dto);
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

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(Number(id));
  }
}
