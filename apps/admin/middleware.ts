import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/mfa') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');
  const isPublicPage = pathname === '/';

  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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
