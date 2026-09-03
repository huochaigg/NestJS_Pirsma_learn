import { Injectable } from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { SimpleTransactionDemoDto } from './dto/simple-transaction-demo.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async simpleDemo(dto: SimpleTransactionDemoDto) {
    const stamp = Date.now();
    const skuA = `TX-DEMO-A-${stamp}`;
    const skuB = dto.simulateFail ? skuA : `TX-DEMO-B-${stamp}`;

    try {
      // $transaction([])：数组事务。把多个已经构造好的 Prisma 操作一次性提交。
      // 任意一个失败，整个事务 rollback，前面“看起来已经执行”的操作也不会最终生效。
      // 事务核心是原子性（Atomicity）：要么全部成功，要么全部失败。不是把几个 Promise 随便放一起。
      // 限制：数组里的操作要提前构造好，彼此不能依赖前一步返回的 id / 中间 if 判断。
      // 有前后依赖或业务判断时，改用 interactive transaction：$transaction(async (tx) => { ... })。
      return await this.prisma.$transaction([
        this.prisma.product.create({
          data: { name: 'Tx Demo A', sku: skuA, stock: 1 },
        }),
        this.prisma.product.create({
          data: { name: 'Tx Demo B', sku: skuB, stock: 1 },
        }),
      ]);
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }
}
