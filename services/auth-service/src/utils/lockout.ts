/**
 * In-memory MFA lockout tracker.
 * Tracks failed MFA attempts per user and locks them out progressively.
 */

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minute window for attempts

const store = new Map<string, LockoutEntry>();

// Periodic cleanup every 5 minutes
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      store.delete(key);
    }
  }
}, 5 * 60_000);
if (cleanup.unref) cleanup.unref();

/** Check if a user is locked out from MFA */
export function isMFALockedOut(userId: string): { locked: boolean; retryAfter?: number } {
  const entry = store.get(userId);
  if (!entry) return { locked: false };

  if (entry.lockedUntil) {
    const now = Date.now();
    if (now < entry.lockedUntil) {
      return { locked: true, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    // Lockout expired — reset
    store.delete(userId);
    return { locked: false };
  }

  return { locked: false };
}

/** Record a failed MFA attempt */
export function recordMFAFailure(userId: string): { locked: boolean; retryAfter?: number } {
  const entry = store.get(userId) || { attempts: 0, lockedUntil: null };

  entry.attempts++;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    store.set(userId, entry);
    return { locked: true, retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  store.set(userId, entry);
  return { locked: false };
}

/** Reset MFA attempts (on successful verification) */
export function resetMFAAttempts(userId: string): void {
  store.delete(userId);
}

/** Get remaining attempts for a user */
export function getMFAAttemptsRemaining(userId: string): number {
  const entry = store.get(userId);
  if (!entry) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.attempts);
}
