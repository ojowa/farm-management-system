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

// 403s the server explains itself (plan/entitlement rejections such as
// "Farm type 'POULTRY' is not available on the Basic plan. Allowed: CROP")
// must reach the user verbatim; only genuinely unexplained 403s fall back to
// the generic permission copy.
const PLAN_403_PATTERN = /plan|not available|allowed|farm/i;

/**
 * Pull the human message out of any payload the app hands us:
 *  - axios responses: `{ message }` (already normalized by the interceptor)
 *  - the gateway error envelope: `{ success:false, data|error:{ message } }`
 *    (what RTK Query sees — it bypasses the axios interceptor)
 *  - a bare string body.
 */
function extractServerMessage(payload: unknown): string | undefined {
  if (typeof payload === 'string') return payload.trim() || undefined;
  if (!payload || typeof payload !== 'object') return undefined;
  const body = payload as Record<string, any>;
  if (typeof body.message === 'string' && body.message) return body.message;
  if (body.success === false) {
    const inner = body.data ?? body.error;
    if (typeof inner === 'string' && inner) return inner;
    if (inner && typeof inner.message === 'string' && inner.message) return inner.message;
  }
  // Servers also emit bare `{ error }` / `{ detail }` strings outside the
  // success:false envelope (Express default, validation errors).
  if (typeof body.error === 'string' && body.error) return body.error;
  if (typeof body.detail === 'string' && body.detail) return body.detail;
  return undefined;
}

export function toApiError(error: unknown, fallback = 'Request failed'): ApiErrorShape {
  const err = error as AxiosError<any> | undefined;
  // RTK Query rejects with `{ status, data }` (FetchBaseQueryError) instead of
  // an AxiosError — read the status from whichever shape we were handed.
  const rtk = error as { status?: unknown; data?: unknown; message?: string } | undefined;
  const status =
    err?.response?.status ??
    (typeof rtk?.status === 'number' ? rtk.status : null);
  const code = (err?.code as string | undefined) ?? null;
  const payload = err?.response?.data ?? rtk?.data;
  const rawServerMessage = extractServerMessage(payload);
  const serverMessage = rawServerMessage && !SERVER_MESSAGE_PATTERNS.test(rawServerMessage)
    ? rawServerMessage
    : undefined;

  const message = serverMessage || err?.message || rtk?.message || fallback;
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
    // Plan/entitlement 403s explain which plan or limit blocked the write;
    // keep the generic copy only when the server said nothing actionable.
    const raw = extractServerMessage(
      (error as any)?.response?.data ?? (error as any)?.data
    );
    if (raw && !SERVER_MESSAGE_PATTERNS.test(raw) && PLAN_403_PATTERN.test(raw)) {
      return raw;
    }
    return 'You don\u2019t have permission to do that.';
  }
  if (e.status && e.status >= 500) {
    return 'The server ran into a problem. Please try again in a moment.';
  }
  return e.message || fallback;
}
