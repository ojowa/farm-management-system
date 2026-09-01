'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from './socket';
import { Bell, X } from 'lucide-react';
import { useToast } from './toasts';
import { notificationsAPI } from './api';
import { useAuth } from './auth';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
  link?: string;
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

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.list({ limit: 50 });
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => {
        const notif = prev.find((n) => n.id === id);
        const newUnread = notif && !notif.read ? 1 : 0;
        setUnreadCount((c) => Math.max(0, c - newUnread));
        return prev.filter((n) => n.id !== id);
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
        toast({
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
        });
      }
    };

    const handleNotificationRead = (data: { id: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    const cleanup1 = on('notification:new', handleNewNotification);
    const cleanup2 = on('notification:read', handleNotificationRead);
    const cleanup3 = on('notification:all-read', handleAllRead);

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
    };
  }, [isConnected, socket, on, toast]);

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
