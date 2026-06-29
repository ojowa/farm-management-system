export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  type?: NotificationType;
  link?: string;
  isRead?: boolean;
}