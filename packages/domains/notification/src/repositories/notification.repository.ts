import { Repository } from '@farm/domain-core';
import { Notification } from '../entities/notification.entity';

export interface NotificationRepository extends Repository<Notification> {
  findByUserId(userId: string): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
