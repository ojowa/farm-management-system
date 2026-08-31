import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuditLogEntry {
  timestamp: string;
  requestId: string;
  userId?: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  duration: number;
  action: string;
  targetType?: string;
  targetId?: string;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const entry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          requestId: request.headers['x-request-id'] || 'unknown',
          userId: request.verifiedUser?.id || undefined,
          method: request.method,
          path: request.url,
          statusCode: response.statusCode,
          userAgent: request.headers['user-agent'],
          ip: request.ip || request.connection?.remoteAddress,
          duration,
          action: this.mapRouteToAction(request.method, request.url),
          targetType: this.extractTargetType(request.url),
          targetId: this.extractTargetId(request),
        };

        if (response.statusCode >= 400) {
          this.logger.warn(JSON.stringify(entry));
        } else {
          this.logger.log(JSON.stringify(entry));
        }
      }),
    );
  }

  private mapRouteToAction(method: string, path: string): string {
    return `${method.toLowerCase()}.${path.split('/')[1] || 'root'}`;
  }

  private extractTargetType(path: string): string | undefined {
    const segments = path.split('/');
    if (segments.includes('users')) return 'user';
    if (segments.includes('farms')) return 'farm';
    if (segments.includes('crops')) return 'crop';
    if (segments.includes('livestock')) return 'livestock';
    if (segments.includes('workers')) return 'worker';
    if (segments.includes('expenses')) return 'expense';
    return undefined;
  }

  private extractTargetId(request: any): string | undefined {
    return request.params?.id || undefined;
  }
}
