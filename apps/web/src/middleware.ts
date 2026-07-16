import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // Pass all requests through — the API gateway validates JWTs on every
  // proxied request, and the client-side AuthProvider manages auth state.
  // We cannot check cookies here because the accessToken cookie is set by
  // the API gateway on port 4000, while this middleware runs on port 3000;
  // browsers scope cookies to the exact host that set them.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
