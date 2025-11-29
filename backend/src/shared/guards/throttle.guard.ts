import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly logger = new Logger(ThrottleGuard.name);
  private readonly loginAttempts = new Map<
    string,
    {
      attempts: number;
      lastAttempt: Date;
      ttl: Date;
    }
  >();

  private readonly MAX_ATTEMPTS = 5;
  private readonly TIME_WINDOW_MINUTES = 15;
  private readonly BLOCK_DURATION_MINUTES = 30;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email } = request.body;

    if (!email) {
      this.logger.warn("ThrottleGuard: Missing email in request");
      throw new HttpException(
        "Email requis pour la limitation de débit",
        HttpStatus.BAD_REQUEST,
      );
    }

    const key = email.toLowerCase().trim();
    const attempts = this.getLoginAttempts(key);
    const now = new Date();

    const timeSinceLastAttempt = attempts.lastAttempt
      ? (now.getTime() - attempts.lastAttempt.getTime()) / (1000 * 60)
      : 999; // en minutes

    // ✅ VÉRIFICATION TENTATIVES EXCESSIVES
    if (attempts.attempts >= this.MAX_ATTEMPTS) {
      // ✅ SI DANS LA FENÊTRE DE TEMPS, BLOQUER
      if (timeSinceLastAttempt < this.TIME_WINDOW_MINUTES) {
        const remainingTime = Math.ceil(
          this.TIME_WINDOW_MINUTES - timeSinceLastAttempt,
        );

        this.logger.warn(
          `ThrottleGuard: Too many attempts for ${this.maskEmail(key)} - ${attempts.attempts} attempts`,
        );

        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            error: "Trop de tentatives de connexion",
            message: `Veuillez réessayer dans ${remainingTime} minutes`,
            retryAfter: `${remainingTime} minutes`,
            attempts: attempts.attempts,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        // ✅ RÉINITIALISER SI LA FENÊTRE DE TEMPS EST DÉPASSÉE
        this.resetLoginAttempts(key);
      }
    }

    // ✅ RÉINITIALISER LE COMPTEUR SI LA DERNIÈRE TENTATIVE DATE DE PLUS DE 30 MINUTES
    if (timeSinceLastAttempt >= this.BLOCK_DURATION_MINUTES) {
      this.resetLoginAttempts(key);
    }

    this.incrementLoginAttempts(key);

    this.logger.debug(
      `ThrottleGuard: Attempt ${attempts.attempts + 1} for ${this.maskEmail(key)}`,
    );

    return true;
  }

  private getLoginAttempts(email: string): {
    attempts: number;
    lastAttempt: Date;
  } {
    this.cleanupExpiredAttempts();
    const data = this.loginAttempts.get(email);
    return data
      ? {
          attempts: data.attempts,
          lastAttempt: data.lastAttempt,
        }
      : { attempts: 0, lastAttempt: new Date(0) };
  }

  private incrementLoginAttempts(email: string): void {
    const current = this.loginAttempts.get(email) || {
      attempts: 0,
      lastAttempt: new Date(0),
      ttl: new Date(),
    };

    current.attempts++;
    current.lastAttempt = new Date();
    current.ttl = new Date(
      Date.now() + this.BLOCK_DURATION_MINUTES * 60 * 1000,
    );

    this.loginAttempts.set(email, current);
  }

  private resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
    this.logger.debug(
      `ThrottleGuard: Reset attempts for ${this.maskEmail(email)}`,
    );
  }

  private cleanupExpiredAttempts(): void {
    const now = new Date();
    for (const [email, data] of this.loginAttempts.entries()) {
      if (data.ttl < now) {
        this.loginAttempts.delete(email);
        this.logger.debug(
          `ThrottleGuard: Cleaned expired attempts for ${this.maskEmail(email)}`,
        );
      }
    }
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***@***";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
  }

  // ✅ MÉTHODE UTILITAIRE POUR RÉINITIALISER (UTILE POUR LES TESTS)
  public clearAllAttempts(): void {
    this.loginAttempts.clear();
    this.logger.log("ThrottleGuard: All attempts cleared");
  }
}
