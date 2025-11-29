// local.strategy.ts - VERSION ADAPTÉE
import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { UsersService } from "../../users/users.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService, // ✅ Ajout pour vérification maintenance
  ) {
    super({
      usernameField: "email",
      passwordField: "password",
    });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      this.logger.log(
        `Attempting local authentication for email: ${this.maskEmail(email)}`,
      );

      // ✅ VÉRIFICATION PRÉLIMINAIRE MODE MAINTENANCE
      const isMaintenance = await this.usersService.isMaintenanceMode();
      if (isMaintenance) {
        // Vérifier si l'utilisateur est admin avant même la validation
        const user = await this.usersService.findByEmail(email);
        if (user && user.role !== "admin") {
          this.logger.warn(
            `Maintenance mode - Login blocked: ${this.maskEmail(email)}`,
          );
          throw new UnauthorizedException(
            "Le système est en maintenance. Seuls les administrateurs peuvent se connecter.",
          );
        }
      }

      const user = await this.authService.validateUser(email, password);

      if (!user) {
        this.logger.warn(
          `Authentication failed for email: ${this.maskEmail(email)}`,
        );
        throw new UnauthorizedException("Email ou mot de passe incorrect");
      }

      // ✅ DOUBLE VÉRIFICATION MAINTENANCE (au cas où)
      if (isMaintenance && user.role !== "admin") {
        this.logger.warn(
          `Maintenance mode - Final block: ${this.maskEmail(email)}`,
        );
        throw new UnauthorizedException(
          "Le système est en maintenance. Seuls les administrateurs peuvent se connecter.",
        );
      }

      this.logger.log(
        `Local authentication successful for user: ${user.email}`,
      );
      return user;
    } catch (error) {
      // 🚨 PROPAGATION DES ERREURS SPÉCIFIQUES
      if (error.message === "COMPTE_DESACTIVE") {
        this.logger.warn(`Disabled account attempt: ${this.maskEmail(email)}`);
        throw new UnauthorizedException("COMPTE_DESACTIVE");
      }

      if (error.message.includes("maintenance")) {
        this.logger.warn(
          `Maintenance mode rejection: ${this.maskEmail(email)}`,
        );
        throw error; // Propagation directe
      }

      // ✅ LOG D'ERREUR POUR DIAGNOSTIC
      this.logger.error(
        `LocalStrategy error for ${this.maskEmail(email)}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***@***";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
  }
}
