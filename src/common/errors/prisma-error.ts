import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

export function handlePrismaKnownError(error: unknown): never {
  // PrismaClientKnownRequestError：Prisma 已识别的数据库请求错误，带有稳定的 error.code。
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002：唯一约束冲突。User.email、Order.orderNo 都可能触发。
    if (error.code === 'P2002') {
      throw new ConflictException('唯一字段已经存在');
    }
    // P2025：操作依赖的记录不存在，例如 update/delete 找不到目标。
    if (error.code === 'P2025') {
      throw new NotFoundException('记录不存在');
    }
    // P2003：外键约束失败。V9 不深入讲这个错误码，只做一个最小转换：
    // 用户下还有订单时，默认 Restrict 不允许删除 User。
    if (error.code === 'P2003') {
      throw new ConflictException('存在关联数据，无法删除');
    }
  }
  // 未知错误继续 throw，由 NestJS 按 500 处理。
  throw error;
}
