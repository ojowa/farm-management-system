/**
 * AsyncStorage-based storage helpers for React Native (mobile app).
 * This module provides the same API as the browser storage.ts but uses
 * AsyncStorage for persistence.
 *
 * IMPORTANT: This is a separate entry point (@farm/auth/rn) so it doesn't
 * pull in React Native dependencies for web apps.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const MFA_KEY = 'mfaSessionToken';

/**
 * AsyncStorage-like interface. The actual AsyncStorage from
 * @react-native-async-storage/async-storage will be injected at runtime.
 * We define a minimal interface here to avoid a hard dependency.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

let storage: StorageAdapter | null = null;

/**
 * Initialize the storage adapter with AsyncStorage.
 * Must be called once at app startup (e.g. in App.tsx).
 */
export function initRNStorage(adapter: StorageAdapter) {
  storage = adapter;
}

function assertStorage(): StorageAdapter {
  if (!storage) {
    throw new Error(
      '[farm/auth] AsyncStorage not initialized. Call initRNStorage() at app startup.',
    );
  }
  return storage;
}

// ── Token helpers ──────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  return assertStorage().getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  return assertStorage().setItem(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return assertStorage().getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  return assertStorage().setItem(REFRESH_TOKEN_KEY, token);
}

export async function getUser<T = any>(key?: string): Promise<T | null> {
  const raw = await assertStorage().getItem(key ?? USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setUser(user: any, key?: string): Promise<void> {
  return assertStorage().setItem(key ?? USER_KEY, JSON.stringify(user));
}

export async function getMfaToken(): Promise<string | null> {
  return assertStorage().getItem(MFA_KEY);
}

export async function setMfaToken(token: string): Promise<void> {
  return assertStorage().setItem(MFA_KEY, token);
}

/**
 * Clear all auth-related data from AsyncStorage.
 */
export async function clearAllAuthStorage(
  extraKeys: string[] = [],
): Promise<void> {
  const s = assertStorage();
  const keys = [
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_KEY,
    MFA_KEY,
    ...extraKeys,
  ];
  try {
    await s.multiRemove(keys);
  } catch {
    // best-effort
  }
}

// ── Convenience: save both tokens + user in one call ───────────────────

export async function saveAuthTokens(payload: {
  accessToken: string;
  refreshToken?: string;
  user?: any;
}): Promise<void> {
  const s = assertStorage();
  const ops: Promise<void>[] = [s.setItem(ACCESS_TOKEN_KEY, payload.accessToken)];
  if (payload.refreshToken) {
    ops.push(s.setItem(REFRESH_TOKEN_KEY, payload.refreshToken));
  }
  if (payload.user) {
    ops.push(s.setItem(USER_KEY, JSON.stringify(payload.user)));
  }
  await Promise.all(ops);
}

// ── Re-export shared constants ─────────────────────────────────────────

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  MFA_KEY,
};
