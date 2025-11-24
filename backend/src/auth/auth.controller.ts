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
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // ==================== 🔐 ENDPOINTS D'AUTHENTIFICATION ====================

  @Post("login")
  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @ApiOperation({ summary: "Connexion utilisateur" })
  @ApiResponse({ status: 200, description: "Connexion réussie" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: { user: any },
    @Res() res: Response,
  ) {
    console.log("🔐 Tentative de connexion");

    const result = await this.authService.login(req.user);

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production"
          ? ".panameconsulting.com"
          : undefined,
    };

    res.cookie("refresh_token", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("access_token", result.accessToken, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 15 * 60 * 1000,
    });

    console.log("✅ Connexion réussie.");

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
    console.log("🔄 Requête de rafraîchissement reçue");

    const refreshToken = body?.refreshToken || req.cookies?.refresh_token;

    if (!refreshToken) {
      console.warn("❌ Refresh token manquant");
      this.clearAuthCookies(res);
      return res.status(401).json({
        message: "Refresh token manquant",
        loggedOut: true,
      });
    }

    try {
      const result = await this.authService.refresh(refreshToken);

      // ✅ GESTION SESSION EXPIREE
      if (result.sessionExpired) {
        console.log("🔒 Session expirée - nettoyage cookies");
        this.clearAuthCookies(res);
        return res.status(401).json({
          loggedOut: true,
          sessionExpired: true,
          message: "Session expirée après 25 minutes",
        });
      }

      // ✅ VALIDATION DES TOKENS
      if (!result.accessToken) {
        console.error("❌ Access token non généré");
        throw new BadRequestException("Access token non généré");
      }

      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        domain:
          process.env.NODE_ENV === "production"
            ? ".panameconsulting.com"
            : undefined,
        path: "/",
      };

      // ✅ MISE À JOUR COOKIE REFRESH TOKEN
      if (result.refreshToken) {
        res.cookie("refresh_token", result.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        });
        console.log("✅ Refresh token cookie mis à jour");
      }

      // ✅ MISE À JOUR COOKIE ACCESS TOKEN
      res.cookie("access_token", result.accessToken, {
        ...cookieOptions,
        httpOnly: false, // Accessible par le frontend
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      console.log("✅ Tokens rafraîchis avec succès");

      // ✅ RÉPONSE STANDARDISÉE
      return res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: "Tokens rafraîchis avec succès",
        expiresIn: 15 * 60, // 15 minutes en secondes
      });
    } catch (error: any) {
      console.error("❌ Erreur rafraîchissement:", error.message);

      // ✅ NETTOYAGE COMPLET EN CAS D'ERREUR
      this.clearAuthCookies(res);

      // ✅ GESTION D'ERREURS SPÉCIFIQUES
      let errorMessage = "Refresh token invalide";
      let statusCode = 401;

      if (error instanceof BadRequestException) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (
        error.message?.includes("whitelist") ||
        error.message?.includes("autorisé")
      ) {
        errorMessage = "Session invalide - veuillez vous reconnecter";
      } else if (error.message?.includes("expiré")) {
        errorMessage = "Session expirée - veuillez vous reconnecter";
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
  async register(@Body() registerDto: RegisterDto) {
    console.log("📝 Tentative d'inscription pour:", registerDto.email);

    try {
      const result = await this.authService.register(registerDto);

      console.log("✅ Inscription réussie .");

      return {
        access_token: result.access_token,
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
      };
    } catch (error: any) {
      console.error("❌ Erreur inscription:", error.message);

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

    console.log("🚪 Déconnexion pour l'utilisateur.");

    if (userId && token) {
      await this.authService.logoutWithSessionDeletion(userId, token);
    }

    this.clearAuthCookies(res);

    return res.json({ message: "Déconnexion réussie" });
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Déconnexion de tous les utilisateurs non-admin" })
  async logoutAll(@Request() req: any, @Res() res: Response) {
    const currentAdmin = req.user;
    console.log("🛡️ Admin initie une déconnexion globale:", currentAdmin.email);

    try {
      const result = await this.authService.logoutAll();

      console.log("✅ Déconnexion globale réussie");

      return res.json({
        success: true,
        message: result.message,
        stats: {
          usersLoggedOut: result.loggedOutCount,
          adminPreserved: true,
        },
      });
    } catch (error: any) {
      console.error("❌ Erreur déconnexion globale:", error.message);
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
      console.error("❌ ID utilisateur manquant");
      throw new BadRequestException("ID utilisateur manquant dans le token");
    }

    console.log(
      "📋 Récupération du profil pour l'utilisateur exécutant la réquête.",
    );

    try {
      const user = await this.authService.getProfile(userId);

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
      console.error("❌ Erreur récupération profil:", error.message);
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

    console.log("🔑 Mise à jour mot de passe .");

    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }

    await this.usersService.updatePassword(userId, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmNewPassword: body.confirmNewPassword,
    });

    console.log("✅ Mot de passe mis à jour .");

    return { message: "Mot de passe mis à jour avec succès" };
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Demande de réinitialisation de mot de passe" })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    console.log(
      "📧 Demande de réinitialisation pour:",
      forgotPasswordDto.email,
    );

    await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);

    return {
      message:
        "Si votre email est enregistré, vous recevrez un lien de réinitialisation",
    };
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Réinitialiser le mot de passe" })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    console.log("🔄 Réinitialisation du mot de passe");

    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return { message: "Mot de passe réinitialisé avec succès" };
  }

  // ==================== 🔧 MÉTHODES UTILITAIRES PRIVÉES ====================

  private clearAuthCookies(res: Response): void {
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production"
          ? ".panameconsulting.com"
          : undefined,
      path: "/",
    };

    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("access_token", cookieOptions);
  }
}
