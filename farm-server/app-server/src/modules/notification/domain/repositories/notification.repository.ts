import { Notification, DeviceToken } from '../entities/notification.entity';
import { CreateNotificationRequest, UpdateNotificationRequest } from '../../presentation/dto/notification.dto';

export interface NotificationRepository {
  // Ownership: Notification has no organizationId column — rows belong to the
  // receiving user, so every lookup and mutation is scoped to that user (a
  // foreign id reads as null / 0 rows → 404).
  findById(id: string, userId: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]>;
  findAll(userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]>;
  create(data: CreateNotificationRequest): Promise<Notification>;
  update(id: string, userId: string, data: UpdateNotificationRequest): Promise<Notification | null>;
  markAsRead(id: string, userId: string): Promise<Notification | null>;
  markAllAsRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
  /** Soft-deletes the row; returns false when it is not the caller's to delete. */
  delete(id: string, userId: string): Promise<boolean>;
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
