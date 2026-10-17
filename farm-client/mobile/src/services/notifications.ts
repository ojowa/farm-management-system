import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from './api';
import {
  deleteExpoPushToken,
  getStoredExpoPushToken,
  setExpoPushToken,
} from '../core/utils/secureStorage';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient';

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  const N = require('expo-notifications');
  Notifications = N;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData {
  type?: string;
  moduleId?: string;
  module?: string;
  screen?: string;
  /** Server-generated deep link (e.g. `/hr/leave`, `/messages`). */
  link?: string;
  notificationId?: string;
}

function resolveProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    undefined
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const perms = (await Notifications.getPermissionsAsync()) as { status: string };
    let finalStatus = perms.status;

    if (perms.status !== 'granted') {
      const reqPerms = (await Notifications.requestPermissionsAsync()) as { status: string };
      finalStatus = reqPerms.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = resolveProjectId();
    let token: { data: string };
    try {
      token = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch {
      // Retry without an explicit projectId — getExpoPushTokenAsync throws
      // when EAS config is missing but still works in some environments.
      token = await Notifications.getExpoPushTokenAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Persist so unregisterFromNotifications() can still find the token on
    // logout even if getExpoPushTokenAsync() fails (revoked permissions).
    await setExpoPushToken(token.data);

    return token.data;
  } catch {
    return null;
  }
}

export async function sendTokenToServer(expoPushToken: string): Promise<void> {
  try {
    await apiClient.client.post('/devices/tokens', {
      token: expoPushToken,
      platform: Platform.OS,
    });
  } catch {
    // Silent fail — will retry on next app launch
  }
}

export async function unregisterFromNotifications(): Promise<void> {
  try {
    // Prefer the persisted token — getExpoPushTokenAsync() may fail after
    // permissions are revoked or on logout paths.
    let token = await getStoredExpoPushToken();

    if (!token && Notifications) {
      const remote = await Notifications.getExpoPushTokenAsync({
        projectId: resolveProjectId(),
      });
      token = remote.data || null;
    }

    if (token) {
      await apiClient.client.delete('/devices/tokens', {
        data: { token },
      });
      await deleteExpoPushToken();
    }
  } catch {
    // Silent fail
  }
}

export async function getNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const perms = (await Notifications.getPermissionsAsync()) as { status: string };
  return perms.status === 'granted';
}

function handleNotificationResponse(response: any) {
  const data = response.notification.request.content.data as NotificationData;

  if (!data) return;

  const route = resolveRoute(data);
  if (route) {
    router.push(route);
  }
}

// Only routes that actually exist under app/(app)/ — a miss here silently
// drops the deep link, so keep this in sync with the file-based routes.
const ALLOWED_SCREENS = new Set([
  '/(app)',
  '/(app)/farms',
  '/(app)/crops',
  '/(app)/livestock',
  '/(app)/finance',
  '/(app)/aquaculture',
  '/(app)/tasks',
  '/(app)/messages',
  '/(app)/notifications',
  '/(app)/leave',
  '/(app)/settings',
  '/(app)/settings/edit-profile',
  '/(app)/subscription',
  '/(app)/inventory/low-stock',
  '/(app)/reports/scheduled',
]);

// Server-generated links (data.link) mapped to mobile routes.
const LINK_ROUTES: Record<string, string> = {
  '/': '/(app)',
  '/hr/leave': '/(app)/leave',
  '/hr/leave/approvals': '/(app)/leave',
  '/leave': '/(app)/leave',
  '/messages': '/(app)/messages',
  '/tasks': '/(app)/tasks',
  '/notifications': '/(app)/notifications',
  '/farms': '/(app)/farms',
  '/crops': '/(app)/crops',
  '/livestock': '/(app)/livestock',
  '/finance': '/(app)/finance',
  '/aquaculture': '/(app)/aquaculture',
};

function isAllowedRoute(route: string): boolean {
  if (ALLOWED_SCREENS.has(route)) return true;
  // Group routes are literal "(app)" — escape the parens in the regex.
  if (/^\/\((app|auth)\)\/[\w-]+\/[a-f0-9-]+$/i.test(route)) return true;
  return false;
}

/**
 * Map a server-generated link (e.g. "/hr/leave") to a mobile route.
 * Returns null when the link has no mobile equivalent.
 */
export function resolveNotificationRoute(link?: string | null): string | null {
  if (!link) return null;
  const path = link.split('?')[0].replace(/\/$/, '') || '/';
  return LINK_ROUTES[path] ?? null;
}

function resolveRoute(data: NotificationData): string | null {
  if (data.screen && isAllowedRoute(data.screen)) return data.screen;

  // Server-side notifications carry a canonical link (e.g. "/hr/leave").
  const linked = resolveNotificationRoute(data.link);
  if (linked) return linked;

  if (data.module && data.moduleId) {
    // Sanitize moduleId — only allow UUIDs and alphanumeric IDs
    const safeId = /^[a-f0-9-]+$/i.test(data.moduleId) ? data.moduleId : null;
    if (!safeId) return null;

    switch (data.module) {
      case 'farm':
        return `/(app)/farms/${safeId}`;
      case 'crop':
        return `/(app)/crops/${safeId}`;
      case 'livestock':
      case 'poultry':
        return `/(app)/livestock/${safeId}`;
      case 'finance':
        return `/(app)/finance/${safeId}`;
    }
  }

  if (data.type) {
    // HR / messaging notification types produced by the server.
    if (data.type.startsWith('leave')) return '/(app)/leave';
    if (data.type === 'new-message' || data.type.startsWith('message')) {
      return '/(app)/messages';
    }
    if (data.type.startsWith('task')) return '/(app)/tasks';
    if (data.type === 'notification') return '/(app)/notifications';

    if (data.type.startsWith('farm')) return '/(app)/farms';
    if (data.type.startsWith('crop')) return '/(app)/crops';
    if (data.type.startsWith('livestock') || data.type.startsWith('poultry')) return '/(app)/livestock';
    if (data.type.startsWith('finance')) return '/(app)/finance';
  }

  return null;
}

let responseListener: any = null;

export function setupNotificationListeners() {
  if (!Notifications) return () => {};
  if (responseListener) {
    responseListener.remove();
  }

  responseListener = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  return () => {
    if (responseListener) {
      responseListener.remove();
      responseListener = null;
    }
  };
}
