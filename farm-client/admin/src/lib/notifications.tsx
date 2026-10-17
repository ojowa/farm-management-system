'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSocket } from './socket';
import { useToast, ToastType } from './toasts';
import { notificationsAPI, settingsAPI } from './api';
import { useAuth } from './auth';

/** Matches the server's `type` enum (`notification.schema.ts`). */
export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/** Server notification types → toast severity (ALERT reads as an error). */
export function toastTypeFor(type: string | undefined): ToastType {
  switch (String(type ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'ALERT':
      return 'error';
    default:
      return 'info';
  }
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected, on } = useSocket();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Mirror of the list so realtime/async handlers can read the latest state
  // without re-subscribing on every change.
  const notificationsRef = useRef<Notification[]>([]);
  // Settings → Notifications: in-app toasts are suppressed when the user
  // turned them off (email/push are enforced server-side).
  const inAppToastsRef = useRef(true);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  /**
   * Single write path for local list changes: the ref is updated first so a
   * `notification:*` socket echo of the same action (the server emits to
   * every session, including the one that made the REST call) can never see
   * stale state and count the same item twice.
   */
  const applyLocal = useCallback(
    (updater: (list: Notification[]) => Notification[]): void => {
      notificationsRef.current = updater(notificationsRef.current);
      setNotifications(notificationsRef.current);
    },
    []
  );

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [listRes, countRes] = await Promise.allSettled([
        notificationsAPI.list(user.id, { limit: 50 }),
        notificationsAPI.unreadCount(user.id),
      ]);

      if (listRes.status === 'fulfilled') {
        const data: Notification[] = listRes.value.data ?? [];
        notificationsRef.current = data;
        setNotifications(data);
        if (countRes.status === 'fulfilled') {
          setUnreadCount(countRes.value.data?.count ?? 0);
        } else {
          setUnreadCount(data.filter((n) => !n.read).length);
        }
      } else {
        console.error('Failed to fetch notifications:', listRes.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const target = notificationsRef.current.find((n) => n.id === id);
      if (target?.read) return;
      await notificationsAPI.markRead(id);
      applyLocal((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      // Only a still-unread item moves the badge — re-marking a read
      // notification used to under-count it.
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [applyLocal]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await notificationsAPI.markAllRead(user.id);
      applyLocal((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [user?.id, applyLocal]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const target = notificationsRef.current.find((n) => n.id === id);
      await notificationsAPI.delete(id);
      applyLocal((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [applyLocal]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      void settingsAPI
        .getPreferences()
        .then((res) => {
          const prefs = res.data?.notificationPreferences;
          if (prefs && typeof prefs.inAppNotifications === 'boolean') {
            inAppToastsRef.current = prefs.inAppNotifications;
          }
        })
        .catch(() => {
          // Preferences are an optimization — keep toasts enabled on failure.
        });
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      if (!notification?.id) return;
      const exists = notificationsRef.current.some((n) => n.id === notification.id);
      if (exists) return;
      applyLocal((prev) => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
      if (inAppToastsRef.current) {
        toast({
          type: toastTypeFor(notification.type),
          title: notification.title,
          message: notification.message,
        });
      }
    };

    // The server emits the full updated row; older shapes carried `{ id }`.
    const handleNotificationRead = (data: { id?: string }) => {
      const id = data?.id;
      if (!id) return;
      const target = notificationsRef.current.find((n) => n.id === id);
      if (target?.read) return;
      applyLocal((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (target) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleAllRead = () => {
      applyLocal((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    const handleDeleted = (data: { id?: string }) => {
      const id = data?.id;
      if (!id) return;
      const target = notificationsRef.current.find((n) => n.id === id);
      if (!target) return;
      applyLocal((prev) => prev.filter((n) => n.id !== id));
      if (!target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const cleanup1 = on('notification:new', handleNewNotification);
    const cleanup2 = on('notification:read', handleNotificationRead);
    const cleanup3 = on('notification:all-read', handleAllRead);
    const cleanup4 = on('notification:deleted', handleDeleted);

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
    };
  }, [isConnected, socket, on, toast, applyLocal]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
