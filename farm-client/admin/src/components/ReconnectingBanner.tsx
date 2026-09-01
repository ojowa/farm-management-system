'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReconnectingBanner() {
  const { isConnected } = useSocket();
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setHasConnected(true);
    }
  }, [isConnected]);

  if (isConnected || !hasConnected) return null;

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white', 'animate-slide-down')}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">Reconnecting...</span>
    </div>
  );
}
