import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// UpdateUserDto：PATCH 部分更新用的 DTO。
// PartialType(CreateUserDto)：基于 CreateUserDto 生成新 DTO，
// 把原字段全部变成可选，同时保留原来的 validation metadata。
// 所以可以只传 name；但如果传了 email，仍然必须满足 @IsEmail()。
export class UpdateUserDto extends PartialType(CreateUserDto) {}
