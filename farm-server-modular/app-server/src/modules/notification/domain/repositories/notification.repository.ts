import { Notification, DeviceToken } from '../entities/notification.entity';
import { CreateNotificationRequest } from '../../presentation/dto/notification.dto';

export interface NotificationRepository {
  // Ownership: Notification has no organizationId column — rows belong to the
  // receiving user, so every lookup is scoped to that user (a foreign id
  // reads as null → 404).
  findById(id: string, userId: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]>;
  findAll(userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]>;
  create(data: CreateNotificationRequest): Promise<Notification>;
  update(id: string, data: Partial<Notification>): Promise<Notification>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
  // Delivery scoping: a tenant may only address notifications to users inside
  // its own organization — returns the subset of the given ids that qualify.
  filterUserIdsInOrg(userIds: string[], organizationId: string): Promise<string[]>;
}

export interface DeviceTokenRepository {
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByToken(userId: string, token: string): Promise<DeviceToken | null>;
  register(userId: string, token: string, platform: 'web' | 'ios' | 'android'): Promise<DeviceToken>;
  deactivate(id: string): Promise<void>;
  deactivateByToken(userId: string, token: string): Promise<void>;
}
