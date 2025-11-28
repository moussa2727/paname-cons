import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
    });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      this.logger.log(`Attempting local authentication for email: ${this.maskEmail(email)}`);

      const user = await this.authService.validateUser(email, password);

      if (!user) {
        this.logger.warn(`Authentication failed for email: ${this.maskEmail(email)}`);
        throw new UnauthorizedException("Email ou mot de passe incorrect");
      }

      this.logger.log(`Local authentication successful for user: ${user.email}`);
      return user;
    } catch (error) {
      // 🚨 PROPAGER LES ERREURS SPÉCIFIQUES COMME "COMPTE_DESACTIVE"
      if (error.message === "COMPTE_DESACTIVE") {
        this.logger.warn(`Disabled account attempt: ${this.maskEmail(email)}`);
        throw new UnauthorizedException("COMPTE_DESACTIVE");
      }

      // ✅ AJOUTER UN LOG POUR DIAGNOSTIQUER
      this.logger.error(`LocalStrategy error for ${this.maskEmail(email)}: ${error.message}`, error.stack);

      throw error;
    }
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
  }
}