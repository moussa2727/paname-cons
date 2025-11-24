import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly loginAttempts = new Map<
    string,
    {
      attempts: number;
      lastAttempt: Date;
      ttl: Date;
    }
  >();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email } = request.body;

    if (!email) {
      throw new HttpException(
        "Email is required for rate limiting",
        HttpStatus.BAD_REQUEST,
      );
    }

    const key = email;
    const attempts = this.getLoginAttempts(key);
    const now = new Date();
    const timeSinceLastAttempt = attempts.lastAttempt
      ? (now.getTime() - attempts.lastAttempt.getTime()) / (1000 * 60)
      : 999; // en minutes

    // Si plus de 5 tentatives dans les dernières 15 minutes
    if (attempts.attempts >= 5 && timeSinceLastAttempt < 15) {
      const remainingTime = Math.ceil(15 - timeSinceLastAttempt);
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too many login attempts",
          message: `Please try again in ${remainingTime} minutes`,
          retryAfter: `${remainingTime} minutes`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Réinitialiser le compteur si la dernière tentative date de plus de 15 minutes
    if (timeSinceLastAttempt >= 15) {
      this.resetLoginAttempts(key);
    }

    this.incrementLoginAttempts(key);
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
    current.ttl = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    this.loginAttempts.set(email, current);
  }

  private resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  private cleanupExpiredAttempts(): void {
    const now = new Date();
    for (const [email, data] of this.loginAttempts.entries()) {
      if (data.ttl < now) {
        this.loginAttempts.delete(email);
      }
    }
  }
}
