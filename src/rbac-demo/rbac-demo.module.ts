import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProtectedDemoController } from './protected-demo.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProtectedDemoController],
})
export class RbacDemoModule {}
