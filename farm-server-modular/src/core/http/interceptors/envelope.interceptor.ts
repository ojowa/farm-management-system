import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/** Paths the old gateway served itself (NOT reverse-proxied), so they
 *  returned raw payloads. Everything else was proxied and envelope-wrapped —
 *  clients' `unwrapEnvelope` depends on that shape.
 *  Note `/health/livestock/...` etc. WERE proxied (and wrapped), so health
 *  is matched exactly, while weather/docs/realtime are prefix-matched. */
const RAW_PATHS = new Set([
  '/health',
  '/health/ready',
  '/health/live',
  '/health/routes',
  // Paystack expects a plain ack, not the client envelope.
  '/payments/webhook',
]);
const RAW_PATH_PREFIXES = ['/weather', '/docs', '/realtime'];

function isRawPath(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0].replace(/^\/v1(?=\/|$)/, '');
  return (
    RAW_PATHS.has(path) ||
    RAW_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
  );
}

/**
 * Replicates the old API gateway's response envelope:
 * `{ success, data, timestamp, requestId }`.
 *
 * The shared api-client (`unwrapEnvelope`) strips this shape on the client,
 * so keeping it here means no client changes when moving from gateway +
 * services to a single modular-monolith process.
 *
 * Skips:
 *  - paths the old gateway served directly (health, weather, docs, realtime)
 *    which historically had no envelope;
 *  - responses already sent by a controller (streamed file downloads use
 *    `@Res()` and pipe to the socket themselves).
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = request.headers['x-request-id'];

    if (isRawPath(request.originalUrl || request.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Controllers that took over the response (streams/attachments)
        // already wrote to the socket; hand the value through untouched.
        if (response.headersSent) {
          return data;
        }
        return {
          success: true,
          // null (not undefined → dropped by JSON.stringify) so the envelope
          // always carries a `data` key and unwraps cleanly on the client,
          // e.g. for DELETE endpoints returning void (HTTP 204).
          data: data === undefined ? null : data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}