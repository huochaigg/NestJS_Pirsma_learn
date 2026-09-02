import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

// CreateUserDto：描述“创建用户”时 HTTP Body 应该长什么样。
// TypeScript interface/type 只在编译期检查，编译成 JS 后不会校验客户端数据。
// DTO 用 class + class-validator，可以在运行时真正检查 HTTP Body。
// 装饰器只是声明规则；必须配合 ValidationPipe 才会执行校验。
export class CreateUserDto {
  // @IsString()：运行时校验该字段必须是字符串。
  // name! / email!：告诉 TypeScript“运行时会赋值”。
  // DTO 实例由 ValidationPipe 根据 HTTP Body 填充，不会走构造函数，
  // 所以不能写构造函数赋值；用 definite assignment assertion（!）消除未初始化报错。
  @IsString()
  name!: string;

  // @IsEmail()：校验字符串是否符合邮箱格式。这是请求格式校验，不是数据库 @unique。
  @IsEmail()
  email!: string;

  // @IsOptional()：字段允许不传；不传则跳过后面的 @IsInt/@Min。
  // @IsInt()：如果传了，值必须是整数。
  // @Min(0)：数值不能小于 0。
  // 当前不做字符串转数字；age: "26" 会校验失败，转换放到后面学。
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
