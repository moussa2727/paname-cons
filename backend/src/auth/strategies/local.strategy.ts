import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { AuthConstants } from "../auth.constants";

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
      this.logger.log(`Tentative d'authentification locale pour l'email: ${this.maskEmail(email)}`);

      const normalizedEmail = email.toLowerCase().trim();
      
      const user = await this.authService.validateUser(normalizedEmail, password);

      if (!user) {
        this.logger.warn(`Identifiants invalides pour: ${this.maskEmail(email)}`);
        throw new UnauthorizedException({
          message: "Email ou mot de passe incorrect",
          code: "INVALID_CREDENTIALS"
        });
      }

      //  Extraction de l'ID utilisateur (doit être présent dans l'objet user)
      const userId = this.extractUserId(user);
      
      if (!userId) {
        this.logger.error(` Objet utilisateur sans ID pour l'email: ${this.maskEmail(email)}`, user);
        throw new UnauthorizedException("Erreur interne: impossible d'extraire l'ID utilisateur");
      }

      //  Retourner l'utilisateur avec l'ID correct
      return {
        ...user,
        id: userId //  Seulement 'id'
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const errorMessage = error.message;
        
        if (errorMessage === AuthConstants.ERROR_MESSAGES.PASSWORD_RESET_REQUIRED) {
          this.logger.log(`Réinitialisation du mot de passe requise pour l'utilisateur: ${this.maskEmail(email)}`);
          throw new UnauthorizedException({
            message: "Un mot de passe doit être défini pour ce compte",
            code: AuthConstants.ERROR_MESSAGES.PASSWORD_RESET_REQUIRED,
            requiresPasswordReset: true,
            email: email
          });
        }
        
        if (errorMessage === AuthConstants.ERROR_MESSAGES.COMPTE_DESACTIVE) {
          this.logger.warn(`Compte désactivé pour: ${this.maskEmail(email)}`);
          throw new UnauthorizedException({
            message: "Votre compte a été désactivé",
            code: AuthConstants.ERROR_MESSAGES.COMPTE_DESACTIVE,
            requiresAdmin: true
          });
        }
        
        if (errorMessage === AuthConstants.ERROR_MESSAGES.COMPTE_TEMPORAIREMENT_DECONNECTE) {
          this.logger.warn(`Compte temporairement déconnecté pour: ${this.maskEmail(email)}`);
          throw new UnauthorizedException({
            message: "Votre compte est temporairement déconnecté",
            code: AuthConstants.ERROR_MESSAGES.COMPTE_TEMPORAIREMENT_DECONNECTE,
            duration: AuthConstants.GLOBAL_LOGOUT_DURATION
          });
        }
        
        if (errorMessage === AuthConstants.ERROR_MESSAGES.MAINTENANCE_MODE) {
          this.logger.warn(`Mode maintenance pour: ${this.maskEmail(email)}`);
          throw new UnauthorizedException({
            message: "Système en maintenance",
            code: AuthConstants.ERROR_MESSAGES.MAINTENANCE_MODE
          });
        }
        
        this.logger.warn(`Erreur d'authentification pour ${this.maskEmail(email)}: ${errorMessage}`);
        throw error;
      }

      this.logger.error(`Erreur inattendue LocalStrategy pour ${this.maskEmail(email)}: ${(error as Error).message}`, (error as Error).stack);
      throw new UnauthorizedException({
        message: "Email ou mot de passe incorrect",
        code: "AUTH_ERROR"
      });
    }
  }

  // Méthode pour extraire l'ID utilisateur
  private extractUserId(user: any): string | null {
    if (!user) {
      this.logger.warn("Objet utilisateur null ou undefined");
      return null;
    }
    
    // 1. Vérifier si 'id' existe et est une string
    if (user.id && typeof user.id === 'string') {
      return user.id;
    }
    
    // 2. Vérifier si 'id' existe mais n'est pas une string (le convertir)
    if (user.id && user.id.toString && typeof user.id.toString === 'function') {
      return user.id.toString();
    }
    
    // 3. Vérifier si 'userId' existe (comme alternative)
    if (user.userId && typeof user.userId === 'string') {
      return user.userId;
    }
    
    // 4. Si aucun ID n'est trouvé, c'est une erreur de structure
    this.logger.error(`Structure d'utilisateur invalide - champs disponibles: ${Object.keys(user).join(', ')}`);
    return null;
  }

  //  Méthode pour masquer l'email dans les logs
  private maskEmail(email: string): string {
    if (!email) return '***@***';
    
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***@***';
    
    const maskedName = name.length <= 2 
      ? name.charAt(0) + '*'
      : name.charAt(0) + '***' + (name.length > 1 ? name.charAt(name.length - 1) : '');
    
    return `${maskedName}@${domain}`;
  }
}