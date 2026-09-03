import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// SearchUserDto：演示 DTO 不只能校验 Body，也能校验 Query。
// GET /users/search?keyword=Tom 会先经过 ValidationPipe，再进入 Controller。
export class SearchUserDto {
  // keyword 允许不传；如果传了，必须是字符串。
  @ApiPropertyOptional({ example: 'Tom' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
