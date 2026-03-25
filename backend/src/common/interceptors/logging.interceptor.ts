import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('EXCEPTION');

  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      catchError((error: unknown) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        // Log de l'erreur - format simplifié
        this.logger.error(
          `${method} ${originalUrl} -> ${statusCode} (${duration}ms)`,
        );

        // Ne pas propager l'erreur si elle est déjà gérée
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Pour les erreurs non gérées, créer une réponse d'erreur standard
        const errorResponse: ErrorResponse = {
          statusCode: 500,
          message: 'Internal Server Error',
          timestamp: new Date().toISOString(),
          path: originalUrl,
        };

        return throwError(() => errorResponse);
      }),
    );
  }
}
