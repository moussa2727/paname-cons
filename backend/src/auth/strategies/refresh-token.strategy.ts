import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPayload } from '../dto';
import { RefreshTokenRepository } from '../../tokens/refresh-token.repository';
import { CurrentUser } from '../../interfaces/current-user.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(RefreshTokenStrategy.name);

  constructor(
    configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        RefreshTokenStrategy.extractJWTFromCookie,
        ExtractJwt.fromBodyField('refresh_token'),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  private static extractJWTFromCookie(this: void, req: Request): string | null {
    const cookies = req.cookies as { refresh_token?: string } | undefined;
    if (cookies?.refresh_token) {
      return cookies.refresh_token;
    }
    return null;
  }

  async validate(req: Request, payload: TokenPayload): Promise<CurrentUser> {
    const startTime = Date.now();
    try {
      this.logger.log('POST /auth/refresh -> validating token');

      const cookies = (req.cookies as { refresh_token?: string }) || {};
      const body = req.body as { refresh_token?: string } | undefined;
      const refreshToken: string | undefined =
        body?.refresh_token || cookies.refresh_token;

      if (!refreshToken) {
        const duration = Date.now() - startTime;
        this.logger.warn(
          `POST /auth/refresh -> 401 (${duration}ms): no refresh token`,
        );
        throw new UnauthorizedException('Refresh token manquant');
      }

      const tokenDoc =
        await this.refreshTokenRepository.findValidToken(refreshToken);

      if (!tokenDoc || tokenDoc.userId !== payload.sub) {
        const duration = Date.now() - startTime;
        this.logger.warn(
          `POST /auth/refresh -> 401 (${duration}ms): invalid token`,
        );
        throw new UnauthorizedException('Refresh token invalide');
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `POST /auth/refresh -> 200 (${duration}ms): token validated`,
      );

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: '', // Non disponible dans le payload JWT
        lastName: '', // Non disponible dans le payload JWT
        isActive: true, // Les tokens refresh sont seulement pour les utilisateurs actifs
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CurrentUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`POST /auth/refresh -> 500 (${duration}ms)`);
      throw error;
    }
  }
}
