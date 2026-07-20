import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from './api';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient';

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo) {
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

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
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
    await apiClient.axiosInstance.post('/notifications/register', {
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
      await apiClient.axiosInstance.post('/notifications/unregister', {
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

function resolveRoute(data: NotificationData): string | null {
  if (data.screen) return data.screen;

  if (data.module && data.moduleId) {
    switch (data.module) {
      case 'farm':
        return `/farms/${data.moduleId}`;
      case 'crop':
        return `/crops/${data.moduleId}`;
      case 'livestock':
      case 'poultry':
        return `/livestock/${data.moduleId}`;
      case 'finance':
        return `/finance/${data.moduleId}`;
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
