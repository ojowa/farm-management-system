import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TimeoutInterceptor');
  private readonly defaultTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const timeout = parseInt(request.headers['x-timeout'], 10) || this.defaultTimeout;

    return new Observable((subscriber) => {
      const timer = setTimeout(() => {
        subscriber.error(new Error('Request timeout'));
      }, timeout);

      next.handle().subscribe({
        next: (value) => {
          clearTimeout(timer);
          subscriber.next(value);
          subscriber.complete();
        },
        error: (err) => {
          clearTimeout(timer);
          subscriber.error(err);
        },
        complete: () => {
          clearTimeout(timer);
          subscriber.complete();
        },
      });
    });
  }
}
