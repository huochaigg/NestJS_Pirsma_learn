import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateUserDto {
  // @ApiProperty：告诉 Swagger 这个字段的结构和示例，只服务接口文档，不负责运行时校验。
  // @IsString：运行时 Validation，和 @ApiProperty 职责完全不同。
  @ApiProperty({ example: 'Tom' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'tom@example.com' })
  @IsEmail()
  email!: string;

  // @ApiPropertyOptional：文档里标记为可选字段。
  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
