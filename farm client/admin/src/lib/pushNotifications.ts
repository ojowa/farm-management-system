'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from './api';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  registerDevice: (token: string) => Promise<boolean>;
  unregisterDevice: (token: string) => Promise<boolean>;
}

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const registerDevice = useCallback(async (token: string): Promise<boolean> => {
    try {
      await apiClient.post('/devices/tokens', {
        token,
        platform: 'web',
      });
      return true;
    } catch (error) {
      console.error('Failed to register device token:', error);
      return false;
    }
  }, []);

  const unregisterDevice = useCallback(async (token: string): Promise<boolean> => {
    try {
      await apiClient.delete('/devices/tokens', { data: { token } });
      return true;
    } catch (error) {
      console.error('Failed to unregister device token:', error);
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    requestPermission,
    registerDevice,
    unregisterDevice,
  };
}

export function initializePushNotifications(
  registerDevice: (token: string) => Promise<boolean>
): () => void {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return () => {};
  }

  let registration: ServiceWorkerRegistration | null = null;

  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      registration = reg;
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
    })
    .then((subscription) => {
      const token = JSON.stringify(subscription);
      registerDevice(token);
    })
    .catch((error) => {
      console.error('Failed to initialize push notifications:', error);
    });

  return () => {
    if (registration) {
      registration.pushManager.getSubscription().then((subscription) => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });
    }
  };
}
