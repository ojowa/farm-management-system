import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

declare const process: { env?: Record<string, string | undefined> };

const API_BASE_URL =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:4000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type?: string;
  moduleId?: string;
  module?: string;
  screen?: string;
}

export async function registerForPushNotifications(): Promise<string | null> {
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
    const authToken = await AsyncStorage.getItem('accessToken');
    if (!authToken) return;

    await fetch(`${API_BASE_URL}/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
    });
  } catch {
    // Silent fail — will retry on next app launch
  }
}

export async function unregisterFromNotifications(): Promise<void> {
  try {
    const authToken = await AsyncStorage.getItem('accessToken');
    const token = await Notifications.getExpoPushTokenAsync();

    if (authToken && token.data) {
      await fetch(`${API_BASE_URL}/notifications/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: token.data }),
      });
    }
  } catch {
    // Silent fail
  }
}

export async function getNotificationPermissions(): Promise<boolean> {
  const perms = (await Notifications.getPermissionsAsync()) as { status: string };
  return perms.status === 'granted';
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
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

let responseListener: Notifications.Subscription | null = null;

export function setupNotificationListeners() {
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
