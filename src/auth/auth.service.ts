import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { userPublicSelect } from '../users/user-public.select';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { comparePassword, hashPassword } from './password';

@Injectable()
export class AuthService {
  // JwtService：NestJS 对 JWT 操作的封装，可以签发、验证、解码 Token。
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existed = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existed) {
      throw new ConflictException('邮箱已注册');
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          age: dto.age,
          passwordHash,
        },
        select: userPublicSelect,
      });
    } catch (error) {
      handlePrismaKnownError(error);
    }
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    // payload：JWT 中携带的声明。不要放密码、passwordHash 等敏感信息。
    // sub：JWT 标准里的 subject，表示“这个 Token 属于谁”。后续 Guard 用 payload.sub 当 userId。
    // JWT Signing ≠ Encryption：payload 可被客户端解码看到，签名只防篡改，不保证保密。
    const payload = { sub: user.id, email: user.email };
    // signAsync()：用 JWT secret 对 payload 签名，生成字符串 Token。
    // 客户端持有后可证明“这是服务器签发的”。当前不把 Token 存数据库（无状态 Access Token）。
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
      },
    };
  }

  // verifyAsync()：验证签名、过期时间等。成功返回可信 payload；
  // Token 被篡改、secret 不匹配或过期会抛异常。decode 只读 payload 不验签，V18 不用。
  async verifyDemo(token: string) {
    try {
      return await this.jwtService.verifyAsync<{ sub: number; email: string }>(
        token,
      );
    } catch {
      throw new UnauthorizedException('无效或过期的 Token');
    }
  }

  // passwordHash 只在服务端认证内部使用，离开本方法后不会带到 HTTP Response。
  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        ...userPublicSelect,
        passwordHash: true,
      },
    });

    // email 不存在和密码错误统一 401，避免通过接口探测邮箱是否已注册。
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const passwordMatched = await comparePassword(password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
