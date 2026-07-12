import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@farm/database';
import crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  async list(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        service: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll() {
    return prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        service: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: { name: string; service: string }) {
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);
    const apiKey = await prisma.apiKey.create({
      data: { userId, name: data.name, keyPrefix, keyHash, service: data.service },
    });
    return { ...apiKey, rawKey };
  }

  async toggle(id: string, userId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException('API key not found');
    return prisma.apiKey.update({
      where: { id },
      data: { isActive: !key.isActive },
    });
  }

  async delete(id: string, userId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException('API key not found');
    await prisma.apiKey.delete({ where: { id } });
  }
}
