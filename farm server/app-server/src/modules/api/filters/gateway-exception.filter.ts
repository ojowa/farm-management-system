import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        errors = Array.isArray(resp.message) ? resp.message : undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const requestId = request.headers['x-request-id'];

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message: Array.isArray(message) ? message[0] : message,
        errors: errors || (Array.isArray(message) ? message : undefined),
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    });
  }
}
