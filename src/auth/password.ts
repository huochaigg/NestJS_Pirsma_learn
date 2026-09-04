import * as bcrypt from 'bcrypt';

// saltRounds：bcrypt 计算成本。越高越抗暴力破解，也越占 CPU。学习阶段用 10。
const SALT_ROUNDS = 10;

// bcrypt.hash：把明文密码变成不可逆 Hash。返回值里已包含 Salt，不必自己拼 randomString。
// Hash ≠ Encryption：Encryption 可解密；Password Hash 只能 compare，不能还原原密码。
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// bcrypt.compare：不会解密 Hash，而是用同样算法验证明文是否匹配。
// 不能写 password === passwordHash，Hash 字符串本来就和明文不同。
export function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
