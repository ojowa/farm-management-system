import { Notification, DeviceToken } from '../entities/notification.entity';
import { CreateNotificationRequest } from '../../presentation/dto/notification.dto';

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]>;
  findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]>;
  create(data: CreateNotificationRequest): Promise<Notification>;
  update(id: string, data: Partial<Notification>): Promise<Notification>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
}

export interface DeviceTokenRepository {
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByToken(userId: string, token: string): Promise<DeviceToken | null>;
  register(userId: string, token: string, platform: 'web' | 'ios' | 'android'): Promise<DeviceToken>;
  deactivate(id: string): Promise<void>;
  deactivateByToken(userId: string, token: string): Promise<void>;
}
