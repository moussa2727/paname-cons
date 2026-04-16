// src/auth/auth.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditAction, UserRole, RevocationReason } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { RefreshTokenRepository } from '../tokens/refresh-token.repository';
import { ResetTokenRepository } from '../tokens/reset-token.repository';
import { AuditService } from '../common/logger/audit.service';
import { CurrentUser } from '../interfaces/current-user.interface';
import { RegisterDto } from './dto';
import { MailService } from '../mail/mail.service';
import { AuthConstants } from '../common/constants/auth.constants';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: 900;
  remember_me: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    telephone: string;
    role: UserRole;
    isActive: boolean;
    canLogin: boolean;
    isTemporarilyLoggedOut: boolean;
    logoutUntil: Date | null;
    lastLogin: Date | null;
    loginCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  isRememberMe: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly resetTokenRepository: ResetTokenRepository,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  private isAdminEmail(email: string): boolean {
    return email === this.configService.get<string>('ADMIN_EMAIL');
  }

  async validateUser(email: string, password: string): Promise<CurrentUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn('Login failed: user not found');
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isActive) {
      this.logger.warn('Login failed: account disabled');
      throw new UnauthorizedException(
        'Compte utilisateur désactivé : Contactez la société',
      );
    }

    if (user.logoutUntil && new Date() < user.logoutUntil) {
      this.logger.warn('Login failed: account temporarily disabled');
      const date = user.logoutUntil.toLocaleDateString('fr-FR');
      const time = user.logoutUntil.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new UnauthorizedException(
        `Compte temporairement désactivé jusqu'au ${date} à ${time}`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Login failed: invalid password');
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    return user;
  }

  async login(
    user: CurrentUser,
    rememberMe: boolean = false,
  ): Promise<LoginResponse> {
    this.logger.log('Login successful');

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const expiresAt = new Date(
      Date.now() +
        (rememberMe
          ? AuthConstants.REMEMBER_ME_EXPIRATION_MS
          : AuthConstants.REFRESH_TOKEN_EXPIRATION_MS),
    );

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refresh_token,
      expiresAt,
      isRememberMe: rememberMe,
    });

    await this.usersRepository.incrementLoginCount(user.id);
    await this.usersRepository.updateLastLogin(user.id);

    const updatedUser = await this.usersService.findById(user.id);
    if (!updatedUser) {
      throw new UnauthorizedException('Utilisateur non trouvé après login');
    }

    const canLogin =
      updatedUser.isActive &&
      (!updatedUser.logoutUntil || new Date() >= updatedUser.logoutUntil);

    const isTemporarilyLoggedOut = updatedUser.logoutUntil
      ? new Date() < updatedUser.logoutUntil
      : false;

    await this.auditService.logUserAction(user.id, AuditAction.UPDATE, {
      email: user.email,
      action: 'LOGIN_SUCCESS',
    });

    this.logger.log('Login completed');

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: 'Bearer',
      expires_in: 900,
      remember_me: rememberMe,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
        telephone: updatedUser.telephone,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        canLogin,
        isTemporarilyLoggedOut,
        logoutUntil: updatedUser.logoutUntil,
        lastLogin: updatedUser.lastLogin,
        loginCount: updatedUser.loginCount,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    this.logger.log('Register attempt');

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      this.logger.warn('Register failed: email already exists');
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    if (this.isAdminEmail(registerDto.email)) {
      const existingAdmin = await this.usersRepository.findByRole(
        UserRole.ADMIN,
      );
      if (existingAdmin) {
        throw new ConflictException('Un compte administrateur existe déjà');
      }
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      parseInt(this.configService.get<string>('BCRYPT_ROUNDS') ?? '12', 10),
    );

    const userRole = this.isAdminEmail(registerDto.email)
      ? UserRole.ADMIN
      : UserRole.USER;

    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: userRole,
      telephone: registerDto.telephone,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refresh_token,
      expiresAt: new Date(
        Date.now() + AuthConstants.REFRESH_TOKEN_EXPIRATION_MS,
      ),
      isRememberMe: false,
    });

    // Email welcome via MailService
    await this.mailService.sendWelcomeEmail(user.email, user.firstName);

    await this.auditService.logUserAction(user.id, AuditAction.CREATE, {
      email: user.email,
    });

    this.logger.log('Register successful');

    return {
      message: 'Inscription réussie. Vous pouvez maintenant vous connecter.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        telephone: user.telephone,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    const tokenDoc =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (
      !tokenDoc ||
      tokenDoc.userId !== userId ||
      !tokenDoc.isActive ||
      tokenDoc.expiresAt < new Date()
    ) {
      this.logger.warn('Token refresh failed: invalid token');
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn('Token refresh failed: user not found');
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const tokens = await this.generateTokens(userId, user.email, user.role);

    const isRememberMe = tokenDoc.isRememberMe;
    const expiresAt = new Date(
      Date.now() +
        (isRememberMe
          ? AuthConstants.REMEMBER_ME_EXPIRATION_MS
          : AuthConstants.REFRESH_TOKEN_EXPIRATION_MS),
    );

    await this.refreshTokenRepository.deactivate(
      tokenDoc.id,
      RevocationReason.MANUAL_LOGOUT,
    );

    await this.refreshTokenRepository.create({
      userId,
      token: tokens.refresh_token,
      expiresAt,
      isRememberMe,
      ipAddress: tokenDoc.ipAddress ?? undefined,
      userAgent: tokenDoc.userAgent ?? undefined,
    });

    await this.auditService.logUserAction(userId, AuditAction.UPDATE, {
      action: 'TOKEN_REFRESHED',
    });

    this.logger.log('Token refreshed');

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isRememberMe,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    this.logger.log('Logout initiated');

    await this.usersRepository.update(userId, { lastLogout: new Date() });
    await this.usersRepository.decrementLoginCount(userId);
    await this.usersRepository.incrementLogoutCount(userId);

    if (refreshToken) {
      const tokenDoc =
        await this.refreshTokenRepository.findByToken(refreshToken);
      if (tokenDoc && tokenDoc.userId === userId) {
        await this.refreshTokenRepository.deactivate(
          tokenDoc.id,
          RevocationReason.MANUAL_LOGOUT,
        );
      }
    } else {
      await this.refreshTokenRepository.deactivateAllForUser(
        userId,
        RevocationReason.MANUAL_LOGOUT,
      );
    }

    await this.auditService.logUserAction(userId, AuditAction.UPDATE, {
      action: 'LOGOUT_SUCCESS',
    });

    this.logger.log('Logout completed');

    return { message: 'Déconnexion réussie' };
  }

  async logoutAll(adminUserId: string) {
    this.logger.log('Logout all initiated');

    const count = await this.refreshTokenRepository.deactivateAllExceptUser(
      adminUserId,
      RevocationReason.ADMIN_REVOKE,
    );

    await this.auditService.logUserAction(adminUserId, AuditAction.UPDATE, {
      action: 'LOGOUT_ALL_USERS',
    });

    this.logger.log(`Logout all completed: ${count} sessions terminated`);

    return {
      message:
        'Toutes les sessions utilisateurs ont été déconnectées (admin épargné)',
      sessionsTerminated: count,
    };
  }

  async forgotPassword(email: string) {
    this.logger.log('Forgot password request');
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message: 'Email de réinitialisation envoyé si le compte existe',
      };
    }

    await this.resetTokenRepository.invalidateAllForUser(user.id);

    const resetToken = await this.resetTokenRepository.create({
      userId: user.id,
      expiresIn: 2 * 60 * 60 * 1000, // 2 heures
    });

    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reinitialiser-mot-de-passe?token=${resetToken.token}`;

    // Send reset password email via MailService
    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.firstName,
      resetLink,
    );

    await this.auditService.logUserAction(user.id, AuditAction.UPDATE, {
      email: user.email,
      action: 'PASSWORD_RESET_REQUEST',
    });

    return { message: 'Email de réinitialisation envoyé si le compte existe' };
  }

  async resetPassword(token: string, newPassword: string) {
    this.logger.log('Reset password attempt');
    const resetToken = await this.resetTokenRepository.findByToken(token);

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.used) {
      this.logger.warn('Reset password failed: invalid token');
      throw new BadRequestException('Token invalide ou expiré');
    }

    await this.usersService.updatePassword(resetToken.userId, newPassword);
    await this.resetTokenRepository.markAsUsed(resetToken.id);

    await this.auditService.logUserAction(
      resetToken.userId,
      AuditAction.UPDATE,
      { action: 'PASSWORD_RESET' },
    );

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    this.logger.log('Change password attempt');
    const user = await this.usersRepository.findByIdWithPassword(userId);
    if (!user) {
      this.logger.warn('Change password failed: user not found');
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Change password failed: invalid old password');
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    await this.usersService.updatePassword(userId, newPassword);

    // Send password changed email via MailService
    await this.mailService.sendPasswordChangedEmail(user.email, user.firstName);

    await this.auditService.logUserAction(userId, AuditAction.UPDATE, {
      action: 'PASSWORD_CHANGED',
    });

    return { message: 'Mot de passe changé avec succès' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('JWT secrets not configured');
      throw new Error('JWT secrets non configurés');
    }

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: AuthConstants.ACCESS_TOKEN_EXPIRATION,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
      }),
    ]);

    return { access_token, refresh_token };
  }
}
