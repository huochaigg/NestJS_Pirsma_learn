import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// UpdateUserDto：PATCH 部分更新用的 DTO。
// PartialType(CreateUserDto)：基于 CreateUserDto 生成新 DTO，
// 把原字段全部变成可选，同时保留原来的 validation metadata。
// 所以可以只传 name；但如果传了 email，仍然必须满足 @IsEmail()。
// 这里从 @nestjs/swagger 引入 PartialType，Swagger 才能把可选字段显示到 PATCH Body。
export class UpdateUserDto extends PartialType(CreateUserDto) {}
