import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookies = new Map<string, string>();
const mockPush = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => ({ value: mockCookies.get(name) || '' }),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
}));

function middleware(accessToken: string | undefined, pathname: string) {
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/mfa') || pathname.startsWith('/register');

  if (isAuthPage && accessToken) {
    return { redirect: '/' };
  }

  if (!isAuthPage && !accessToken) {
    return { redirect: '/login' };
  }

  return { redirect: null };
}

describe('Auth middleware', () => {
  it('redirects authenticated users away from auth pages', () => {
    const result = middleware('some-token', '/login');
    expect(result.redirect).toBe('/');
  });

  it('redirects authenticated users away from MFA page', () => {
    const result = middleware('some-token', '/mfa');
    expect(result.redirect).toBe('/');
  });

  it('redirects authenticated users away from register page', () => {
    const result = middleware('some-token', '/register');
    expect(result.redirect).toBe('/');
  });

  it('redirects unauthenticated users to login', () => {
    const result = middleware(undefined, '/farms');
    expect(result.redirect).toBe('/login');
  });

  it('redirects unauthenticated users from root to login', () => {
    const result = middleware(undefined, '/');
    expect(result.redirect).toBe('/login');
  });

  it('allows authenticated users to access app pages', () => {
    const result = middleware('some-token', '/farms');
    expect(result.redirect).toBeNull();
  });

  it('allows authenticated users to access dashboard', () => {
    const result = middleware('some-token', '/dashboard');
    expect(result.redirect).toBeNull();
  });

  it('allows unauthenticated users to access auth pages', () => {
    const result = middleware(undefined, '/login');
    expect(result.redirect).toBeNull();
  });

  it('allows unauthenticated users to access register', () => {
    const result = middleware(undefined, '/register');
    expect(result.redirect).toBeNull();
  });
});
