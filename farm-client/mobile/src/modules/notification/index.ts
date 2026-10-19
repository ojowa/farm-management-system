/**
 * Notification module — in-app notifications plus device push registration.
 * Mirrors the admin portal's `notification` plan-module.
 */
export { notificationsAPI } from '../../services/api';
export {
  registerForPushNotifications,
  sendTokenToServer,
  unregisterFromNotifications,
  getNotificationPermissions,
  setupNotificationListeners,
} from '../../services/notifications';
export type { Notification, NotificationType, DeviceToken } from '../../services/types';
