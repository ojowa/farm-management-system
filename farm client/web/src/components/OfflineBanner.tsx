'use client';

import React from 'react';
import { useSocketContext } from '@/lib/socket';

export default function OfflineBanner() {
  const { online } = useSocketContext();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gray-800 dark:bg-gray-900 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2" role="alert">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
      You are offline — some features may be limited
    </div>
  );
}
