import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const startTime = Date.now();
    try {
      const user = await this.authService.validateUser(email, password);

      if (!user) {
        const duration = Date.now() - startTime;
        this.logger.warn(`POST /auth/login -> 401 (${duration}ms)`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      const duration = Date.now() - startTime;
      this.logger.log(`POST /auth/login -> 200 (${duration}ms)`);
      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`POST /auth/login -> 500 (${duration}ms)`);
      throw error;
    }
  }
}
