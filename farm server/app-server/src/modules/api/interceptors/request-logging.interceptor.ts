import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestLogging');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userId = request.verifiedUser?.id || 'anonymous';
    const requestId = request.headers['x-request-id'];
    const start = Date.now();

    this.logger.debug(`Incoming: ${method} ${url} user=${userId} requestId=${requestId || 'none'}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          this.logger.log(`${method} ${url} ${response.statusCode} ${duration}ms user=${userId}`);
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(`${method} ${url} ERROR ${duration}ms user=${userId}: ${error.message}`);
        },
      }),
    );
  }
}
