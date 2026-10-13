'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, string> = {
  success: 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
  error: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type];
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in ${
        colors[toast.type]
      }`}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const t: Toast = { ...newToast, id };
    setToasts((prev) => [...prev, t]);
    if (newToast.duration !== 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), newToast.duration ?? 5000);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

/**
 * Pull a human-readable message out of an API error.
 *
 * Failures arrive in a different envelope depending on which layer produced
 * them: the auth service answers `{ data: { message } }`, Nest's default
 * handler answers `{ message }`, and the gateway filter answers
 * `{ error: { message } }`. Check each shape before falling back to axios's
 * own `err.message`, which for a failed request is just "Request failed with
 * status code 401" — never something to show a user.
 */
export function getErrorMessage(
  err: any,
  fallback = 'Something went wrong. Please try again.',
): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const asText = (value: any): string | undefined => {
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join('. ');
      return joined || undefined;
    }
    return typeof value === 'string' && value.trim() ? value : undefined;
  };

  // The throttler's own message ("ThrottlerException: Too Many Requests") is
  // developer-facing, so translate this one case ourselves.
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';

  const serverMessage =
    asText(data?.data?.message) ||
    asText(data?.message) ||
    asText(data?.error?.message) ||
    asText(typeof data?.error === 'string' ? data.error : undefined);

  if (serverMessage) return serverMessage;

  // The request never reached the server (offline, DNS, blocked by CORS…).
  if (err?.request && !err?.response) {
    return "Can't reach the server. Check your connection and try again.";
  }

  if (status && status >= 500) return 'The server had a problem. Please try again shortly.';

  // Axios's own message for an HTTP failure is a technical string ("Request
  // failed with status code 401") — never show that. Its network-level
  // messages were handled above; genuine `throw new Error(...)` messages are
  // worth keeping.
  if (err?.isAxiosError) return fallback;

  return asText(err?.message) || fallback;
}