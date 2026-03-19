import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, timer } from 'rxjs';
import { map, raceWith } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  method: string;
  executionTime?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface DataWithMessage<T = any> {
  data?: T;
  message?: string;
}

export interface DataWithResults<T = any> {
  results?: T[];
  meta?: any;
}

export interface DataWithMeta<T = any> {
  meta?: any;
  data?: T;
}

export interface RequestWithPagination extends Request {
  pagination?: {
    page: number;
    limit: number;
    skip: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const statusCode = response.statusCode;

    const now = Date.now();

    return next.handle().pipe(
      map((data: T) => ({
        statusCode,
        message: this.getDefaultMessage(statusCode, this.extractMessage(data)),
        data: this.extractData(data),
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        executionTime: `${Date.now() - now}ms`,
      })),
    );
  }

  /**
   * Extrait les données de la réponse
   * Si l'objet a une propriété 'data', on l'utilise, sinon on prend tout l'objet
   */
  private extractData(data: T): T {
    if (!data) return null as T;

    const dataObj = data as DataWithMessage;

    // Si c'est un objet avec une propriété 'data', extraire cette propriété
    if (dataObj.data !== undefined) {
      return dataObj.data as T;
    }

    const dataWithResults = data as DataWithResults;

    // Si l'objet a une propriété 'results' (pour la pagination), garder la structure
    if (dataWithResults.results !== undefined) {
      return data;
    }

    const dataWithMeta = data as DataWithMeta;

    // Si l'objet a une propriété 'meta', garder la structure
    if (dataWithMeta.meta !== undefined) {
      return data;
    }

    return data;
  }

  /**
   * Extrait le message de la réponse
   */
  private extractMessage(data: T): string | undefined {
    if (!data) return undefined;

    const dataObj = data as DataWithMessage;
    if (dataObj.message && typeof dataObj.message === 'string') {
      return dataObj.message;
    }

    return undefined;
  }

  /**
   * Génère un message par défaut basé sur le code HTTP
   */
  private getDefaultMessage(
    statusCode: number,
    customMessage?: string,
  ): string {
    if (customMessage) {
      return customMessage;
    }

    const messages: Record<number, string> = {
      200: 'Opération réussie',
      201: 'Ressource créée avec succès',
      202: 'Requête acceptée',
      204: 'Aucun contenu',
      400: 'Requête invalide',
      401: 'Non authentifié',
      403: 'Accès interdit',
      404: 'Ressource non trouvée',
      409: 'Conflit de données',
      422: 'Données non traitables',
      500: 'Erreur interne du serveur',
    };

    return messages[statusCode] || 'Opération terminée';
  }
}

/**
 * Intercepteur qui exclut les champs sensibles des réponses
 */
@Injectable()
export class ExcludeSensitiveFieldsInterceptor implements NestInterceptor {
  private readonly sensitiveFields = [
    'password',
    'token',
    'secret',
    'creditCard',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(map((data: unknown) => this.excludeSensitiveData(data)));
  }

  private excludeSensitiveData(data: unknown): unknown {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.excludeSensitiveData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const filtered: Record<string, unknown> = {};
      const dataObj = data as Record<string, unknown>;

      for (const [key, value] of Object.entries(dataObj)) {
        if (!this.sensitiveFields.includes(key.toLowerCase())) {
          filtered[key] = this.excludeSensitiveData(value);
        }
      }
      return filtered;
    }

    return data;
  }
}

/**
 * Intercepteur pour la pagination
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithPagination>();
    const query = request.query as { page?: string; limit?: string };
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    // Ajouter les infos de pagination à la requête
    request.pagination = {
      page,
      limit,
      skip: (page - 1) * limit,
    };

    return next.handle().pipe(
      map((data: unknown) => {
        // Si les données ont déjà une structure de pagination, la conserver
        const dataWithMeta = data as DataWithMeta;
        if (dataWithMeta?.meta && dataWithMeta?.data) {
          return data;
        }

        // Si c'est un tableau, ajouter les métadonnées de pagination
        if (Array.isArray(data)) {
          const total = data.length;
          const { page, limit } = request.pagination;

          return {
            data: data.slice((page - 1) * limit, page * limit),
            meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrevious: page > 1,
            },
          };
        }

        return data;
      }),
    );
  }
}

/**
 * Intercepteur pour le cache
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Ajouter des en-têtes de cache pour les requêtes GET
    if (request.method === 'GET') {
      response.setHeader('Cache-Control', 'private, max-age=60');
      response.setHeader('Expires', new Date(Date.now() + 60000).toUTCString());
    }

    return next.handle();
  }
}

/**
 * Intercepteur pour les timeouts
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const timeoutHeader = request.headers['x-timeout'];
    const timeout = timeoutHeader
      ? parseInt(timeoutHeader as string, 10)
      : 30000; // 30 secondes par défaut

    // Implémenter le timeout avec race operator
    return next.handle().pipe(
      raceWith(
        timer(timeout).pipe(
          map(() => {
            throw new RequestTimeoutException(
              `La requête a dépassé le délai d'attente de ${timeout}ms`,
            );
          }),
        ),
      ),
    );
  }
}
