'use client';

import React, { useEffect } from 'react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Shared modal. On phones the panel fills the viewport (forms beside a list
 * are unusable at 360px); from `sm` up it renders as a centered card capped
 * at 90dvh that scrolls its body. ESC and backdrop click close it.
 */
export function Dialog({ open, onOpenChange, children, title, description }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-50 flex h-[100dvh] w-full flex-col bg-[var(--card)] p-4 shadow-xl sm:mx-4 sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl sm:p-6">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {(title || description) && (
          <div className="mb-5 space-y-1 pr-8">
            {title && <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>}
            {description && <p className="text-sm text-[var(--muted-foreground)]">{description}</p>}
          </div>
        )}
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
