import {
  Injectable,
  UnauthorizedException,
  Logger,
  ExecutionContext,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.headers.authorization?.replace("Bearer ", "") ||
      request.cookies?.access_token;

    if (err || !user) {
      this.logger.warn(
        `JWT authentication failed: ${info?.message || err?.message}`,
      );

      if (info?.name === "TokenExpiredError") {
        throw new UnauthorizedException(
          "Token expiré - veuillez vous reconnecter",
        );
      }

      if (info?.name === "JsonWebTokenError") {
        throw new UnauthorizedException("Token invalide");
      }

      throw new UnauthorizedException(
        "Accès non autorisé - token invalide ou expiré",
      );
    }

    // ✅ VÉRIFICATION COMPTE ACTIF
    if (!user.isActive) {
      this.logger.warn(`Inactive account attempt: ${user.userId || user.sub}`);
      throw new UnauthorizedException("Compte utilisateur inactif");
    }

    // ✅ VÉRIFICATION MAINTENANCE MODE (si disponible dans user)
    if (user.maintenanceMode && user.role !== "admin") {
      this.logger.warn(
        `Maintenance mode access denied: ${user.userId || user.sub}`,
      );
      throw new UnauthorizedException(
        "Système en maintenance - accès réservé aux administrateurs",
      );
    }

    this.logger.log(
      `JWT authentication successful for user: ${user.userId || user.sub}`,
    );
    return user;
  }
}
