import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { LocalAuthGuard } from '../shared/guards/local-auth.guard';
import { ThrottleGuard } from '../shared/guards/throttle.guard';
import { LoggingInterceptor } from '../shared/interceptors/logging.interceptor';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { AuthConstants } from './auth.constants';

interface CustomRequest extends Request {
  cookies?: {
    refresh_token?: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('login')
  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req: { user: any },
    @Res({ passthrough: true }) res: Response
  ) {
    if (!req.user) {
      return {
        message: 'Email ou mot de passe incorrect',
        code: 'INVALID CREDENTIALS',
        timestamp: new Date().toISOString(),
      };
    }

    console.log('Login - Génération des tokens...');
    const result = await this.authService.login(req.user);

    // Définir les cookies
    console.log('Définition du refresh_token cookie');
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: AuthConstants.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
    });

    console.log('Définition du access_token cookie');
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: AuthConstants.ACCESS_TOKEN_EXPIRATION_SECONDS * 1000,
    });

    console.log('Login réussi - cookies définis');

    // Retourner la réponse JSON
    return {
      access_token: result.access_token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        telephone: result.user.telephone,
        role: result.user.role,
        isAdmin: result.user.role === UserRole.ADMIN,
      },
      message: 'Connexion réussie',
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rafraîchir le token' })
  @ApiResponse({ status: 200, description: 'Token rafraîchi' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async refresh(
    @Request() req: CustomRequest,
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    // Lire le refresh_token depuis les cookies ou le body
    const refresh_token = req.cookies?.refresh_token || body?.refresh_token;

    console.log('Refresh - Vérification du refresh_token...');
    console.log('Refresh token présent:', !!refresh_token);

    if (!refresh_token) {
      console.error('Refresh token manquant');
      this.clearAuthCookies(res);
      return {
        message: 'Refresh token manquant',
        loggedOut: true,
        requiresReauth: true,
      };
    }

    try {
      console.log('Appel du service refresh...');
      const result = await this.authService.refresh(refresh_token);

      if (result.sessionExpired) {
        console.warn('Session expirée détectée');
        this.clearAuthCookies(res);
        return {
          loggedOut: true,
          sessionExpired: true,
          message: 'Session expirée après 30 minutes',
        };
      }

      if (!result.access_token) {
        throw new BadRequestException('Access token non généré');
      }

      console.log('Nouveaux tokens générés');

      // Définir le nouveau refresh_token si présent
      if (result.refresh_token) {
        console.log('Mise à jour du refresh_token cookie');
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
          maxAge: AuthConstants.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
        });
      }

      // Définir le nouveau access_token
      console.log('Mise à jour du access_token cookie');
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: AuthConstants.ACCESS_TOKEN_EXPIRATION_SECONDS * 1000,
      });

      console.log('Refresh réussi - cookies mis à jour');

      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        message: 'Tokens rafraîchis avec succès',
        expiresIn: AuthConstants.ACCESS_TOKEN_EXPIRATION_SECONDS,
      };
    } catch (error: any) {
      console.error('Erreur lors du refresh:', error.message);
      this.clearAuthCookies(res);

      let errorMessage = 'Session expirée - veuillez vous reconnecter';
      let statusCode = 401;

      if (error instanceof BadRequestException) {
        errorMessage = error.message;
        statusCode = 400;
      }

      return {
        message: errorMessage,
        loggedOut: true,
        requiresReauth: true,
      };
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Inscription utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const result = await this.authService.register(registerDto);
      
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: AuthConstants.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
      });

      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: AuthConstants.ACCESS_TOKEN_EXPIRATION_SECONDS * 1000,
      });

      return {
        access_token: result.access_token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          telephone: result.user.telephone,
          role: result.user.role,
          isAdmin: result.user.role === UserRole.ADMIN,
          isActive: result.user.isActive,
        },
        message: 'Inscription réussie',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message || "Une erreur est survenue lors de l'inscription"
      );
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user?.id;
    const token =
      req.headers.authorization?.split(' ')[1] ||
      req.cookies?.access_token ||
      '';

    if (userId && token) {
      await this.authService.logoutWithSessionDeletion(userId, token);
    }

    this.clearAuthCookies(res);

    return {
      message: 'Déconnexion réussie',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Déconnexion de tous les utilisateurs non-admin' })
  async logoutAll(
    @Request() _req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const result = await this.authService.logoutAll();

      // Effacer les cookies de l'admin qui a fait l'action
      this.clearAuthCookies(res);

      return {
        success: result.success,
        message: result.message,
        stats: {
          usersLoggedOut: result.stats.usersLoggedOut,
          adminPreserved: result.stats.adminPreserved,
          adminEmail: result.stats.adminEmail,
          duration: result.stats.duration || '24 heures',
          timestamp: result.stats.timestamp || new Date().toISOString(),
          userEmails: result.stats.userEmails || [],
        },
      };
    } catch {
      return {
        success: false,
        message: 'Erreur lors de la déconnexion globale',
      };
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer le profil utilisateur' })
  async getProfile(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn('ID utilisateur manquant dans le token');
      throw new BadRequestException('ID utilisateur manquant');
    }

    try {
      const user = await this.authService.getProfile(userId);

      return {
        id: user.id || userId,
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
        `Erreur récupération profil: ${this.maskUserId(userId)}`
      );
      throw error;
    }
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour le mot de passe' })
  async updatePassword(
    @Request() req: any,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    }
  ) {
    const userId = req.user?.id;

    if (!body.currentPassword || body.currentPassword.trim() === '') {
      throw new BadRequestException('Le mot de passe actuel est requis');
    }

    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    if (body.newPassword.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères'
      );
    }

    try {
      await this.usersService.updatePassword(userId, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmNewPassword: body.confirmNewPassword,
      });

      return {
        success: true,
        message: 'Mot de passe mis à jour avec succès',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.message.includes('mot de passe actuel incorrect')) {
        throw new BadRequestException('Le mot de passe actuel est incorrect');
      }

      if (error.message.includes('Configuration du compte invalide')) {
        throw new BadRequestException(
          "Problème technique avec votre compte. Contactez l'administrateur."
        );
      }

      throw error;
    }
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);

    return {
      message:
        'Si votre email est enregistré, vous recevrez un lien de réinitialisation',
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  private clearAuthCookies(res: Response): void {
    console.log("Nettoyage des cookies d'authentification");

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    console.log('Cookies nettoyés');
  }

  private maskUserId(userId: string): string {
    if (!userId || typeof userId !== 'string' || userId.length <= 6)
      return 'user_***';
    return `user_${userId.substring(0, 3)}***${userId.substring(userId.length - 3)}`;
  }

}