import { Notification, CreateNotificationRequest, UpdateNotificationRequest } from '@farm/types';
import { NotificationGateway } from './notification.gateway';
import { Prisma } from '@farm/database';

export class NotificationRepository {
  async create(createDto: CreateNotificationRequest): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: createDto.userId,
        title: createDto.title,
        message: createDto.message,
        type: createDto.type,
        link: createDto.link || null, // Add support for link field
        isRead: createDto.isRead || false,
        entityType: createDto.entityType,
        entityId: createDto.entityId,
      },
      include: {
        user: true,
      },
    });
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    return prisma.notification.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 10,
      skip: options?.offset || 0,
    });
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return prisma.notification.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async update(id: string, updateDto: Partial<Notification>): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: updateDto,
      include: { user: true },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    const gateway = new NotificationGateway();
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
      include: { user: true },
    });
    
    // Emit real-time event for notification update
    gateway.sendToUser(notification.userId, 'notification:read', notification);
    
    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false,
      },
      data: { isRead: true },
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
      where: {
        userId,
        isRead: false,
      },
    });
  }
}