import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RegisterDto {
  // 故意不接收 role。注册只能由服务端写成 USER。
  // 客户端多传 { role: "ADMIN" } 会被全局 ValidationPipe 的 forbidNonWhitelisted 直接 400。

  @ApiProperty({ example: 'Tom' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'test1@example.com' })
  @IsEmail()
  email!: string;

  // @MinLength()：限制字符串最小长度。密码至少 8 位，不做更复杂规则。
  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
