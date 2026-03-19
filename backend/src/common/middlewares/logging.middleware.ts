import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RequestWithTiming extends Request {
  startTime?: number;
}

interface HeadersDictionary {
  [key: string]: string | string[] | undefined;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  constructor(private configService: ConfigService) {}

  use(req: RequestWithTiming, res: Response, next: NextFunction): void {
    req.startTime = Date.now();
    const { method, originalUrl } = req;

    // Masquer les données sensibles dans l'URL pour les logs
    const sanitizedUrl = this.sanitizeUrl(originalUrl);

    // Log de la requête entrante - format simplifié
    this.logger.log(`${method} ${sanitizedUrl}`);

    // Intercepter la réponse pour logger le résultat
    const originalSend = res.send;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalEnd = res.end;

    // Logger les réponses avec res.send

    res.send = (body: any): any => {
      const endTime = Date.now();
      const duration = endTime - (req.startTime || endTime);
      const statusCode = res.statusCode;

      // Log de la réponse sortante - format simplifié avec URL masquée
      this.logger.log(
        `${method} ${sanitizedUrl} -> ${statusCode} (${duration}ms)`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalSend.call(res, body);
    };

    // Logger les réponses sans body (res.end)

    res.end = (chunk?: any, encoding?: any, cb?: any): any => {
      const endTime = Date.now();
      const duration = endTime - (req.startTime || endTime);
      const statusCode = res.statusCode;

      // Log de la réponse sortante - format simplifié avec URL masquée
      this.logger.log(
        `${method} ${sanitizedUrl} -> ${statusCode} (${duration}ms)`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalEnd.call(res, chunk, encoding, cb);
    };

    next();
  }

  private sanitizeUrl(url: string): string {
    // Masquer les emails dans les URLs
    // Pattern: /api/procedures/email@domain.com -> /api/procedures/[EMAIL]
    let sanitized = url.replace(
      /\/api\/procedures\/[^/\s@]+@[^\\/\s@]+\.[^/\s@]+/g,
      '/api/procedures/[EMAIL]',
    );

    // Masquer les IDs dans les URLs
    // Pattern: /api/rendezvous/by-email/abc123 -> /api/rendezvous/by-email/[EMAIL]
    sanitized = sanitized.replace(/\/by-email\/[^/\s]+/g, '/by-email/[EMAIL]');

    // Masquer les IDs UUID ou autres identifiants
    // Pattern: /api/procedures/550e8400-e29b-41d4-a716-446655440000 -> /api/procedures/[ID]
    sanitized = sanitized.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/[ID]',
    );

    // Masquer les IDs numériques dans les paramètres
    // Pattern: /api/rendezvous/12345 -> /api/rendezvous/[ID]
    sanitized = sanitized.replace(/\/\d+(?=\/|$)/g, '/[ID]');

    return sanitized;
  }

  private sanitizeBody(
    body: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!body) return null;

    // Masquer les données sensibles dans le body
    if (typeof body === 'object') {
      const sanitized: Record<string, unknown> = { ...body };
      const sensitiveFields = [
        'password',
        'token',
        'refresh_token',
        'access_token',
        'email',
        'firstName',
        'lastName',
        'nom',
        'prenom',
        'message',
      ];

      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '***MASKED***';
        }
      });

      return sanitized;
    }

    return null;
  }

  private getStatusDescription(statusCode: number): string {
    const statusMap: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusMap[statusCode] || 'Unknown';
  }

  private sanitizeHeaders(headers: HeadersDictionary): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // Masquer les headers sensibles
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-forwarded-for',
      'x-real-ip',
    ];

    Object.keys(headers).forEach((key) => {
      const value = headers[key];
      if (typeof value === 'string') {
        if (sensitiveHeaders.includes(key)) {
          sanitized[key] = '***MASKED***';
        } else {
          sanitized[key] = value;
        }
      }
    });

    return sanitized;
  }
}
