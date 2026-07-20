'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setTimeout(() => setWasOffline(false), 5000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-slide-up',
        isOnline
          ? 'bg-green-500 text-white border-green-600'
          : 'bg-yellow-500 text-white border-yellow-600'
      )}
      role="alert"
    >
      <WifiOff className="h-5 w-5" />
      <span className="text-sm font-medium">
        {isOnline ? 'Connection restored' : 'You are offline'}
      </span>
      {!isOnline && (
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}