import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// 创建 Order 时用 email 定位 User：存在则 connect，不存在则 create。
export class ConnectOrCreateUserDto {
  @ApiProperty({ example: 'bob-coc@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Bob' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 22 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

export class CreateOrderConnectOrCreateDto {
  @ApiProperty({ example: 'ORD-COC-1' })
  @IsString()
  orderNo!: string;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ type: ConnectOrCreateUserDto })
  @ValidateNested()
  @Type(() => ConnectOrCreateUserDto)
  user!: ConnectOrCreateUserDto;
}
