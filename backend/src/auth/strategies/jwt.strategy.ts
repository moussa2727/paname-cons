import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPayload } from '../dto';
import { UsersService } from '../../users/users.service';
import { CurrentUser } from '../../interfaces/current-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWTFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET,
    });
  }

  private static extractJWTFromCookie(this: void, req: Request): string | null {
    const cookies = req.cookies as { access_token?: string } | undefined;
    if (cookies?.access_token) {
      return cookies.access_token;
    }
    return null;
  }

  async validate(payload: TokenPayload): Promise<CurrentUser> {
    const startTime = Date.now();
    try {
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        const duration = Date.now() - startTime;
        this.logger.warn(`GET /api/user/profile -> 401 (${duration}ms)`);
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      if (!user.isActive) {
        const duration = Date.now() - startTime;
        this.logger.warn(`GET /api/user/profile -> 401 (${duration}ms)`);
        throw new UnauthorizedException('Compte désactivé');
      }

      if (user.logoutUntil && new Date() < user.logoutUntil) {
        const duration = Date.now() - startTime;
        this.logger.warn(`GET /api/user/profile -> 401 (${duration}ms)`);
        throw new UnauthorizedException('Compte temporairement verrouillé');
      }

      const duration = Date.now() - startTime;
      this.logger.log(`GET /api/user/profile -> 200 (${duration}ms)`);
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } as CurrentUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`GET /api/user/profile -> 500 (${duration}ms)`);
      throw error;
    }
  }
}
