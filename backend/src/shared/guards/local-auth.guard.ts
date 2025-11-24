// local-auth.guard.ts - VERSION CORRIGÉE
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
  /**
   * Fonctionnement :
   * 1. Le guard intercepte la requête
   * 2. Passe les credentials (email, password) à la stratégie LocalStrategy
   * 3. La stratégie valide les credentials via le AuthService
   * 4. Si valide, ajoute l'utilisateur à la requête (req.user)
   * 5. Si invalide, renvoie une erreur 401 Unauthorized
   */

  constructor() {
    super();
  }

  /**
   * Surcharge de handleRequest pour personnaliser les messages d'erreur
   */
  handleRequest(err: any, user: any, info: any) {
    // Personnalisez la réponse en cas d'erreur
    if (err || !user) {
      console.error(
        "❌ Erreur authentification locale:",
        err?.message || info?.message,
      );
      throw err || new UnauthorizedException("Email ou mot de passe incorrect");
    }
    return user;
  }

  /**
   * Optionnel : Surcharge de canActivate pour ajouter une logique supplémentaire
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Logique supplémentaire avant l'authentification (optionnelle)
      const request = context.switchToHttp().getRequest();
      console.log("🔐 Tentative de connexion pour:", request.body?.email);

      // Appel de la méthode parent
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      console.error("❌ Erreur activation guard local:", error);
      throw error;
    }
  }
}
