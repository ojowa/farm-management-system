import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*', '/api/:path*', '/platform-:path*'],
};
