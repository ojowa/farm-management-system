import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE_URL =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:4000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
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
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
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
    Notifications.removeNotificationSubscription(responseListener);
  }

  responseListener = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  return () => {
    if (responseListener) {
      Notifications.removeNotificationSubscription(responseListener);
      responseListener = null;
    }
  };
}
