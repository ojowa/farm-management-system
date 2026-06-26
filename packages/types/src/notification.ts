export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  type?: NotificationType;
  read?: boolean;
}