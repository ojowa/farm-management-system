/**
 * Shared cookie helpers for all frontend apps.
 * Browser-only — safe to use in 'use client' components.
 */

export function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  opts?: { accessDays?: number; refreshDays?: number; prefix?: string },
) {
  const prefix = opts?.prefix ?? '';
  setCookie(`${prefix}accessToken`, accessToken, opts?.accessDays ?? 1);
  setCookie(`${prefix}refreshToken`, refreshToken, opts?.refreshDays ?? 7);
}

export function clearAuthCookies(prefix?: string) {
  deleteCookie(`${prefix ?? ''}accessToken`);
  deleteCookie(`${prefix ?? ''}refreshToken`);
}
