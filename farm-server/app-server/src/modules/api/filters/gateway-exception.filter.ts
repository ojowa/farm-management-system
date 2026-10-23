import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { handleError } from '@farm/utils';

@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GatewayExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        code = resp.code;
        errors = Array.isArray(resp.message) ? resp.message : undefined;
      }
    } else if (exception instanceof Error) {
      // S1: map non-HttpException errors through shared handler so Prisma
      // failures become proper client errors (P2002 → 409, P2025 → 404,
      // P2003 → 400) and raw database text never reaches the client.
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

    const requestId = request.headers['x-request-id'];

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message: Array.isArray(message) ? message[0] : message,
        errors: errors || (Array.isArray(message) ? message : undefined),
        ...(code ? { code } : {}),
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    });
  }
}
