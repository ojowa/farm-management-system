import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { handleError } from '@farm/utils';

/**
 * Single error shape for the whole server:
 *
 *   { success:false,
 *     data:  { statusCode, message, errors?, code?, timestamp, path },
 *     error: <same payload>,      // legacy gateway key — clients read either
 *     timestamp, requestId }
 *
 * The old topology produced two shapes (gateway errors used `error`,
 * proxied-downstream errors used `data`); the shared api-client normalizes
 * `data ?? error`, and other consumers may read only one of the two — so we
 * emit both keys with identical content. `data`/`error` are also what
 * `unwrapEnvelope` on the client leaves untouched (success is false).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message ?? message;
        code = resp.code;
      }
    } else if (exception instanceof Error) {
      // S1: every non-HttpException error goes through the shared mapper so
      // Prisma failures become proper client errors (P2002 → 409,
      // P2025 → 404, P2003 → 400, PrismaClientValidationError → 400) and raw
      // database/driver text never reaches the client — unknown errors are
      // collapsed to a sanitized "Internal Server Error" (still logged here).
      const handled = handleError(exception);
      status = handled.statusCode;
      message = handled.message;
      code = handled.code;
      if (status >= 500) {
        this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      } else {
        this.logger.warn(`Request failed (${status}${code ? `/${code}` : ''}): ${exception.message}`);
      }
    } else if (exception) {
      const handled = handleError(exception);
      status = handled.statusCode;
      message = handled.message;
      code = handled.code;
    }

    const errors = Array.isArray(message) ? message : undefined;
    const payload = {
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      ...(errors ? { errors } : {}),
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: request?.url,
    };

    response.status(status).json({
      success: false,
      data: payload,
      error: payload,
      timestamp: new Date().toISOString(),
      requestId: request?.headers?.['x-request-id'],
    });
  }
}
