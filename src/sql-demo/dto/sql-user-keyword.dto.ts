import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SqlUserKeywordDto {
  @ApiPropertyOptional({ example: 'Tom' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;
}
