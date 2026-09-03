import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

// InboundProductDto：商品「入库」接口的 Body。
// 对应 POST /products/:id/inbound。
// 路径里的 :id 是哪个商品；Body 里只传本次增加多少库存 quantity。
// Service 会在事务里：stock 做 increment，并写一条 type=IN 的 InventoryLog。
export class InboundProductDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}
