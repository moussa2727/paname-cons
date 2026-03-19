import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    const errorMessage =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as { message?: string }).message || exception.message;

    const errorCode =
      typeof errorResponse === 'object' &&
      (errorResponse as { errorCode?: string }).errorCode
        ? (errorResponse as { errorCode?: string }).errorCode
        : this.getErrorCodeFromStatus(status);

    // Log les erreurs 4xx et 5xx - format simplifié
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}`);
    }

    response.status(status).json({
      statusCode: status,
      message: errorMessage,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status as HttpStatus) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'HTTP_ERROR';
    }
  }
}
