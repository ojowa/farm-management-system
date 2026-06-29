import { Notification, CreateNotificationRequest, UpdateNotificationRequest } from '@farm/types';
import { NotificationGateway } from './notification.gateway';
import { prisma } from '@farm/database';

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
  } as Notification;
}

export class NotificationRepository {
  async create(createDto: CreateNotificationRequest): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: createDto.userId,
        title: createDto.title,
        message: createDto.message,
        type: createDto.type || 'INFO',
        link: createDto.link || null,
        entityType: createDto.entityType || null,
        entityId: createDto.entityId || null,
      },
    });
    return mapNotification(notification);
  }

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
    const gateway = new NotificationGateway();
    const row = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    const notification = mapNotification(row);
    gateway.sendToUser(notification.userId, 'notification:read', notification);
    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({ where: { id } });
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
