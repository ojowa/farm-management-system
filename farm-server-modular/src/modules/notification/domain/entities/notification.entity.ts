export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** Matches the `Notification.read` column; clients read this field. */
  read: boolean;
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
