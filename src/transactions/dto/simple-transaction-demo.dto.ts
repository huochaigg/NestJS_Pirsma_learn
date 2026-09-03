import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

// SimpleTransactionDemoDto：演示 $transaction([]) 数组事务的开关参数。
// 对应 POST /transactions/simple-demo，不是真实业务入库/下单 DTO。
//
// simulateFail 默认 false：连续创建两个不同 sku 的商品，事务成功，两条都写入。
// simulateFail = true：故意让两个 create 使用同一个 sku。
// Product.sku 有唯一约束，第二个 create 失败 → 整个事务回滚，第一条也不会留下。
// 用来亲眼对比「部分成功」和「事务全成/全败」的差别。
export class SimpleTransactionDemoDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  simulateFail?: boolean;
}
