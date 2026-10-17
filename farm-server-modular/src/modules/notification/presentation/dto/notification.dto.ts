export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export interface SendBulkNotificationRequest {
  notifications: CreateNotificationRequest[];
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  type?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  read?: boolean;
  /** @deprecated legacy alias for `read`. */
  isRead?: boolean;
}

export interface CreateDeviceTokenRequest {
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
}
