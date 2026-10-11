import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// /auth/* must stay public: the login/refresh calls are proxied to the API
// here, and the cookie they return is what this middleware guards on. Gate them
// and the request is redirected before it ever reaches the API.
//
// /v1/* and /api/* are the proxied API namespaces. They must stay public too,
// otherwise an unauthenticated XHR gets a 307 to /login and the client receives
// the login HTML where it expected JSON. The API enforces authentication; this
// middleware only handles the page-navigation case.
const PUBLIC_PATHS = ['/login', '/register', '/auth', '/v1', '/api', '/platform-', '/realtime-token'];

// Static files served from /public (manifest.json, favicon, fonts, icons, …)
// must not be bounced to the login screen — the browser expects JSON/SVG, not
// the login HTML.
const PUBLIC_FILE = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
