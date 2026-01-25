import {
  Injectable,
  UnauthorizedException,
  Logger,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthConstants } from '../../auth/auth.constants';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    if (err || !user) {
      const errorMessage = info?.message || 'Authentification échouée';

      this.logger.warn(`Token JWT invalide ou expiré: ${errorMessage}`);

      throw new UnauthorizedException({
        message: 'Session invalide ou expirée',
        details: errorMessage,
      });
    }

    // CORRECTION : Ne vérifier isActive que si le champ existe
    // isActive peut être undefined si non inclus dans le token
    if (user.isActive === false) {
      this.logger.warn(
        `Tentative d'accès avec compte inactif: ${this.maskUserId(user.sub || user.id)}`
      );
      throw new UnauthorizedException({
        message: 'Compte utilisateur inactif',
        code: AuthConstants.ERROR_MESSAGES.COMPTE_DESACTIVE,
        requiresAdmin: true,
      });
    }

    // Alternative : considérer undefined comme actif
    // const isActive = user.isActive !== undefined ? user.isActive : true;
    // if (!isActive) { ... }

    if (user.tokenType && user.tokenType !== 'access') {
      this.logger.warn(
        `Tentative d'accès avec mauvais type de token: ${user.tokenType}`
      );
      throw new UnauthorizedException({
        message: 'Type de token invalide',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    this.logger.debug(
      `Utilisateur authentifié: ${this.maskUserId(user.sub || user.id)} (role: ${user.role})`
    );

    return user;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const token =
        request.headers.authorization?.split(' ')[1] ||
        request.cookies?.access_token;

      if (!token) {
        this.logger.warn("Tentative d'accès sans token JWT");
        throw new UnauthorizedException("Token d'authentification manquant");
      }

      this.logger.debug(`Validation du token JWT: ${this.maskToken(token)}`);

      if (process.env.NODE_ENV === 'development') {
        try {
          const decoded = jwt.decode(token);
          this.logger.debug(
            `Token décodé: ${JSON.stringify(decoded, null, 2)}`
          );
        } catch (decodeErr) {
          this.logger.debug(
            `Impossible de décoder le token: ${decodeErr.message}`
          );
        }
      }

      const result = await super.canActivate(context);

      return result as boolean;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la validation JWT: ${error.message}`,
        error.stack
      );

      if (error.message === 'Compte utilisateur inactif') {
        const httpRequest = context.switchToHttp().getRequest();
        this.logger.error(`Détails erreur isActive:`, {
          token: this.maskToken(
            httpRequest.headers.authorization?.split(' ')[1]
          ),
          user: error.user || 'non disponible',
        });
      }

      throw error;
    }
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
  }

  private maskUserId(userId: string | undefined): string {
    if (!userId) return 'user_***';
    if (userId.length <= 8) return userId;
    return `${userId.substring(0, 4)}***${userId.substring(userId.length - 4)}`;
  }
}
