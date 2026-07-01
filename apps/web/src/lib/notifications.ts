import { apiClient } from './api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  read: boolean;
  createdAt: string;
  link?: string;
}

export const notificationsAPI = {
  list: (userId: string, params?: { unreadOnly?: boolean; limit?: number; offset?: number }) =>
    apiClient.get<Notification[]>(`/notifications/user/${userId}`, { params }),
  getUnreadCount: (userId: string) =>
    apiClient.get<{ count: number }>(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id: string) =>
    apiClient.put<Notification>(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) =>
    apiClient.put<{ count: number }>(`/notifications/user/${userId}/read-all`),
  delete: (id: string) =>
    apiClient.delete(`/notifications/${id}`),
  registerDeviceToken: (token: string, platform: 'web' | 'ios' | 'android' = 'web') =>
    apiClient.post('/devices/tokens', { token, platform }),
  unregisterDeviceToken: (token: string) =>
    apiClient.delete('/devices/tokens', { data: { token } }),
};
