import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const isAuthPage = pathname.startsWith('/(auth)/login') || pathname.startsWith('/(auth)/mfa') || pathname.startsWith('/(auth)/register');

  // If accessing auth pages while authenticated, redirect to home
  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not on auth pages and no token, redirect to login
  if (!isAuthPage && !accessToken) {
    return NextResponse.redirect(new URL('/(auth)/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|public).*)',
  ],
};
