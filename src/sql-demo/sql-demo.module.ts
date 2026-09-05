import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SqlDemoController } from './sql-demo.controller';
import { SqlDemoService } from './sql-demo.service';

@Module({
  imports: [PrismaModule],
  controllers: [SqlDemoController],
  providers: [SqlDemoService],
})
export class SqlDemoModule {}
