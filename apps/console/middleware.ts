import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('console_accessToken')?.value;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/(auth)');
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
