import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
}

@Catch()
export class JsonExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(JsonExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';
    let errorDetails: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        if (responseObj.details) {
          errorDetails = responseObj.details;
        } else if (responseObj.errors) {
          errorDetails = responseObj.errors as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
      };
      this.logger.error('Unexpected error');
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message,
        details: errorDetails,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
    };

    // S'assurer que la réponse est toujours en JSON
    response.setHeader('Content-Type', 'application/json');
    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'INTERNAL_SERVER_ERROR';
  }
}
