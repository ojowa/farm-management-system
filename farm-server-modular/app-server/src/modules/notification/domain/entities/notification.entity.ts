export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
