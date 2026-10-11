import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Same-origin endpoint that hands the current access token to the browser so
 * the socket can authenticate its handshake.
 *
 * The access token lives in an HttpOnly cookie, which the browser only sends
 * to this origin. The socket connects straight to the API host (a different
 * origin on Vercel), so the cookie is never attached to the WebSocket
 * handshake — the token has to travel in the handshake's `auth` payload
 * instead. Server-side rendering reads the same cookie, so this does not widen
 * who can obtain it.
 */
export async function GET() {
  const token = (await cookies()).get('accessToken')?.value ?? null;
  return NextResponse.json({ token });
}
