import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
  private readonly logger = new Logger(LocalAuthGuard.name);

  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password } = request.body;

    // ✅ VALIDATION PRÉLIMINAIRE DES DONNÉES
    if (!email || !password) {
      this.logger.warn("LocalAuthGuard: Missing credentials");
      throw new BadRequestException("Email et mot de passe sont requis");
    }

    this.logger.log(
      `LocalAuthGuard: Login attempt for ${this.maskEmail(email)}`,
    );

    try {
      // ✅ APPEL DE LA MÉTHODE PARENT
      const result = await super.canActivate(context);

      if (result) {
        this.logger.log(
          `LocalAuthGuard: Successful login for ${this.maskEmail(email)}`,
        );
      }

      return result as boolean;
    } catch (error) {
      this.logger.error(
        `LocalAuthGuard: Authentication failed for ${this.maskEmail(email)} - ${error.message}`,
      );

      // ✅ PROPAGATION DES ERREURS SPÉCIFIQUES
      if (error.message === "COMPTE_DESACTIVE") {
        throw new UnauthorizedException("COMPTE_DESACTIVE");
      }

      if (error.message.includes("maintenance")) {
        throw new UnauthorizedException(error.message);
      }

      // ✅ ERREUR GÉNÉRIQUE POUR ÉVITER LES FUITES D'INFORMATIONS
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(
        `LocalAuthGuard handleRequest: ${err?.message || info?.message}`,
      );

      // ✅ GESTION DES ERREURS SPÉCIFIQUES
      if (err?.message === "COMPTE_DESACTIVE") {
        throw new UnauthorizedException("COMPTE_DESACTIVE");
      }

      if (info?.message?.includes("Trop de tentatives")) {
        throw new UnauthorizedException(info.message);
      }

      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    // ✅ VÉRIFICATION COMPTE ACTIF
    if (user && !user.isActive) {
      this.logger.warn(`LocalAuthGuard: Inactive account - ${user.email}`);
      throw new UnauthorizedException("COMPTE_DESACTIVE");
    }

    return user;
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***@***";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
  }
}
