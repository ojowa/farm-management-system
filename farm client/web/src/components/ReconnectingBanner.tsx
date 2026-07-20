'use client';

import React from 'react';
import { useSocketContext } from '@/lib/socket';

export default function ReconnectingBanner() {
  const { connected, reconnecting } = useSocketContext();

  if (connected || !reconnecting) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2" role="alert">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Reconnecting to server…
    </div>
  );
}
