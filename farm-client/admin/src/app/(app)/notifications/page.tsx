'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/lib/socket';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function iconFor(type: string) {
  switch (String(type ?? '').toUpperCase()) {
    case 'SUCCESS':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'ALERT':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, on } = useSocket();
  const { hasPermission } = usePermission();
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unreadCountError, setUnreadCountError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const canDelete = hasPermission('notification.write');
  const itemsRef = useRef<NotificationRow[]>([]);
  const unreadRef = useRef(0);
  // Serializes overlapping refreshes so a burst of socket events can't
  // interleave responses out of order.
  const loadSeq = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    unreadRef.current = unread;
  }, [unread]);

  const load = useCallback(
    async (mode: 'reset' | 'more') => {
      if (!user?.id) return;
      const seq = ++loadSeq.current;

      if (mode === 'more') setLoadingMore(true);
      else {
        setLoading(true);
        setLoadError(null);
      }

      try {
        const limit = mode === 'reset' ? Math.max(itemsRef.current.length, PAGE_SIZE) : PAGE_SIZE;
        const offset = mode === 'reset' ? 0 : itemsRef.current.length;

        const [listRes, countRes] = await Promise.allSettled([
          notificationsAPI.list(user.id, { limit, offset, unreadOnly: unreadOnly ? 'true' : undefined }),
          notificationsAPI.unreadCount(user.id),
        ]);

        if (seq !== loadSeq.current) return; // a newer load superseded this one

        if (listRes.status === 'fulfilled') {
          const batch: NotificationRow[] = listRes.value.data ?? [];
          if (mode === 'reset') {
            setItems(batch);
            setHasMore(batch.length === limit);
          } else {
            setItems((prev) => {
              const seen = new Set(prev.map((n) => n.id));
              const merged = [...prev, ...batch.filter((n) => !seen.has(n.id))];
              setHasMore(batch.length === PAGE_SIZE);
              return merged;
            });
          }
        } else if (mode === 'reset') {
          const message = getErrorMessage(listRes.reason);
          setItems([]);
          setHasMore(false);
          setLoadError(message);
          toast({ type: 'error', title: 'Could not load notifications', message });
        } else {
          toast({
            type: 'error',
            title: 'Could not load more notifications',
            message: getErrorMessage(listRes.reason),
          });
        }

        if (countRes.status === 'fulfilled') {
          setUnread(countRes.value.data?.count ?? 0);
          setUnreadCountError(false);
        } else {
          setUnreadCountError(true);
          toast({
            type: 'error',
            title: 'Could not refresh unread count',
            message: getErrorMessage(countRes.reason),
          });
        }
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [user?.id, unreadOnly, toast]
  );

  // Initial load + reload when the unread filter flips.
  useEffect(() => {
    if (!isAuthenticated) return;
    void load('reset');
  }, [isAuthenticated, load]);

  // Keep the visible window fresh from realtime events: one authoritative
  // refetch instead of replaying deltas (marks read, deletes, new arrivals).
  useEffect(() => {
    if (!isConnected || !socket) return;
    const cleanups = (
      ['notification:new', 'notification:read', 'notification:all-read', 'notification:deleted'] as const
    ).map((event) => on(event, () => void load('reset')));
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [isConnected, socket, on, load]);

  const markRead = async (id: string) => {
    try {
      const target = itemsRef.current.find((n) => n.id === id);
      if (target?.read) return;
      await notificationsAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (target) setUnread((prev) => Math.max(0, prev - 1));
      void load('reset');
    } catch (error) {
      toast({ type: 'error', title: 'Could not mark as read', message: getErrorMessage(error) });
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsAPI.markAllRead(user.id);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      void load('reset');
    } catch (error) {
      toast({ type: 'error', title: 'Could not mark all as read', message: getErrorMessage(error) });
    }
  };

  const remove = async (id: string) => {
    try {
      const target = itemsRef.current.find((n) => n.id === id);
      await notificationsAPI.delete(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) setUnread((prev) => Math.max(0, prev - 1));
      void load('reset');
    } catch (error) {
      toast({ type: 'error', title: 'Could not delete notification', message: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCountError
              ? 'Unread count unavailable'
              : unread > 0
                ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}`
                : 'You are all caught up'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? 'Showing unread' : 'Unread only'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0 && !unreadCountError}
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="p-12 text-center" role="alert">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
              <p className="font-medium">Could not load notifications</p>
              <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void load('reset')}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{unreadOnly ? 'No unread notifications' : 'No notifications yet'}</p>
              <p className="text-sm mt-1">
                Alerts for leave requests, messages, tasks and other farm activity land here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 py-3',
                    !notification.read && 'bg-muted/40 -mx-3 px-3'
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">{iconFor(notification.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', notification.read ? 'font-medium' : 'font-semibold')}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {notification.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(notification.link!)}
                        title="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(notification.id)}
                        title="Delete"
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => load('more')} disabled={loadingMore}>
                {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
