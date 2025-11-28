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
  Logger,
} from "@nestjs/common";
import { Response } from "express";
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

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // ==================== 🔐 ENDPOINTS D'AUTHENTIFICATION ====================

  private getCookieOptions(req?: any): any {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = req?.headers?.host?.includes('localhost') || 
                     req?.headers?.origin?.includes('localhost');
  
  // Pour Railway + Vercel, utiliser cette configuration
  if (isProduction) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // Important pour cross-domain
      path: '/',
      // ⚠️ NE PAS spécifier de domaine pour cross-domain
    };
  }

  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  };
}

  @Post("login")
  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @ApiOperation({ summary: "Connexion utilisateur" })
  @ApiResponse({ status: 200, description: "Connexion réussie" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  async login(@Body() loginDto: LoginDto, @Request() req: { user: any }, @Res() res: Response) {
    this.logger.log(`🔐 Tentative de connexion pour: ${loginDto.email}`);
    
    const result = await this.authService.login(req.user);
    
    const cookieOptions = this.getCookieOptions(req);

    res.cookie("refresh_token", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("access_token", result.accessToken, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 15 * 60 * 1000,
    });

    this.logger.log(`✅ Connexion réussie pour: ${loginDto.email}`);

    return res.json({
      accessToken: result.accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isAdmin: result.user.role === UserRole.ADMIN,
      },
      message: "Connexion réussie",
    });
  }

  @Post("refresh")
  @ApiOperation({ summary: "Rafraîchir le token" })
  @ApiResponse({ status: 200, description: "Token rafraîchi" })
  @ApiResponse({ status: 401, description: "Refresh token invalide" })
  async refresh(
    @Request() req: CustomRequest,
    @Body() body: any,
    @Res() res: Response,
  ) {
    this.logger.log("🔄 Requête de rafraîchissement de token reçue");

    const refreshToken = req.cookies?.refresh_token || body?.refreshToken;

    if (!refreshToken) {
      this.logger.warn("❌ Refresh token manquant dans les cookies et body");
      this.clearAuthCookies(res);
      return res.status(401).json({
        message: "Refresh token manquant",
        loggedOut: true,
      });
    }

    try {
      const result = await this.authService.refresh(refreshToken);

      if (result.sessionExpired) {
        this.logger.log("🔒 Session expirée - nettoyage cookies");
        this.clearAuthCookies(res);
        return res.status(401).json({
          loggedOut: true,
          sessionExpired: true,
          message: "Session expirée après 25 minutes",
        });
      }

      if (!result.accessToken) {
        this.logger.error("❌ Access token non généré");
        throw new BadRequestException("Access token non généré");
      }

      const cookieOptions = this.getCookieOptions(req);

      if (result.refreshToken) {
        res.cookie("refresh_token", result.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        this.logger.log("✅ Refresh token cookie mis à jour");
      }

      res.cookie("access_token", result.accessToken, {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 15 * 60 * 1000,
      });

      this.logger.log("✅ Tokens rafraîchis avec succès");

      return res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: "Tokens rafraîchis avec succès",
        expiresIn: 15 * 60,
      });

    } catch (error: any) {
      this.logger.error(`❌ Erreur rafraîchissement: ${error.message}`);
      this.clearAuthCookies(res);

      let errorMessage = "Session expirée - veuillez vous reconnecter";
      let statusCode = 401;

      if (error instanceof BadRequestException) {
        errorMessage = error.message;
        statusCode = 400;
      }

      return res.status(statusCode).json({
        message: errorMessage,
        loggedOut: true,
        requiresReauth: true,
      });
    }
  }

  @Post("register")
  @ApiOperation({ summary: "Inscription utilisateur" })
  @ApiResponse({ status: 201, description: "Utilisateur créé" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    this.logger.log(`📝 Tentative d'inscription pour: ${registerDto.email}`);

    try {
      const result = await this.authService.register(registerDto);
      const cookieOptions = this.getCookieOptions();

      res.cookie("refresh_token", result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("access_token", result.accessToken, {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 15 * 60 * 1000,
      });

      this.logger.log(`✅ Inscription réussie pour: ${registerDto.email}`);

      return res.status(201).json({
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isAdmin: result.user.role === UserRole.ADMIN,
          isActive: result.user.isActive,
        },
        message: "Inscription réussie",
      });

    } catch (error: any) {
      this.logger.error(`❌ Erreur inscription pour ${registerDto.email}: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message || "Une erreur est survenue lors de l'inscription",
      );
    }
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Déconnexion" })
  async logout(@Request() req: any, @Res() res: Response) {
    const token = req.headers.authorization?.split(" ")[1] || "";
    const userId = req.user?.sub || req.user?.userId;

    this.logger.log(`🚪 Déconnexion pour l'utilisateur ID: ${userId}`);

    if (userId && token) {
      await this.authService.logoutWithSessionDeletion(userId, token);
    }

    this.clearAuthCookies(res);

    this.logger.log(`✅ Déconnexion réussie pour l'utilisateur ID: ${userId}`);

    return res.json({ message: "Déconnexion réussie" });
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Déconnexion de tous les utilisateurs non-admin" })
  async logoutAll(@Request() req: any, @Res() res: Response) {
    const currentAdmin = req.user;
    this.logger.log(`🛡️ Admin initie une déconnexion globale: ${currentAdmin.email}`);

    try {
      const result = await this.authService.logoutAll();

      this.logger.log(`✅ Déconnexion globale réussie: ${result.loggedOutCount} utilisateurs déconnectés`);

      return res.json({
        success: true,
        message: result.message,
        stats: {
          usersLoggedOut: result.loggedOutCount,
          adminPreserved: true,
        },
      });
    } catch (error: any) {
      this.logger.error(`❌ Erreur déconnexion globale: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la déconnexion globale",
      });
    }
  }

  // ==================== 👤 ENDPOINTS PROFIL UTILISATEUR ====================

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer le profil utilisateur" })
  async getProfile(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    if (!userId) {
      this.logger.error("❌ ID utilisateur manquant dans la requête");
      throw new BadRequestException("ID utilisateur manquant dans le token");
    }

    this.logger.log(`📋 Récupération du profil pour l'utilisateur ID: ${userId}`);

    try {
      const user = await this.authService.getProfile(userId);

      this.logger.log(`✅ Profil récupéré avec succès pour: ${user.email}`);

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
      this.logger.error(`❌ Erreur récupération profil pour ID ${userId}: ${error.message}`);
      throw error;
    }
  }

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

    this.logger.log(`🔑 Mise à jour mot de passe pour l'utilisateur ID: ${userId}`);

    if (body.newPassword !== body.confirmNewPassword) {
      this.logger.warn("❌ Les mots de passe ne correspondent pas");
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }

    await this.usersService.updatePassword(userId, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmNewPassword: body.confirmNewPassword,
    });

    this.logger.log(`✅ Mot de passe mis à jour avec succès pour l'utilisateur ID: ${userId}`);

    return { message: "Mot de passe mis à jour avec succès" };
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Demande de réinitialisation de mot de passe" })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`📧 Demande de réinitialisation pour: ${forgotPasswordDto.email}`);

    await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);

    this.logger.log(`✅ Email de réinitialisation envoyé à: ${forgotPasswordDto.email}`);

    return {
      message: "Si votre email est enregistré, vous recevrez un lien de réinitialisation",
    };
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Réinitialiser le mot de passe" })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log("🔄 Réinitialisation du mot de passe");

    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    this.logger.log("✅ Mot de passe réinitialisé avec succès");

    return { message: "Mot de passe réinitialisé avec succès" };
  }

  // ==================== 🔧 MÉTHODES UTILITAIRES PRIVÉES ====================

  private clearAuthCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions: any = {
      httpOnly: true,
      path: '/',
    };

    if (isProduction) {
      cookieOptions.secure = true;
      cookieOptions.sameSite = 'none';
      cookieOptions.domain = '.panameconsulting.com';
    } else {
      cookieOptions.secure = false;
      cookieOptions.sameSite = 'lax';
    }

    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("access_token", { 
      ...cookieOptions, 
      httpOnly: false 
    });

    this.logger.log("🍪 Cookies d'authentification nettoyés");
  }
}