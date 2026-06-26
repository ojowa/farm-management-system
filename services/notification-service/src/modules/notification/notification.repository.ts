import { prisma } from '@farm/database';
import { Notification, CreateNotificationRequest, NotificationType } from '@farm/types';

const asType = (type: NotificationType | string | undefined): NotificationType => {
  const allowed: NotificationType[] = ['INFO', 'WARNING', 'ALERT', 'SUCCESS'];
  return (allowed.includes(type as NotificationType) ? (type as NotificationType) : 'INFO');
};

export class NotificationRepository {
  async create(data: CreateNotificationRequest): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: asType(data.type),
      },
    }) as Promise<Notification>;
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    }) as Promise<Notification | null>;
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }) as Promise<Notification[]>;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }) as Promise<Notification[]>;
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    }) as Promise<Notification>;
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    }) as Promise<Notification>;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({
      where: { id },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
