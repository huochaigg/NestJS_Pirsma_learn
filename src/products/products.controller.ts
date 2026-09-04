import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { InboundProductDto } from './dto/inbound-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // 方法级 @UseGuards：只保护当前这一个接口，不影响 GET /products 等其他路由。
  @Get('protected-demo')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', description: 'V15 学习用 API Key' })
  protectedDemo() {
    console.log('products protected-demo controller executed');
    return { message: '方法级 ApiKeyGuard 通过' };
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post(':id/inbound')
  inbound(@Param('id') id: string, @Body() dto: InboundProductDto) {
    return this.productsService.inbound(Number(id), dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }
}
