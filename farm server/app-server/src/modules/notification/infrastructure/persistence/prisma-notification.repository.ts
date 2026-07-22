import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { NotificationRepository, DeviceTokenRepository } from '../../domain/repositories/notification.repository';
import { Notification, DeviceToken } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest } from '../../presentation/dto/notification.dto';

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
    isRead: row.read,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  async findById(id: string): Promise<Notification | null> {
    const row = await prisma.notification.findUnique({ where: { id } });
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
      take: options?.limit || 10,
      skip: options?.offset || 0,
    });
    return rows.map(mapNotification);
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
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

  async update(id: string, updateDto: Partial<Notification>): Promise<Notification> {
    const data: any = {};
    if (updateDto.title !== undefined) data.title = updateDto.title;
    if (updateDto.message !== undefined) data.message = updateDto.message;
    if (updateDto.type !== undefined) data.type = updateDto.type;
    if (updateDto.link !== undefined) data.link = updateDto.link;
    if (updateDto.isRead !== undefined) data.read = updateDto.isRead;

    const row = await prisma.notification.update({ where: { id }, data });
    return mapNotification(row);
  }

  async markAsRead(id: string): Promise<Notification> {
    const row = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return mapNotification(row);
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

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({ where: { id } });
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
