import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';
import { UserRole } from '@prisma/client';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../interfaces/current-user.interface';
import { AuthConstants } from '../common/constants/auth.constants';

import { RegisterDto, LoginDto, ResetPasswordDto } from './dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('auth')
@Controller('')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  private readonly cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
  };

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log('POST /auth/register -> 201');
    return this.authService.register(registerDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion de l'utilisateur" })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(
    @Request() req: ExpressRequest & { user: CurrentUserType },
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    this.logger.log('POST /auth/login -> 200');
    const loginResponse = await this.authService.login(
      req.user,
      loginDto.remember_me ?? false,
    );

    response.cookie('access_token', loginResponse.access_token, {
      ...this.cookieOptions,
      maxAge: AuthConstants.ACCESS_TOKEN_EXPIRATION_MS,
    });

    response.cookie('refresh_token', loginResponse.refresh_token, {
      ...this.cookieOptions,
      maxAge: loginResponse.remember_me
        ? AuthConstants.REMEMBER_ME_EXPIRATION_MS
        : AuthConstants.REFRESH_TOKEN_EXPIRATION_MS,
    });

    return loginResponse;
  }

  /**
   * Le refresh_token est lu depuis req.cookies en priorité (cookie httpOnly),
   * puis depuis le body en fallback (Safari ITP, dev HTTP).
   */
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchissement des tokens' })
  async refreshToken(
    @CurrentUser() user: CurrentUserType,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log('POST /auth/refresh -> 200');
    const cookies = req.cookies as Record<string, string | undefined>;
    const refreshToken =
      cookies['refresh_token'] ?? refreshTokenDto.refresh_token;

    if (!refreshToken) {
      this.logger.warn('POST /auth/refresh -> 401');
      throw new UnauthorizedException('Refresh token manquant');
    }

    const result = await this.authService.refreshToken(user.id, refreshToken);

    response.cookie('access_token', result.access_token, {
      ...this.cookieOptions,
      maxAge: AuthConstants.ACCESS_TOKEN_EXPIRATION_MS,
    });

    response.cookie('refresh_token', result.refresh_token, {
      ...this.cookieOptions,
      maxAge: result.isRememberMe
        ? AuthConstants.REMEMBER_ME_EXPIRATION_MS
        : AuthConstants.REFRESH_TOKEN_EXPIRATION_MS,
    });

    return {
      message: 'Tokens rafraîchis',
      data: { refresh_token: result.refresh_token },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Déconnexion de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(
    @CurrentUser() user: CurrentUserType,
    @Body() logoutDto: LogoutDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log('POST /auth/logout -> 200');
    await this.authService.logout(user.id, logoutDto.refresh_token);

    response.clearCookie('access_token', this.cookieOptions);
    response.clearCookie('refresh_token', this.cookieOptions);

    return { message: 'Déconnexion réussie' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/auth/logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion de toutes les sessions (admin)' })
  @ApiResponse({ status: 200, description: 'Déconnexion globale réussie' })
  async logoutAll(
    @CurrentUser() user: CurrentUserType,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log('POST /admin/auth/logout-all -> 200');
    const result = await this.authService.logoutAll(user.id);

    response.clearCookie('access_token', this.cookieOptions);
    response.clearCookie('refresh_token', this.cookieOptions);

    return result;
  }

  @Public()
  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
  @ApiResponse({ status: 200, description: 'Email envoyé si le compte existe' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log('POST /auth/forgot-password -> 200');
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialisation du mot de passe' })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log('POST /auth/reset-password -> 200');
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.new_password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de mot de passe' })
  @ApiResponse({ status: 200, description: 'Mot de passe changé avec succès' })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  async changePassword(
    @CurrentUser() user: CurrentUserType,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log('POST /auth/change-password -> 200');
    return this.authService.changePassword(
      user.id,
      changePasswordDto.old_password,
      changePasswordDto.new_password,
    );
  }
}
