'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSocketContext } from '@/lib/socket';
import { notificationsAPI, Notification } from '@/lib/notifications';
import { usePushNotifications, initializePushNotifications } from '@/lib/pushNotifications';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ALERT: 'bg-red-100 text-red-800',
  SUCCESS: 'bg-green-100 text-green-800',
};

const TYPE_ICONS: Record<string, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  ALERT: '🚨',
  SUCCESS: '✅',
};

export default function NotificationCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, connected } = useSocketContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const {
    isSupported: pushSupported,
    permission: pushPermission,
    requestPermission: requestPushPermission,
    registerDevice,
  } = usePushNotifications();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsAPI.list(user.id, { limit: 20 }),
        notificationsAPI.getUnreadCount(user.id),
      ]);
      if (!mountedRef.current) return;
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data.count || 0);
    } catch { /* ignore */ }
    finally { if (mountedRef.current) setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();
    return () => { mountedRef.current = false; };
  }, [fetchNotifications]);

  // Initialize push notifications
  useEffect(() => {
    if (pushSupported && pushPermission === 'default') {
      setShowPushPrompt(true);
    }
  }, [pushSupported, pushPermission]);

  // Initialize service worker and subscription
  useEffect(() => {
    if (pushPermission === 'granted') {
      const cleanup = initializePushNotifications(registerDevice);
      return cleanup;
    }
  }, [pushPermission, registerDevice]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleNew = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    };

    const handleRead = (notification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:read', handleRead);
    socket.on('notification:all-read', handleAllRead);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', handleRead);
      socket.off('notification:all-read', handleAllRead);
    };
  }, [socket, connected]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsAPI.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleClick = (notification: Notification) => {
    if (!notification.read) handleMarkAsRead(notification.id);
    setOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setShowPushPrompt(false);
    if (result === 'granted') {
      // Re-initialize push notifications
      const cleanup = initializePushNotifications(registerDevice);
      return () => cleanup();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Push Notification Permission Prompt */}
          {showPushPrompt && pushSupported && pushPermission === 'default' && (
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Enable push notifications to stay updated
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnablePush}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowPushPrompt(false)}
                  className="px-3 py-1 text-blue-600 dark:text-blue-300 text-xs hover:underline"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-green-50/50 dark:bg-green-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
