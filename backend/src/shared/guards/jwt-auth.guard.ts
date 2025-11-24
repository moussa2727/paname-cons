import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any, _info: any, _context: any) {
    if (err || !user) {
      throw err || new UnauthorizedException("Token invalide ou expiré");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Compte utilisateur inactif");
    }

    return user;
  }
}
