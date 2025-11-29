// jwt.strategy.ts - VERSION ADAPTÉE
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../../users/users.service";
import { Types } from "mongoose";
import { SessionService } from "../session.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private usersService: UsersService,
    private sessionService: SessionService, // ✅ Ajout du SessionService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // ✅ Extraction depuis Authorization header
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
          }
          // ✅ Extraction depuis les cookies
          return request.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true, // ✅ Important pour accéder à la request
    });
  }

  async validate(request: any, payload: any) {
    const token = this.extractTokenFromRequest(request);
    const maskedId = this.maskSensitiveData(payload.sub);

    this.logger.log(`Validation token - User: ${maskedId}`);

    try {
      // ✅ VÉRIFICATION SESSION ACTIVE
      const isTokenActive = await this.sessionService.isTokenActive(token);
      if (!isTokenActive) {
        this.logger.warn(`Session inactive - User: ${maskedId}`);
        throw new UnauthorizedException("Session expirée");
      }

      // ✅ VÉRIFICATION UTILISATEUR
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`User not found - ID: ${maskedId}`);
        throw new UnauthorizedException("Utilisateur non trouvé");
      }

      if (!user.isActive) {
        this.logger.warn(`Inactive account - ID: ${maskedId}`);
        throw new UnauthorizedException("Compte utilisateur inactif");
      }

      // ✅ VÉRIFICATION MODE MAINTENANCE
      const isMaintenance = await this.usersService.isMaintenanceMode();
      if (isMaintenance && user.role !== "admin") {
        this.logger.warn(`Maintenance mode - Access denied: ${maskedId}`);
        throw new UnauthorizedException("Système en maintenance");
      }

      // ✅ MISE À JOUR ACTIVITÉ SESSION
      await this.sessionService.updateSessionActivity(token);

      this.logger.log(`User validated - ID: ${maskedId}, Role: ${user.role}`);

      // ✅ RETOUR DONNÉES UTILISATEUR
      return {
        sub: (user._id as Types.ObjectId).toString(),
        userId: (user._id as Types.ObjectId).toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        firstName: user.firstName,
        lastName: user.lastName,
        telephone: user.telephone,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Validation error: ${error.message}`);
      throw new UnauthorizedException("Token invalide");
    }
  }

  private extractTokenFromRequest(request: any): string {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return request.cookies?.access_token || "";
  }

  private maskSensitiveData(data: string): string {
    if (!data || data.length < 8) return "***";
    return data.substring(0, 4) + "***" + data.substring(data.length - 4);
  }
}
