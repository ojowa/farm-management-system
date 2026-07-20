import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    deviceInfo?: string;
  }): Promise<void> {
    await prisma.refreshToken.create({ data });
  }

  async findValidByHash(tokenHash: string): Promise<{ id: string; userId: string; revoked: boolean } | null> {
    const token = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, revoked: true },
    });
    return token;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: {
        revoked: true,
        ...(replacedByTokenHash ? { replacedByToken: replacedByTokenHash } : {}),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async findActiveByUser(userId: string): Promise<Array<{
    id: string;
    deviceInfo: string | null;
    ipAddress: string | null;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    return prisma.refreshToken.findMany({
      where: { userId, revoked: false },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
