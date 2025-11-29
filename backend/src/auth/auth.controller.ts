import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  InternalServerErrorException,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../shared/guards/roles.guard";
import { LocalAuthGuard } from "../shared/guards/local-auth.guard";
import { ThrottleGuard } from "../shared/guards/throttle.guard";
import { LoggingInterceptor } from "../shared/interceptors/logging.interceptor";
import { Roles } from "../shared/decorators/roles.decorator";
import { UserRole } from "../schemas/user.schema";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { LoginDto } from "./dto/login.dto";
import { Logger } from "@nestjs/common";

interface CustomRequest extends Request {
  cookies?: {
    refresh_token?: string;
  };
}

@ApiTags("Authentication")
@Controller("auth")
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly SESSION_MAX_DURATION = 25 * 60 * 1000; // 25 minutes en millisecondes

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  // ==================== 🔐 CONFIGURATION COOKIES PRODUCTION ====================
  private getCookieOptions(req?: any): any {
    const _isProduction = process.env.NODE_ENV === "production";
    const origin = req?.headers?.origin || req?.headers?.["origin"];

    this.logger.log(`🌍 Origine de la requête: ${this.maskOrigin(origin)}`);
    this.logger.log(`🔧 Environnement: ${process.env.NODE_ENV}`);

    const _isVercelDomain = origin?.includes("panameconsulting.vercel.app");
    const _isProductionDomain = origin?.includes("panameconsulting.com");
    const _isLocalhost =
      origin?.includes("localhost") || origin?.includes("127.0.0.1");

    const domain = ".panameconsulting.com";
    const secure = true;
    const sameSite = "none";

    this.logger.log("🚀 Configuration PRODUCTION activée");

    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: "/",
    };
  }

  // ==================== 🔐 DÉTECTION ADMIN ====================
  private isProtectedAdmin(email: string): boolean {
    const adminEmail = this.configService.get<string>("EMAIL_USER");
    if (!adminEmail) {
      this.logger.warn(
        "❌ EMAIL_USER non configuré dans les variables d'environnement",
      );
      return false;
    }
    return email === adminEmail;
  }

  // ==================== 🔐 LOGIN ====================
  @Post("login")
  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @ApiOperation({ summary: "Connexion utilisateur" })
  @ApiResponse({ status: 200, description: "Connexion réussie" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  @ApiResponse({ status: 429, description: "Trop de tentatives" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req: { user: any },
    @Res() res: Response,
  ) {
    const userEmail = req.user.email;
    this.logger.log(
      `🔐 Tentative de connexion pour: ${this.maskEmail(userEmail)}`,
    );

    try {
      if (!req.user || !req.user.email) {
        this.logger.warn(`❌ Données utilisateur manquantes pour la connexion`);
        throw new UnauthorizedException("Identifiants invalides");
      }

      const result = await this.authService.login(req.user);

      if (!result || !result.access_token) {
        this.logger.error(
          `❌ Réponse de login invalide pour: ${this.maskEmail(userEmail)}`,
        );
        throw new InternalServerErrorException("Erreur lors de la connexion");
      }

      const cookieOptions = this.getCookieOptions(req);

      // ✅ ACCESS_TOKEN COOKIE - Stocké uniquement dans les cookies
      res.cookie("access_token", result.access_token, {
        ...cookieOptions,
        httpOnly: true,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // ✅ REFRESH_TOKEN COOKIE - Stocké uniquement dans les cookies
      res.cookie("refresh_token", result.refresh_token, {
        // ✅ CORRIGÉ: refresh_token au lieu de refreshToken
        ...cookieOptions,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });

      this.logger.log(
        `✅ Connexion réussie pour: ${this.maskEmail(userEmail)}`,
      );

      // ✅ RÉPONSE COHÉRENTE AVEC LE SERVICE
      return res.json({
        access_token: result.access_token, // ✅ Cohérent avec le service
        refresh_token: result.refresh_token, // ✅ Cohérent avec le service
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isAdmin: result.user.isAdmin,
          isActive: result.user.isActive,
        },
        message: "Connexion réussie",
        sessionMaxDuration: this.SESSION_MAX_DURATION,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur de connexion pour ${this.maskEmail(userEmail)}: ${this.maskError(error.message)}`,
      );

      this.clearAuthCookies(res);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Une erreur est survenue lors de la connexion",
      );
    }
  }

  // ==================== 🔄 REFRESH TOKEN ====================
  @Post("refresh")
  @ApiOperation({ summary: "Rafraîchir le token" })
  @ApiResponse({ status: 200, description: "Token rafraîchi" })
  @ApiResponse({ status: 401, description: "Refresh token invalide" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async refresh(
    @Request() req: CustomRequest,
    @Body() _body: any,
    @Res() res: Response,
  ) {
    this.logger.log("🔄 Requête de rafraîchissement reçue");

    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        this.logger.warn("❌ Refresh token manquant dans les cookies");
        this.clearAuthCookies(res);
        throw new UnauthorizedException(
          "Session expirée - veuillez vous reconnecter",
        );
      }

      const result = await this.authService.refresh(refreshToken);

      // ✅ VÉRIFICATION DURÉE MAXIMALE SESSION (25 minutes)
      const sessionDuration =
        Date.now() - (result.sessionCreatedAt || Date.now());
      if (sessionDuration > this.SESSION_MAX_DURATION) {
        this.logger.log(
          `🔒 Session expirée après ${sessionDuration}ms (max: ${this.SESSION_MAX_DURATION}ms)`,
        );
        this.clearAuthCookies(res);
        throw new UnauthorizedException(
          "Session expirée après 25 minutes - veuillez vous reconnecter",
        );
      }

      if (result.sessionExpired) {
        this.logger.log("🔒 Session expirée - nettoyage cookies");
        this.clearAuthCookies(res);
        throw new UnauthorizedException("Session expirée après 25 minutes");
      }

      if (!result.access_token) {
        // ✅ CORRIGÉ: access_token au lieu de accessToken
        this.logger.error(
          "❌ Access token non généré lors du rafraîchissement",
        );
        throw new InternalServerErrorException(
          "Erreur lors du rafraîchissement du token",
        );
      }

      const cookieOptions = this.getCookieOptions(req);

      // ✅ MISE À JOUR REFRESH_TOKEN COOKIE
      if (result.refresh_token) {
        // ✅ CORRIGÉ: refresh_token au lieu de refreshToken
        res.cookie("refresh_token", result.refresh_token, {
          // ✅ CORRIGÉ: refresh_token au lieu de refreshToken
          ...cookieOptions,
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        this.logger.log("✅ Refresh token cookie mis à jour");
      }

      // ✅ MISE À JOUR ACCESS_TOKEN COOKIE
      res.cookie("access_token", result.access_token, {
        // ✅ CORRIGÉ: access_token au lieu de accessToken
        ...cookieOptions,
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
      });

      this.logger.log("✅ Tokens rafraîchis avec succès");

      // ✅ RÉPONSE COHÉRENTE AVEC LE SERVICE
      return res.json({
        access_token: result.access_token, // ✅ Cohérent avec le service
        refresh_token: result.refresh_token, // ✅ Cohérent avec le service
        message: "Token rafraîchi avec succès",
        expiresIn: 15 * 60,
        sessionMaxDuration: this.SESSION_MAX_DURATION,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur rafraîchissement: ${this.maskError(error.message)}`,
      );

      this.clearAuthCookies(res);

      if (error instanceof UnauthorizedException) {
        return res.status(401).json({
          message: error.message,
          loggedOut: true,
          requiresReauth: true,
        });
      }

      if (error instanceof InternalServerErrorException) {
        return res.status(500).json({
          message: "Erreur interne lors du rafraîchissement",
          loggedOut: true,
        });
      }

      return res.status(401).json({
        message: "Session invalide - veuillez vous reconnecter",
        loggedOut: true,
        requiresReauth: true,
      });
    }
  }

  // ==================== 📝 REGISTER ====================
  @Post("register")
  @ApiOperation({ summary: "Inscription utilisateur" })
  @ApiResponse({ status: 201, description: "Utilisateur créé" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  @ApiResponse({ status: 409, description: "Utilisateur déjà existant" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    this.logger.log(
      `📝 Tentative d'inscription pour: ${this.maskEmail(registerDto.email)}`,
    );

    try {
      if (!registerDto.email || !registerDto.password) {
        throw new BadRequestException("Email et mot de passe sont requis");
      }

      if (registerDto.password.length < 8) {
        throw new BadRequestException(
          "Le mot de passe doit contenir au moins 8 caractères",
        );
      }

      const result = await this.authService.register(registerDto);

      if (!result || !result.access_token) {
        this.logger.error(
          `❌ Réponse d'inscription invalide pour: ${this.maskEmail(registerDto.email)}`,
        );
        throw new InternalServerErrorException("Erreur lors de l'inscription");
      }

      this.logger.log(
        `✅ Inscription réussie pour: ${this.maskEmail(registerDto.email)}`,
      );

      const cookieOptions = this.getCookieOptions();

      // ✅ ACCESS_TOKEN COOKIE
      res.cookie("access_token", result.access_token, {
        ...cookieOptions,
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
      });

      // ✅ REFRESH_TOKEN COOKIE
      if (result.refresh_token) {
        // ✅ CORRIGÉ: refresh_token au lieu de refreshToken
        res.cookie("refresh_token", result.refresh_token, {
          // ✅ CORRIGÉ: refresh_token au lieu de refreshToken
          ...cookieOptions,
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.logger.log("✅ Cookies définis après inscription");

      // ✅ RÉPONSE COHÉRENTE AVEC LE SERVICE
      return res.status(201).json({
        access_token: result.access_token, 
        refresh_token: result.refresh_token, 
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isAdmin: result.user.isAdmin,
          isActive: result.user.isActive,
        },
        message: "Inscription réussie",
        sessionMaxDuration: this.SESSION_MAX_DURATION,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur inscription pour ${this.maskEmail(registerDto.email)}: ${this.maskError(error.message)}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      if (error.code === 11000) {
        throw new ConflictException(
          "Un utilisateur avec cet email existe déjà",
        );
      }

      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
      );
    }
  }

  // ==================== 🚪 LOGOUT ====================
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Déconnexion" })
  @ApiResponse({ status: 200, description: "Déconnexion réussie" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async logout(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(" ")[1] || "";
    const userId = req.user?.sub || req.user?.userId;
    const userEmail = req.user?.email;

    this.logger.log(
      `🚪 Déconnexion pour: ${this.maskUserId(userId)} (${this.maskEmail(userEmail)})`,
    );

    try {
      if (userId && token) {
        await this.authService.logoutWithSessionDeletion(userId, token);
        this.logger.log(
          `✅ Session supprimée pour: ${this.maskUserId(userId)}`,
        );
      }

      this.clearAuthCookies(res);

      this.logger.log(
        `✅ Déconnexion réussie pour: ${this.maskUserId(userId)}`,
      );

      return res.json({
        message: "Déconnexion réussie",
        success: true,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur déconnexion pour ${this.maskUserId(userId)}: ${this.maskError(error.message)}`,
      );

      this.clearAuthCookies(res);

      return res.json({
        message: "Déconnexion effectuée",
        success: true,
        warning: "Certaines opérations de nettoyage ont échoué",
      });
    }
  }

  // ==================== 🛡️ LOGOUT ALL ====================
  @Post("logout-all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Déconnexion de tous les utilisateurs non-admin" })
  @ApiResponse({ status: 200, description: "Déconnexion globale réussie" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Accès refusé" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async logoutAll(@Request() req: any, @Res() res: Response) {
    const currentAdmin = req.user;
    const adminEmail = currentAdmin.email;

    // ✅ PROTECTION ABSOLUE DE L'ADMIN PRINCIPAL DEPUIS .env
    if (this.isProtectedAdmin(adminEmail)) {
      this.logger.warn(
        `🚨 Tentative de déconnexion globale par l'admin protégé: ${this.maskEmail(adminEmail)}`,
      );
      throw new UnauthorizedException(
        "Action non autorisée pour cet administrateur",
      );
    }

    this.logger.log(
      `🛡️ Admin initie une déconnexion globale: ${this.maskEmail(adminEmail)}`,
    );

    try {
      const adminProfile = await this.authService.getProfile(
        currentAdmin.sub || currentAdmin.userId,
      );

      if (!adminProfile || adminProfile.role !== UserRole.ADMIN) {
        this.logger.error(
          `❌ Tentative de déconnexion globale par un non-admin: ${this.maskEmail(adminEmail)}`,
        );
        throw new UnauthorizedException("Privilèges administrateur requis");
      }

      // ✅ Récupération de l'email admin depuis .env pour exclusion avec vérification de type
      const protectedAdminEmail =
        this.configService.get<string>("EMAIL_USER") || "";
      const result = await this.authService.logoutAll(protectedAdminEmail);

      this.logger.log("✅ Déconnexion globale réussie");

      return res.json({
        success: true,
        message: result.message,
        stats: {
          tokensRevoked: result.stats.tokensRevoked,
          sessionsCleared: result.stats.sessionsCleared,
          usersLoggedOut: result.stats.usersLoggedOut,
          protectedAdminExcluded: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur déconnexion globale par ${this.maskEmail(adminEmail)}: ${this.maskError(error.message)}`,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Erreur lors de la déconnexion globale. Aucun utilisateur n'a été déconnecté.",
      );
    }
  }

  // ==================== 👤 PROFIL UTILISATEUR ====================
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer le profil utilisateur" })
  @ApiResponse({ status: 200, description: "Profil récupéré" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiResponse({ status: 500, description: "Erreur interne du serveur" })
  async getProfile(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    if (!userId) {
      this.logger.error("❌ ID utilisateur manquant dans le token");
      throw new BadRequestException("ID utilisateur manquant dans le token");
    }

    this.logger.log(
      `📋 Récupération du profil pour: ${this.maskUserId(userId)}`,
    );

    try {
      const user = await this.authService.getProfile(userId);

      if (!user) {
        this.logger.warn(
          `❌ Utilisateur non trouvé: ${this.maskUserId(userId)}`,
        );
        throw new UnauthorizedException("Utilisateur non trouvé");
      }

      if (!user.isActive) {
        this.logger.warn(
          `❌ Utilisateur inactif tentant d'accéder au profil: ${this.maskUserId(userId)}`,
        );
        throw new UnauthorizedException("Compte désactivé");
      }

      return {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isAdmin: user.role === UserRole.ADMIN,
        telephone: user.telephone,
        isActive: user.isActive,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur récupération profil ${this.maskUserId(userId)}: ${this.maskError(error.message)}`,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Erreur lors de la récupération du profil",
      );
    }
  }

  // ==================== 🔑 MISE À JOUR MOT DE PASSE ====================
  @Post("update-password")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Mettre à jour le mot de passe" })
  async updatePassword(
    @Request() req: any,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.userId;

    this.logger.log(
      `🔑 Mise à jour mot de passe pour: ${this.maskUserId(userId)}`,
    );

    try {
      if (body.newPassword !== body.confirmNewPassword) {
        throw new BadRequestException("Les mots de passe ne correspondent pas");
      }

      if (body.newPassword.length < 8) {
        throw new BadRequestException(
          "Le nouveau mot de passe doit contenir au moins 8 caractères",
        );
      }

      await this.usersService.updatePassword(userId, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmNewPassword: body.confirmNewPassword,
      });

      this.logger.log(
        `✅ Mot de passe mis à jour pour: ${this.maskUserId(userId)}`,
      );

      return { message: "Mot de passe mis à jour avec succès" };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur mise à jour mot de passe ${this.maskUserId(userId)}: ${this.maskError(error.message)}`,
      );
      throw error;
    }
  }

  // ==================== 📧 MOT DE PASSE OUBLIÉ ====================
  @Post("forgot-password")
  @ApiOperation({ summary: "Demande de réinitialisation de mot de passe" })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(
      `📧 Demande de réinitialisation pour: ${this.maskEmail(forgotPasswordDto.email)}`,
    );

    try {
      await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);

      return {
        message:
          "Si votre email est enregistré, vous recevrez un lien de réinitialisation",
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur demande réinitialisation ${this.maskEmail(forgotPasswordDto.email)}: ${this.maskError(error.message)}`,
      );

      return {
        message:
          "Si votre email est enregistré, vous recevrez un lien de réinitialisation",
      };
    }
  }

  // ==================== 🔄 RÉINITIALISATION MOT DE PASSE ====================
  @Post("reset-password")
  @ApiOperation({ summary: "Réinitialiser le mot de passe" })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log("🔄 Réinitialisation du mot de passe");

    try {
      await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );

      return { message: "Mot de passe réinitialisé avec succès" };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur réinitialisation mot de passe: ${this.maskError(error.message)}`,
      );
      throw error;
    }
  }

  // ==================== 🔧 MÉTHODES UTILITAIRES PRIVÉES ====================
  private clearAuthCookies(res: Response): void {
    const cookieOptions: any = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".panameconsulting.com",
      path: "/",
    };

    try {
      res.clearCookie("refresh_token", cookieOptions);
      res.clearCookie("access_token", cookieOptions);
      this.logger.log("✅ Cookies d'authentification nettoyés");
    } catch (error) {
      this.logger.error(
        `❌ Erreur nettoyage cookies: ${this.maskError(error.message)}`,
      );
    }
  }

  // ==================== 🔐 MÉTHODES DE MASQUAGE DES DONNÉES SENSIBLES ====================
  private maskEmail(email: string): string {
    if (!email) return "********";
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return "********";

    const maskedLocal =
      localPart.length > 2
        ? `${localPart.substring(0, 2)}${"*".repeat(localPart.length - 2)}`
        : "***";

    return `${maskedLocal}@${domain}`;
  }

  private maskUserId(userId: string): string {
    if (!userId) return "user_********";
    return `user_${userId.substring(0, 8)}...`;
  }

  private maskOrigin(origin: string): string {
    if (!origin) return "unknown_origin";

    try {
      const url = new URL(origin);
      return `${url.protocol}//${url.hostname}`;
    } catch {
      return "invalid_origin";
    }
  }

  private maskError(errorMessage: string): string {
    if (!errorMessage) return "No error details";

    const masked = errorMessage
      .replace(/[a-f0-9]{32,}/gi, "token_****")
      .replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        this.maskEmail,
      )
      .replace(/(password|pwd|secret|token|key)=[^&\s]+/gi, "$1=****")
      .substring(0, 200);

    return masked;
  }
}
