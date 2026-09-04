import { Module } from '@nestjs/common';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleGuard } from './lifecycle.guard';
import { LifecycleService } from './lifecycle.service';

@Module({
  controllers: [LifecycleController],
  providers: [LifecycleService, LifecycleGuard],
})
export class LifecycleModule {}
