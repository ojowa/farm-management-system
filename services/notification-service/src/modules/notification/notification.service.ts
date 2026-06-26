import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, CreateNotificationRequest } from '@farm/types';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly gateway: NotificationGateway
  ) {}

  async create(createDto: CreateNotificationRequest): Promise<Notification> {
    const notification = await this.repository.create(createDto);
    this.gateway.sendToUser(createDto.userId, 'notification:new', notification);
    return notification;
  }

  async findById(id: string): Promise<Notification> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]> {
    return this.repository.findByUserId(userId, options);
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return this.repository.findAll(options);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    const updated = await this.repository.markAsRead(id);
    this.gateway.sendToUser(notification.userId, 'notification:read', updated);
    return updated;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);
    this.gateway.sendToUser(userId, 'notification:all-read', { count });
    return count;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }

  async createBulk(notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    const created: Notification[] = [];
    for (const dto of notifications) {
      const notification = await this.repository.create(dto);
      created.push(notification);
      this.gateway.sendToUser(dto.userId, 'notification:new', notification);
    }
    return created;
  }

  /**
   * Update a notification by id. Thin wrapper used by the controller so the
   * route handler does not have to reach into the repository directly.
   */
  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    await this.findById(id);
    return this.repository.update(id, data);
  }
}
