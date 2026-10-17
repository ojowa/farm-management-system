import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '../../../../kernel/database';
import { NotificationRepository, DeviceTokenRepository } from '../../domain/repositories/notification.repository';
import { Notification, DeviceToken } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest, UpdateNotificationRequest } from '../../presentation/dto/notification.dto';

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link ?? undefined,
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    // The column (and every client) calls this `read` — keep the API response
    // in step with it so unread badges and mark-read states line up.
    read: row.read,
    createdAt: row.createdAt,
  };
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function clampLimit(limit: number | undefined, fallback = DEFAULT_PAGE_SIZE): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}

function clampOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset) || offset < 0) return 0;
  return Math.trunc(offset);
}

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  async findById(id: string, userId: string): Promise<Notification | null> {
    const row = await prisma.notification.findFirst({ where: { id, userId } });
    return row ? mapNotification(row) : null;
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.read = false;
    }

    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: clampLimit(options?.limit, 10),
      skip: clampOffset(options?.offset),
    });
    return rows.map(mapNotification);
  }

  async findAll(userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: clampLimit(options?.limit),
      skip: clampOffset(options?.offset),
    });
    return rows.map(mapNotification);
  }

  async create(data: CreateNotificationRequest): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
      },
    });
    return mapNotification(notification);
  }

  async update(id: string, userId: string, updateDto: UpdateNotificationRequest): Promise<Notification | null> {
    const data: any = {};
    if (updateDto.title !== undefined) data.title = updateDto.title;
    if (updateDto.message !== undefined) data.message = updateDto.message;
    if (updateDto.type !== undefined) data.type = updateDto.type;
    if (updateDto.link !== undefined) data.link = updateDto.link;
    if (updateDto.entityType !== undefined) data.entityType = updateDto.entityType;
    if (updateDto.entityId !== undefined) data.entityId = updateDto.entityId;
    // `read` is canonical; `isRead` is the legacy alias accepted by the schema.
    const read = updateDto.read ?? updateDto.isRead;
    if (read !== undefined) data.read = read;
    if (Object.keys(data).length === 0) return this.findById(id, userId);

    // updateMany keeps the ownership check inside the mutation itself instead
    // of relying on a separate read (TOCTOU).
    const result = await prisma.notification.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return null;
    return this.findById(id, userId);
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (result.count === 0) return null;
    return this.findById(id, userId);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    // `deleteMany` is rewritten by the soft-delete extension into a
    // `deletedAt` stamp, so the userId stays in the where clause.
    const result = await prisma.notification.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  async filterUserIdsInOrg(userIds: string[], organizationId: string): Promise<string[]> {
    if (!organizationId || !userIds.length) return [];
    const rows = await prisma.user.findMany({
      where: { id: { in: userIds }, organizationId },
      select: { id: true },
    });
    return rows.map((row: { id: string }) => row.id);
  }
}

@Injectable()
export class PrismaDeviceTokenRepository implements DeviceTokenRepository {
  async findByUserId(userId: string): Promise<DeviceToken[]> {
    const rows = await prisma.deviceToken.findMany({
      where: { userId, active: true },
    });
    return rows as DeviceToken[];
  }

  async findByToken(userId: string, token: string): Promise<DeviceToken | null> {
    const row = await prisma.deviceToken.findFirst({
      where: { userId, token },
    });
    return row as DeviceToken | null;
  }

  async register(userId: string, token: string, platform: 'web' | 'ios' | 'android'): Promise<DeviceToken> {
    const existing = await this.findByToken(userId, token);

    if (existing) {
      const updated = await prisma.deviceToken.update({
        where: { id: existing.id },
        data: { active: true },
      });
      return updated as DeviceToken;
    }

    const created = await prisma.deviceToken.create({
      data: { userId, token, platform },
    });
    return created as DeviceToken;
  }

  async deactivate(id: string): Promise<void> {
    await prisma.deviceToken.update({
      where: { id },
      data: { active: false },
    });
  }

  async deactivateByToken(userId: string, token: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: { userId, token },
      data: { active: false },
    });
  }
}
