import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { handlePrismaKnownError } from '../common/errors/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { userPublicSelect } from '../users/user-public.select';
import { RegisterDto } from './dto/register.dto';
import { comparePassword, hashPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existed = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existed) {
      throw new ConflictException('邮箱已注册');
    }

    // 先 findUnique 是为了友好 409 提示；email @unique 才是最终一致性约束。
    // 并发下两个请求都可能查到“不存在”，第二层靠 P2002。
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

  // V17 只演示 compare 语义，不提供 POST /auth/login（V18 再做）。
  // 故意保留私有方法，避免误以为登录是 password === passwordHash。
  private verifyPassword(password: string, passwordHash: string) {
    return comparePassword(password, passwordHash);
  }
}
