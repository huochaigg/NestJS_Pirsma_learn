import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// CreateUserWithOrdersDto：一次请求里同时带上 User 和要 nested create 的 Orders。
export class CreateNestedOrderDto {
  @ApiProperty({ example: 'A001' })
  @IsString()
  orderNo!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount!: number;
}

export class CreateUserWithOrdersDto {
  @ApiProperty({ example: 'Alice' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'alice-nested@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiProperty({ type: [CreateNestedOrderDto] })
  @IsArray()
  // ValidateNested：对数组里的每一项再按 CreateNestedOrderDto 做校验。
  @ValidateNested({ each: true })
  @Type(() => CreateNestedOrderDto)
  orders!: CreateNestedOrderDto[];
}
