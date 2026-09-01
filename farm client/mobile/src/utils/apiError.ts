import type { AxiosError } from 'axios';

// Network errors (no response from server) deserve a clearer message than
// the default "Network Error", and silent `console.error` calls leave users
// staring at blank screens with no way to recover.
export interface ApiErrorShape {
  status: number | null;
  code: string | null;
  message: string;
  isNetwork: boolean;
  isAuth: boolean;
  isForbidden: boolean;
  isServer: boolean;
  isClient: boolean;
}

const SERVER_MESSAGE_PATTERNS = /stack|trace|query|sql|internal|error in|at .+:\d+|\.js:\d+/i;

export function toApiError(error: unknown, fallback = 'Request failed'): ApiErrorShape {
  const err = error as AxiosError<any> | undefined;
  const status = err?.response?.status ?? null;
  const code = (err?.code as string | undefined) ?? null;
  const rawServerMessage =
    (err?.response?.data as any)?.message ||
    (err?.response?.data as any)?.error ||
    (err?.response?.data as any)?.detail;
  const serverMessage = rawServerMessage && !SERVER_MESSAGE_PATTERNS.test(rawServerMessage)
    ? rawServerMessage
    : undefined;

  const message = serverMessage || err?.message || fallback;
  const isNetwork = !status && !!err;
  const isAuth = status === 401 || status === 403;
  const isForbidden = status === 403;
  const isServer = status !== null && status >= 500;
  const isClient = status !== null && status >= 400 && status < 500;

  return { status, code, message, isNetwork, isAuth, isForbidden, isServer, isClient };
}

// Human-friendly summary that we use toasts for when a fetch fails.
export function describeApiError(error: unknown, fallback = 'Request failed'): string {
  const e = toApiError(error, fallback);
  if (e.isNetwork) {
    return 'No connection. Check your network and try again.';
  }
  if (e.status === 404) {
    return 'The requested resource was not found.';
  }
  if (e.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (e.status === 403) {
    return 'You don\u2019t have permission to do that.';
  }
  if (e.status && e.status >= 500) {
    return 'The server ran into a problem. Please try again in a moment.';
  }
  return e.message || fallback;
}
