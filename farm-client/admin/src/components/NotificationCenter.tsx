'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/notifications';
import { usePermission } from '@/lib/usePermission';
import { Bell, X, Check, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { hasPermission } = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const canManage = hasPermission('notification.write');

  const getIcon = (type: string) => {
    switch (String(type ?? '').toUpperCase()) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ALERT': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const openNotification = (notification: { id: string; read: boolean; link?: string }) => {
    if (!notification.read) void markAsRead(notification.id);
    setOpen(false);
    if (notification.link) router.push(notification.link);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      }
    >
      <div className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 hover:bg-accent',
                  !notification.read && 'bg-muted/50'
                )}
                inset
                onClick={() => openNotification(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', !notification.read ? 'font-semibold' : '')}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t p-3">
            <DropdownMenuItem
              className="text-center text-primary hover:bg-accent"
              onClick={() => {
                setOpen(false);
                router.push('/notifications');
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </div>
        )}
      </div>
    </DropdownMenu>
  );
}
