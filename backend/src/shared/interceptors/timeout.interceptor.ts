import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly defaultTimeout = 30000; // 30 secondes

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // ✅ VÉRIFICATIONS DE SÉCURITÉ CONTRE LES UNDEFINED
    const method = request?.method || "UNKNOWN";
    const url = request?.url || "/unknown";
    const ip = request?.ip || request?.connection?.remoteAddress || "unknown";

    this.logger.debug(`⏱️ Timeout configuré pour ${method} ${url} - IP: ${ip}`);

    return next.handle().pipe(
      timeout(this.defaultTimeout),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.warn(
            `⌛ Timeout dépassé après ${this.defaultTimeout}ms pour ${method} ${url}`,
          );

          return throwError(
            () =>
              new RequestTimeoutException(
                `La requête a dépassé le temps d'attente de ${this.defaultTimeout}ms. Veuillez réessayer.`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
