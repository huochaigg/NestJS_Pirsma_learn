import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LifecycleDemoDto } from './dto/lifecycle-demo.dto';
import { LifecycleGuard } from './lifecycle.guard';
import { LifecycleService } from './lifecycle.service';

@ApiTags('lifecycle')
@Controller('lifecycle')
@UseGuards(LifecycleGuard)
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Get('demo')
  demo() {
    console.log('[lifecycle] Controller');
    return this.lifecycleService.ping();
  }

  @Post('demo')
  postDemo(@Body() dto: LifecycleDemoDto) {
    console.log('[lifecycle] Controller (POST, Pipe 已通过)');
    return dto;
  }

  @Get('error')
  error() {
    console.log('[lifecycle] Controller (will throw)');
    throw new NotFoundException('lifecycle demo 404');
  }
}
