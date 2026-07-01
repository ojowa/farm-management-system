import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/mfa') || pathname.startsWith('/register');
  const isPublicPage = pathname === '/';

  // If accessing auth pages while authenticated, redirect to dashboard
  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If not on auth/public pages and no token, redirect to login
  if (!isAuthPage && !isPublicPage && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|public).*)',
  ],
};
