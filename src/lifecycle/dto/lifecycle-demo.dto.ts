import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LifecycleDemoDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  name!: string;
}
