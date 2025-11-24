import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
    });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      const user = await this.authService.validateUser(email, password);

      if (!user) {
        throw new UnauthorizedException("Email ou mot de passe incorrect");
      }

      return user;
    } catch (error) {
      // 🚨 PROPAGER LES ERREURS SPÉCIFIQUES COMME "COMPTE_DESACTIVE"
      if (error.message === "COMPTE_DESACTIVE") {
        throw new UnauthorizedException("COMPTE_DESACTIVE");
      }

      // ✅ AJOUTER UN LOG POUR DIAGNOSTIQUER
      console.error("❌ Erreur LocalStrategy:", error.message);
      console.error("❌ Stack:", error.stack);

      throw error;
    }
  }
}
