import * as React from 'react';
import { cn } from '../lib/cn';

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center p-8">
      <svg className={cn('animate-spin text-green-600', s[size])} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function LoadingOverlay({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white/75 dark:bg-gray-900/75 flex items-center justify-center rounded-lg z-10">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

export { LoadingSpinner, LoadingOverlay };
