// Centralized, detailed audit logging for every console auth touchpoint.
// Prefix: [AuthAudit] — grep this to trace the full console auth lifecycle.

export type AuthAuditEvent =
  | 'BOOT'
  | 'REQ_START'
  | 'REQ_SUCCESS'
  | 'REQ_FAIL'
  | 'COOKIE_STATE'
  | 'TOKEN_REFRESH_START'
  | 'TOKEN_REFRESH_OK'
  | 'TOKEN_REFRESH_FAIL'
  | 'FETCH_USER_START'
  | 'FETCH_USER_OK'
  | 'FETCH_USER_DENIED'
  | 'FETCH_USER_TRANSIENT'
  | 'LOGIN_START'
  | 'LOGIN_RESPONSE'
  | 'LOGIN_OK'
  | 'LOGIN_MFA_REQUIRED'
  | 'LOGIN_DENIED'
  | 'LOGIN_FAIL'
  | 'MFA_START'
  | 'MFA_OK'
  | 'MFA_FAIL'
  | 'LOGOUT_START'
  | 'LOGOUT_OK'
  | 'IDLE_TIMEOUT'
  | 'STATE_CHANGE';

function ts(): string {
  return new Date().toISOString();
}

// Read document cookies safely (never throws, returns parsed map).
function readCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const out: Record<string, string> = {};
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

// Describe which auth cookies are present WITHOUT leaking token values.
function cookieSnapshot(): Record<string, { present: boolean; length: number }> {
  const c = readCookies();
  const keys = ['accessToken', 'refreshToken'];
  const snap: Record<string, { present: boolean; length: number }> = {};
  for (const k of keys) {
    snap[k] = { present: !!c[k], length: c[k] ? c[k].length : 0 };
  }
  return snap;
}

export function authAudit(
  event: AuthAuditEvent,
  detail?: Record<string, unknown>,
): void {
  const entry = {
    t: ts(),
    event,
    cookies: cookieSnapshot(),
    ...(detail || {}),
  };
  // eslint-disable-next-line no-console
  console.log('[AuthAudit]', JSON.stringify(entry));
}
