import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// QueryUserDto：接收 GET /users 的 Query 参数。
// URL 里的数字默认是字符串，例如 page=2 实际是 "2"。
// 必须靠 @Type + ValidationPipe.transform 转成 number，再做 @IsInt 校验。
export class QueryUserDto {
  @ApiPropertyOptional({ example: 'Tom' })
  @IsOptional()
  @IsString()
  keyword?: string;

  // @Type(() => Number)：告诉 class-transformer 把该字段从 URL 字符串转成 number。
  // Query 参数本质来自 URL，默认是字符串；不转的话 @IsInt() 会把 "25" 判失败。
  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  // @Min(1)：页码至少从 1 开始。
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // @Max(100)：限制每页条数上限，避免一次查出过多数据。
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  // @IsIn()：值必须是数组里的某一个。sortOrder 只允许 asc 或 desc。
  @ApiPropertyOptional({ example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ example: 'T' })
  @IsOptional()
  @IsString()
  namePrefix?: string;

  // ids=1,2,3 先当字符串接收，Service 里再拆成 number[]。
  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  ids?: string;

  @ApiPropertyOptional({ example: 'skip@example.com' })
  @IsOptional()
  @IsString()
  excludeEmail?: string;
}
