/**
 * Notification module — in-app notifications plus device push registration.
 * Mirrors the admin portal's `notification` plan-module.
 */
export { notificationsAPI } from '../../services/api';
export {
  ensurePushRegistration,
  registerForPushNotifications,
  sendTokenToServer,
  unregisterFromNotifications,
  getNotificationPermissions,
  setupNotificationListeners,
  teardownNotificationListeners,
  syncBadgeFromServer,
  clearBadge,
  isPushSupported,
  resolveNotificationRoute,
  isPushOptedOut,
  setPushNotificationsEnabled,
} from '../../services/notifications';
export type { NotificationData, PushRegistrationResult } from '../../services/notifications';
export type { Notification, NotificationType, DeviceToken } from '../../services/types';
