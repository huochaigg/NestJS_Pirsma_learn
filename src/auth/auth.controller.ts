import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

  // V18 学习用：手动带 Authorization: Bearer <token> 验证 JWT。V19 会改成 Guard，本接口可删。
  @Get('verify-demo')
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <accessToken>',
  })
  verifyDemo(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    return this.authService.verifyDemo(token);
  }

  private extractBearerToken(authorization?: string) {
    // Authorization: Bearer <accessToken> 是常见 JWT 传递方式。
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Bearer Token');
    }
    return authorization.slice('Bearer '.length).trim();
  }
}
