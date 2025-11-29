import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../schemas/user.schema";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // ✅ SI PAS DE RÔLES REQUIS, ACCÈS AUTORISÉ
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ✅ VÉRIFICATION PRÉSENCE UTILISATEUR
    if (!user) {
      this.logger.warn("RolesGuard: No user found in request");
      throw new ForbiddenException(
        "Accès refusé - utilisateur non authentifié",
      );
    }

    // ✅ VÉRIFICATION COMPTE ACTIF
    if (!user.isActive) {
      this.logger.warn(
        `RolesGuard: Inactive account attempt - ${user.userId || user.sub}`,
      );
      throw new ForbiddenException("Compte utilisateur inactif");
    }

    // ✅ VÉRIFICATION RÔLES
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      this.logger.warn(
        `RolesGuard: Insufficient privileges - User role: ${user.role}, Required: ${requiredRoles.join(", ")}`,
      );
      throw new ForbiddenException(
        "Privilèges insuffisants pour accéder à cette ressource",
      );
    }

    this.logger.log(
      `RolesGuard: Access granted - User: ${user.userId || user.sub}, Role: ${user.role}`,
    );
    return true;
  }
}
