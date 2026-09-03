import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SimpleTransactionDemoDto } from './dto/simple-transaction-demo.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('simple-demo')
  simpleDemo(@Body() dto: SimpleTransactionDemoDto) {
    return this.transactionsService.simpleDemo(dto);
  }
}
