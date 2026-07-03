/**
 * Shared localStorage helpers for all frontend apps.
 * Browser-only — safe to use in 'use client' components.
 */

const ACCESS_TOKEN = 'accessToken';
const REFRESH_TOKEN = 'refreshToken';
const USER_KEY = 'user';
const MFA_KEY = 'mfaSessionToken';

export function getAccessToken(key?: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key ?? ACCESS_TOKEN);
}

export function setAccessToken(token: string, key?: string) {
  localStorage.setItem(key ?? ACCESS_TOKEN, token);
}

export function getRefreshToken(key?: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key ?? REFRESH_TOKEN);
}

export function setRefreshToken(token: string, key?: string) {
  localStorage.setItem(key ?? REFRESH_TOKEN, token);
}

export function getUser<T = any>(key?: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key ?? USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: any, key?: string) {
  localStorage.setItem(key ?? USER_KEY, JSON.stringify(user));
}

export function getMfaToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(MFA_KEY);
}

export function setMfaToken(token: string) {
  localStorage.setItem(MFA_KEY, token);
}

/**
 * Clear all auth-related data from localStorage.
 */
export function clearAllAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(MFA_KEY);
}
