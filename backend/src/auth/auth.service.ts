import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as crypto from "crypto";
import { Model, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { MailService } from "../mail/mail.service";
import { ResetToken } from "../schemas/reset-token.schema";
import { User, UserRole } from "../schemas/user.schema";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { RevokedTokenService } from "./revoked-token.service";
import { RefreshTokenService } from "./refresh-token.service";
import { SessionService } from "./session.service";
import { AuthConstants } from "./auth.constants";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<
    string,
    {
      attempts: number;
      lastAttempt: Date;
      ttl: Date;
    }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly revokedTokenService: RevokedTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    @InjectModel(ResetToken.name)
    private readonly resetTokenModel: Model<ResetToken>,
  ) {}

  // Helper function pour convertir l'ObjectId en string
  private convertObjectIdToString(id: any): string {
    if (id instanceof Types.ObjectId) {
      return id.toString();
    }
    return String(id);
  }

  // Gestion des tentatives de connexion
  private getLoginAttempts(email: string): {
    attempts: number;
    lastAttempt: Date;
  } {
    this.cleanupExpiredAttempts();
    const data = this.loginAttempts.get(email);
    return data
      ? {
          attempts: data.attempts,
          lastAttempt: data.lastAttempt,
        }
      : { attempts: 0, lastAttempt: new Date(0) };
  }

  private incrementLoginAttempts(email: string): void {
    const current = this.loginAttempts.get(email) || {
      attempts: 0,
      lastAttempt: new Date(0),
      ttl: new Date(),
    };

    current.attempts++;
    current.lastAttempt = new Date();
    current.ttl = new Date(
      Date.now() + AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES * 60 * 1000,
    );

    this.loginAttempts.set(email, current);
    this.logger.warn(
      `Tentative de connexion échouée pour ${email}. Tentatives: ${current.attempts}`,
    );
  }

  private cleanupExpiredAttempts(): void {
    const now = new Date();
    for (const [email, data] of this.loginAttempts.entries()) {
      if (data.ttl < now) {
        this.loginAttempts.delete(email);
      }
    }
  }

  private resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
    this.logger.log(`Réinitialisation des tentatives pour ${email}`);
  }

  // ==================== 📝 REGISTER ====================
  async register(registerDto: RegisterDto) {
    try {
      this.logger.log(`📝 Début d'inscription pour: ${registerDto.email}`);

      // ✅ Vérification si premier utilisateur = ADMIN
      const existingAdmin = await this.usersService.findByRole(UserRole.ADMIN);
      if (existingAdmin) {
        registerDto.role = UserRole.USER;
        this.logger.log(`✅ Attribution du rôle USER à: ${registerDto.email}`);
      } else {
        registerDto.role = UserRole.ADMIN;
        this.logger.log(
          `🎯 Premier utilisateur - Attribution du rôle ADMIN à: ${registerDto.email}`,
        );
      }

      // ✅ Création de l'utilisateur
      const newUser = await this.usersService.create(registerDto);
      const userId = this.convertObjectIdToString(newUser._id);

      this.logger.log(`✅ Utilisateur créé avec ID: ${userId}`);

      // ✅ GÉNÉRATION DES TOKENS (STRICTE)
      const jtiAccess = uuidv4();
      const jtiRefresh = uuidv4();

      const accessPayload = {
        email: newUser.email,
        sub: userId,
        role: newUser.role,
        jti: jtiAccess,
        tokenType: "access",
      };

      const refreshPayload = {
        sub: userId,
        email: newUser.email,
        role: newUser.role,
        jti: jtiRefresh,
        tokenType: "refresh",
      };

      // ✅ GÉNÉRATION ACCESS TOKEN
      const access_token = this.jwtService.sign(accessPayload, {
        expiresIn: AuthConstants.JWT_EXPIRATION,
      });

      // ✅ GÉNÉRATION REFRESH TOKEN
      const refresh_token = this.jwtService.sign(refreshPayload, {
        expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
        secret: process.env.JWT_REFRESH_SECRET,
      });

      this.logger.log(`✅ Tokens générés pour: ${newUser.email}`);

      // ✅ CRÉATION SESSION
      await this.sessionService.create(
        userId,
        access_token,
        new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      );

      // ✅ WHITELIST REFRESH TOKEN
      try {
        await this.refreshTokenService.deactivateAllForUser(userId);
        const decodedRefresh = this.jwtService.decode(refresh_token) as any;
        const refreshExp = new Date(
          (decodedRefresh?.exp || 0) * 1000 ||
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.refreshTokenService.create(
          userId,
          refresh_token,
          refreshExp,
        );
        this.logger.log(`✅ Refresh token whitelisté pour: ${newUser.email}`);
      } catch (error) {
        this.logger.warn(
          `⚠️ Impossible d'enregistrer le refresh token: ${error.message}`,
        );
      }

      this.logger.log(
        `🎉 Inscription réussie: ${newUser.email} (rôle: ${newUser.role})`,
      );

      // ✅ RÉPONSE STRICTE POUR FRONTEND
      return {
        access_token: access_token,
        refresh_token: refresh_token,
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isAdmin: newUser.role === UserRole.ADMIN,
          isActive: newUser.isActive,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'enregistrement: ${error.message}`);
      throw error;
    }
  }

  // ==================== 🔐 LOGIN ====================
  async login(user: User) {
    this.logger.log(`🔐 Début de login pour: ${user.email}`);

    const jtiAccess = uuidv4();
    const jtiRefresh = uuidv4();
    const userId = this.convertObjectIdToString(user._id);

    // ✅ PAYLOAD ACCESS TOKEN
    const accessPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
      jti: jtiAccess,
      tokenType: "access",
    };

    // ✅ PAYLOAD REFRESH TOKEN
    const refreshPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
      jti: jtiRefresh,
      tokenType: "refresh",
    };

    // ✅ GÉNÉRATION ACCESS TOKEN
    const access_token = this.jwtService.sign(accessPayload, {
      expiresIn: AuthConstants.JWT_EXPIRATION,
    });

    // ✅ GÉNÉRATION REFRESH TOKEN
    const refresh_token = this.jwtService.sign(refreshPayload, {
      expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
      secret: process.env.JWT_REFRESH_SECRET,
    });

    this.logger.log(`✅ Tokens générés pour: ${user.email}`);

    // ✅ CRÉATION SESSION
    await this.sessionService.create(
      userId,
      access_token,
      new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    );

    // ✅ WHITELIST REFRESH TOKEN
    try {
      await this.refreshTokenService.deactivateAllForUser(userId);
      const decodedRefresh = this.jwtService.decode(refresh_token) as any;
      const refreshExp = new Date(
        (decodedRefresh?.exp || 0) * 1000 ||
          Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
      await this.refreshTokenService.create(userId, refresh_token, refreshExp);
      this.logger.log(`✅ Refresh token whitelisté pour: ${user.email}`);
    } catch (error) {
      this.logger.warn(
        `⚠️ Impossible d'enregistrer le refresh token: ${error.message}`,
      );
    }

    this.logger.log(`🎉 Connexion réussie: ${user.email}`);

    // ✅ RÉPONSE STRICTE POUR FRONTEND
    return {
      access_token: access_token,
      refresh_token: refresh_token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isAdmin: user.role === UserRole.ADMIN,
        isActive: user.isActive,
      },
    };
  }

  // ==================== 🔄 REFRESH TOKEN ====================
  async refresh(refresh_token: string): Promise<{
    access_token: string;
    refresh_token?: string;
    sessionExpired?: boolean;
    sessionCreatedAt?: number;
  }> {
    this.logger.log(`🔄 Tentative de rafraîchissement de token`);

    if (!refresh_token) {
      throw new UnauthorizedException("Refresh token manquant");
    }

    try {
      // ✅ VÉRIFICATION WHITELIST
      const isWhitelisted =
        await this.refreshTokenService.isValid(refresh_token);
      if (!isWhitelisted) {
        this.logger.warn("❌ Refresh token non autorisé (non whitelisté)");
        throw new UnauthorizedException("Refresh token non autorisé");
      }

      // ✅ VÉRIFICATION RÉVOCATION
      const wasRevoked =
        await this.revokedTokenService.isTokenRevoked(refresh_token);
      if (wasRevoked) {
        this.logger.warn("❌ Refresh token déjà utilisé");
        throw new UnauthorizedException("Refresh token déjà utilisé");
      }

      // ✅ VÉRIFICATION SIGNATURE
      const payload = this.jwtService.verify(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if ((payload as any)?.tokenType !== "refresh") {
        this.logger.warn("❌ Type de token invalide");
        throw new UnauthorizedException("Type de token invalide");
      }

      // ✅ VÉRIFICATION DURÉE MAXIMALE DE SESSION (25 minutes)
      const maxSessionMs = AuthConstants.MAX_SESSION_DURATION_MS;
      const issuedAtMs = ((payload as any)?.iat || 0) * 1000;
      if (issuedAtMs && Date.now() - issuedAtMs > maxSessionMs) {
        this.logger.log(
          `🔒 Session expirée après 25 minutes pour: ${payload.sub}`,
        );
        try {
          await this.logoutUser(
            (payload as any).sub,
            "Session maximale atteinte",
          );
          await this.refreshTokenService.deactivateByToken(refresh_token);
        } catch (error) {
          this.logger.warn(`⚠️ Erreur lors du logout: ${error.message}`);
        }
        return {
          access_token: "",
          refresh_token: undefined,
          sessionExpired: true,
          sessionCreatedAt: issuedAtMs,
        };
      }

      // ✅ VÉRIFICATION UTILISATEUR
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`❌ Utilisateur non trouvé: ${payload.sub}`);
        throw new UnauthorizedException("Utilisateur non trouvé");
      }

      const userId = this.convertObjectIdToString(user._id);
      this.logger.log(
        `✅ Utilisateur trouvé pour rafraîchissement: ${user.email}`,
      );

      // ✅ GÉNÉRATION NOUVEAU ACCESS TOKEN
      const newJti = uuidv4();
      const new_access_token = this.jwtService.sign(
        {
          sub: userId,
          email: user.email,
          role: user.role,
          jti: newJti,
          tokenType: "access",
        },
        {
          expiresIn: AuthConstants.JWT_EXPIRATION,
        },
      );

      // ✅ GÉNÉRATION NOUVEAU REFRESH TOKEN (rotation)
      const newRefreshJti = uuidv4();
      const new_refresh_token = this.jwtService.sign(
        {
          sub: userId,
          email: user.email,
          role: user.role,
          jti: newRefreshJti,
          tokenType: "refresh",
        },
        {
          expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      // ✅ CRÉATION NOUVELLE SESSION
      await this.sessionService.create(
        userId,
        new_access_token,
        new Date(Date.now() + 15 * 60 * 1000),
      );

      // ✅ RÉVOCATION ANCIEN REFRESH TOKEN
      try {
        const expMs = ((payload as any)?.exp || 0) * 1000;
        await this.revokedTokenService.revokeToken(
          refresh_token,
          new Date(expMs || Date.now() + 7 * 24 * 60 * 60 * 1000),
        );
        await this.refreshTokenService.deactivateByToken(refresh_token);
        this.logger.log(`✅ Ancien refresh token révoqué`);
      } catch (error) {
        this.logger.warn(
          `⚠️ Impossible de révoquer l'ancien refresh token: ${error.message}`,
        );
      }

      // ✅ WHITELIST NOUVEAU REFRESH TOKEN
      try {
        const decodedNewRefresh = this.jwtService.decode(
          new_refresh_token,
        ) as any;
        const newExp = new Date(
          (decodedNewRefresh?.exp || 0) * 1000 ||
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.refreshTokenService.create(
          userId,
          new_refresh_token,
          newExp,
        );
        this.logger.log(`✅ Nouveau refresh token whitelisté`);
      } catch (error) {
        this.logger.warn(
          `⚠️ Impossible d'enregistrer le nouveau refresh token: ${error.message}`,
        );
      }

      this.logger.log(`✅ Rafraîchissement réussi pour: ${user.email}`);

      return {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
        sessionExpired: false,
        sessionCreatedAt: Date.now(),
      };
    } catch (error) {
      this.logger.error(`❌ Erreur de refresh token: ${error.message}`);
      throw new UnauthorizedException("Refresh token invalide");
    }
  }

  // ==================== 👤 VALIDATION UTILISATEUR ====================
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      this.logger.log(`🔐 Validation utilisateur: ${email}`);

      const attempts = this.getLoginAttempts(email);

      if (attempts.attempts >= AuthConstants.MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt =
          (Date.now() - attempts.lastAttempt.getTime()) / (1000 * 60);
        if (timeSinceLastAttempt < AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES) {
          const remainingTime = Math.ceil(
            AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES - timeSinceLastAttempt,
          );
          this.logger.warn(
            `🚫 Trop de tentatives pour ${email}. Réessayez dans ${remainingTime} minutes`,
          );
          throw new UnauthorizedException(
            `Trop de tentatives. Réessayez dans ${remainingTime} minutes`,
          );
        } else {
          this.resetLoginAttempts(email);
        }
      }

      const user = await this.usersService.validateUser(email, password);

      if (!user) {
        this.incrementLoginAttempts(email);
        this.logger.warn(`❌ Validation échouée pour: ${email}`);
        return null;
      }

      // ✅ VÉRIFICATION MODE MAINTENANCE
      const isMaintenance = await this.usersService.isMaintenanceMode();
      if (isMaintenance && user.role !== UserRole.ADMIN) {
        this.logger.warn(
          `🚫 Mode maintenance - Connexion bloquée pour: ${email}`,
        );
        throw new UnauthorizedException(
          "Le système est en maintenance. Seuls les administrateurs peuvent se connecter.",
        );
      }

      this.resetLoginAttempts(email);
      this.logger.log(`✅ Validation réussie pour: ${email}`);
      return user;
    } catch (error) {
      this.logger.error(
        `❌ Erreur de validation utilisateur pour ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== 🛡️ LOGOUT ALL ====================
  async logoutAll(protectedAdminEmail: string) {
    this.logger.log(
      `🛡️ Début de la déconnexion globale initiée par: ${protectedAdminEmail || "Système"}`,
    );
    const [revokeResult, sessionsResult, logoutResult] = await Promise.all([
      this.revokedTokenService.revokeAllTokens(),
      this.sessionService.deleteAllSessions(),
      this.usersService.logoutAll(),
    ]);

    this.logger.log(
      `✅ Déconnexion globale terminée - Tokens: ${revokeResult.revokedCount}, Sessions: ${sessionsResult.deletedCount}, Utilisateurs: ${logoutResult.loggedOutCount}`,
    );

    return {
      message: "Déconnexion système complète effectuée",
      stats: {
        tokensRevoked: revokeResult.revokedCount,
        sessionsCleared: sessionsResult.deletedCount,
        usersLoggedOut: logoutResult.loggedOutCount,
      },
    };
  }

  // ==================== 🔐 GESTION DES TOKENS ====================
  async revokeToken(token: string, expiresAt: Date): Promise<void> {
    try {
      await this.revokedTokenService.revokeToken(token, expiresAt);
      this.logger.log(`✅ Token révoqué: ${token.substring(0, 10)}...`);
    } catch (error) {
      if (error?.code === 11000) {
        this.logger.warn("ℹ️ Token déjà révoqué");
        return;
      }
      this.logger.error(`❌ Erreur de révocation du token: ${error.message}`);
      throw error;
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    return await this.revokedTokenService.isTokenRevoked(token);
  }

  async revokeAllTokens(): Promise<{
    message: string;
    revokedCount: number;
    sessionsCleared: number;
  }> {
    const tokensResult = await this.revokedTokenService.revokeAllTokens();
    const sessionsResult = await this.sessionService.deleteAllSessions();

    this.logger.log(
      `✅ Tous les tokens révoqués: ${tokensResult.revokedCount}`,
    );

    return {
      message: "Tokens et sessions révoqués",
      revokedCount: tokensResult.revokedCount,
      sessionsCleared: sessionsResult.deletedCount,
    };
  }

  async logoutWithSessionDeletion(
    userId: string,
    access_token: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🚪 Déconnexion avec suppression de session pour: ${userId}`,
      );

      await this.sessionService.deleteSession(access_token);

      try {
        const decoded = this.jwtService.decode(access_token) as any;
        if (decoded && decoded.exp) {
          await this.revokeToken(access_token, new Date(decoded.exp * 1000));
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ Erreur lors de la révocation du token: ${error.message}`,
        );
      }

      this.loginAttempts.delete(userId);
      this.logger.log(`✅ Déconnexion complète pour: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la déconnexion avec suppression: ${error.message}`,
      );
      throw error;
    }
  }

  async validateToken(access_token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(access_token);
      const [isRevoked, isActive] = await Promise.all([
        this.isTokenRevoked(access_token),
        this.sessionService.isTokenActive(access_token),
      ]);
      const userExists = await this.usersService.exists(payload.sub);

      const isValid = !isRevoked && isActive && userExists;

      if (!isValid) {
        this.logger.warn(
          `❌ Token invalide - Révoqué: ${isRevoked}, Actif: ${isActive}, Utilisateur: ${userExists}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.warn(`❌ Token invalide: ${error.message}`);
      return false;
    }
  }

  // ==================== 🔄 RÉINITIALISATION MOT DE PASSE ====================
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      this.logger.log(`🔄 Tentative de réinitialisation de mot de passe`);

      const resetToken = await this.resetTokenModel.findOne({
        token,
        expiresAt: { $gt: new Date() },
      });

      if (!resetToken) {
        this.logger.warn("❌ Token de réinitialisation invalide ou expiré");
        throw new UnauthorizedException("Token invalide ou expiré");
      }

      const user = await this.usersService.findById(resetToken.user.toString());
      if (!user) {
        this.logger.warn(
          `❌ Utilisateur non trouvé pour token: ${resetToken.user}`,
        );
        throw new NotFoundException("Utilisateur non trouvé");
      }

      const userId = this.convertObjectIdToString(user._id);
      await this.usersService.resetPassword(userId, newPassword);

      await this.resetTokenModel.deleteOne({ _id: resetToken._id });
      this.logger.log(`✅ Mot de passe réinitialisé pour: ${user.email}`);
    } catch (error) {
      this.logger.error(`❌ Erreur de réinitialisation: ${error.message}`);
      throw error;
    }
  }

  private getFrontendUrl(): string {
    const nodeEnv = process.env.NODE_ENV || "development";

    if (nodeEnv === "production") {
      return process.env.FRONTEND_URL || "https://panameconsulting.vercel.app";
    }

    return process.env.FRONTEND_URL || "http://localhost:5173";
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      this.logger.log(`📧 Envoi email réinitialisation pour: ${email}`);

      const user = await this.usersService.findByEmail(email);
      if (!user) {
        this.logger.warn(
          `⚠️ Demande de réinitialisation pour email inexistant: ${email}`,
        );
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + AuthConstants.RESET_TOKEN_EXPIRATION_MS,
      );

      await this.resetTokenModel.deleteMany({
        user: user._id,
      });

      await this.resetTokenModel.create({
        token: resetToken,
        user: user._id,
        expiresAt,
      });

      const frontendUrl = this.getFrontendUrl();
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      try {
        await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
        this.logger.log(`✅ Email de réinitialisation envoyé à: ${email}`);
      } catch (emailError) {
        this.logger.warn(
          `⚠️ Échec envoi email - Token manuel pour ${email}: ${resetUrl}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la demande de réinitialisation: ${error.message}`,
      );
    }
  }

  // ==================== 👤 PROFIL UTILISATEUR ====================
  async getProfile(userId: string): Promise<User> {
    try {
      this.logger.log(`📋 Récupération du profil pour: ${userId}`);

      if (!userId) {
        throw new BadRequestException("ID utilisateur manquant");
      }

      const user = await this.usersService.findById(userId);

      if (!user) {
        throw new NotFoundException("Utilisateur non trouvé");
      }

      this.logger.log(`✅ Profil récupéré avec succès pour: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(
        `❌ Erreur de récupération du profil: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== 🚪 LOGOUT AUTOMATIQUE ====================
  async logoutUser(
    userId: string,
    reason: string = "Logout automatique",
  ): Promise<void> {
    try {
      this.logger.log(
        `🚪 Logout automatique pour: ${userId} - Raison: ${reason}`,
      );

      const activeSessions =
        await this.sessionService.getActiveSessionsByUser(userId);

      for (const session of activeSessions) {
        try {
          const decoded = this.jwtService.decode(session.token) as any;
          if (decoded && decoded.exp) {
            await this.revokeToken(session.token, new Date(decoded.exp * 1000));
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Erreur lors de la révocation du token: ${error.message}`,
          );
        }
      }

      await this.sessionService.deleteAllUserSessions(userId);
      this.loginAttempts.delete(userId);

      this.logger.log(`✅ Logout complet pour: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du logout pour ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== 🧹 NETTOYAGE ====================
  async cleanupExpiredSessions(): Promise<void> {
    try {
      this.logger.log("🧹 Début du nettoyage des sessions expirées");

      const expiredSessions = await this.sessionService.getExpiredSessions();

      for (const session of expiredSessions) {
        try {
          const decoded = this.jwtService.decode(session.token) as any;
          if (decoded && decoded.exp) {
            await this.revokeToken(session.token, new Date(decoded.exp * 1000));
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Erreur lors de la révocation du token expiré: ${error.message}`,
          );
        }
      }

      await this.sessionService.deleteExpiredSessions();
      this.logger.log(
        `✅ Nettoyage terminé - ${expiredSessions.length} sessions expirées`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du nettoyage des sessions: ${error.message}`,
      );
      throw error;
    }
  }

  async cleanupUserSessions(userId: string): Promise<void> {
    try {
      this.logger.log(`🧹 Nettoyage des sessions pour: ${userId}`);

      await this.sessionService.deleteAllUserSessions(userId);
      this.logger.log(`✅ Sessions nettoyées pour: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du nettoyage des sessions pour ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
