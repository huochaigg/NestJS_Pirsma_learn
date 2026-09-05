import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './types/jwt-payload.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // @HttpCode()：显式指定成功时的 HTTP 状态码。登录不是创建资源，用 200 比 POST 默认 201 更合适。
  // HttpStatus.OK = 200。
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // @ApiBearerAuth：只告诉 Swagger 这个接口用 Bearer，Authorize 里的 Token 会带到 Header。
  // 真正校验仍是 JwtAuthGuard；去掉装饰器不会让服务器失去安全性。
  // Authentication（你是谁）由 JwtAuthGuard 完成；Authorization（你能不能进这个接口）由 RolesGuard 完成。
  // GET /auth/profile 只需要登录，不需要 @Roles：认证接口 ≠ 都要角色门槛。
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  profile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
