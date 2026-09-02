import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  orderNo!: string;

  // @Type(() => Number)：如果客户端把金额写成字符串，先转成 number 再校验。
  @Type(() => Number)
  @IsInt()
  // @IsPositive()：数值必须大于 0。
  @IsPositive()
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId!: number;

  @IsOptional()
  @IsString()
  status?: string;
}
