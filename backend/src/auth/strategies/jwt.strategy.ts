// jwt.strategy.ts - VERSION HYPER SÉCURISÉE
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../../users/users.service";
import { Types } from "mongoose";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
          }
          return request.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // ✅ Log sécurisé
    const maskedId = this.maskSensitiveData(payload.sub);
    console.log(`Validation token - User: ${maskedId}`);

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      console.log(`User not found - ID: ${maskedId}`);
      throw new UnauthorizedException("Utilisateur non trouvé");
    }

    if (!user.isActive) {
      console.log(`Inactive account - ID: ${maskedId}`);
      throw new UnauthorizedException("Compte utilisateur inactif");
    }

    console.log(`User validated - ID: ${maskedId}, Role: ${user.role}`);

    // ✅ Retourner sub pour compatibilité
    return {
      sub: (user._id as Types.ObjectId).toString(), // ✅ Critical: must be 'sub'
      userId: (user._id as Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }

  private maskSensitiveData(data: string): string {
    if (!data || data.length < 8) return "***";
    return data.substring(0, 4) + "***" + data.substring(data.length - 4);
  }
}
