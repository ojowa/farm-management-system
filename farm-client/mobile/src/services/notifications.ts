import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from './api';

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

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token.data;
  } catch {
    return null;
  }
}

export async function sendTokenToServer(expoPushToken: string): Promise<void> {
  try {
    await apiClient.client.post('/notifications/register', {
      token: expoPushToken,
      platform: Platform.OS,
    });
  } catch {
    // Silent fail — will retry on next app launch
  }
}

export async function unregisterFromNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    if (token.data) {
      await apiClient.client.post('/notifications/unregister', {
        token: token.data,
      });
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

const ALLOWED_SCREENS = new Set([
  '/(app)/farms',
  '/(app)/crops',
  '/(app)/livestock',
  '/(app)/finance',
  '/(app)/tasks',
  '/(app)/messages',
  '/(app)/notifications',
  '/(app)/settings',
  '/(app)/attendance',
  '/(app)/equipment',
  '/(app)/contracts',
  '/(app)/roster',
  '/(app)/leave',
  '/(app)/marketplace',
  '/(app)/correspondence',
  '/(app)/irrigation',
]);

function isAllowedRoute(route: string): boolean {
  if (ALLOWED_SCREENS.has(route)) return true;
  if (/^\/(app|poultry)\/\w+\/[a-f0-9-]+$/i.test(route)) return true;
  return false;
}

function resolveRoute(data: NotificationData): string | null {
  if (data.screen && isAllowedRoute(data.screen)) return data.screen;

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
