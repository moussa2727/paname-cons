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
import { randomUUID } from 'crypto';
import { AuditAction, UserRole, RevocationReason } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { RefreshTokenRepository } from '../tokens/refresh-token.repository';
import { ResetTokenRepository } from '../tokens/reset-token.repository';
import { QueueService } from '../queue/queue.service';
import { AuditService } from '../common/logger/audit.service';
import { CurrentUser } from '../interfaces/current-user.interface';
import { RegisterDto } from './dto';
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
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
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

    const userRole = this.isAdminEmail(registerDto.email)
      ? UserRole.ADMIN
      : UserRole.USER;

    /**
     * ✅ Le hashage est délégué à UsersService.createWithHashedPassword()
     * AuthService ne hache plus lui-même — point unique de hashage dans UsersService.
     */
    const user = await this.usersService.createWithHashedPassword({
      email: registerDto.email,
      password: registerDto.password,
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

    await this.queueService.addEmailJob({
      to: user.email,
      subject: 'Bienvenue chez Paname Consulting',
      html: this.generateWelcomeContent(user),
      priority: 'high',
    });

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

  /**
   * isRememberMe est hérité du tokenDoc en base — jamais depuis le body.
   * Le client ne peut pas upgrader une session false → true après login.
   */
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

    // Réponse générique — ne jamais révéler si l'email existe
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

    await this.queueService.addEmailJob({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: this.generateForgotPasswordContent(user, resetToken.token),
      priority: 'high',
    });

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

    // ✅ Délégué à UsersService.updatePassword() — hashage centralisé
    await this.usersService.updatePassword(resetToken.userId, newPassword);
    await this.resetTokenRepository.markAsUsed(resetToken.id);

    await this.auditService.logUserAction(
      resetToken.userId,
      AuditAction.UPDATE,
      {
        action: 'PASSWORD_RESET',
      },
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

    /**
     * ✅ FIX : on délègue à UsersService.updatePassword() qui hache le mot de passe
     * avant de le passer au repository.
     * Avant : usersRepository.updatePassword(userId, newPassword) → mot de passe en CLAIR en base.
     */
    await this.usersService.updatePassword(userId, newPassword);

    return { message: 'Mot de passe changé avec succès' };
  }

  // ==================== PRIVÉ ====================

  /**
   * Génère une paire access_token / refresh_token.
   *
   * ✅ FIX DUPLICATE KEY : chaque token contient un `jti` (JWT ID) UUID v4 unique.
   * Sans jti, deux appels dans la même seconde produisaient le même JWT
   * (même payload + même iat) → violation de contrainte unique en base.
   */
  private async generateTokens(userId: string, email: string, role: string) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('JWT secrets not configured');
      throw new Error('JWT secrets non configurés');
    }

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, jti: randomUUID() },
        {
          secret: jwtSecret,
          expiresIn: AuthConstants.ACCESS_TOKEN_EXPIRATION,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role, jti: randomUUID() },
        {
          secret: jwtRefreshSecret,
          expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
        },
      ),
    ]);

    return { access_token, refresh_token };
  }

  private generateForgotPasswordContent(
    user: { firstName: string; email: string },
    token: string,
  ): string {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reinitialiser-mot-de-passe?token=${token}`;

    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bonjour <strong>${user.firstName}</strong>,</p>
        <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Instructions de réinitialisation</h3>
          <p style="margin:0;">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Réinitialiser mon mot de passe</a>
          </div>
          <p style="margin:10px 0 0 0;font-size:12px;color:#666;">Ou copiez-collez ce lien : <br>${resetLink}</p>
        </div>
        <div style="background:#fef3c7;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
          <h4 style="margin-top:0;color:#d97706;">⚠️ Important</h4>
          <ul style="margin:10px 0;padding-left:20px;color:#666;">
            <li>Ce lien expire dans <strong>2 heures</strong></li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            <li>Ne partagez jamais ce lien avec personne</li>
          </ul>
        </div>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>Paname Consulting</strong></p>
      </div>`;
  }

  private generateWelcomeContent(user: {
    firstName: string;
    email: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bienvenue <strong>${user.firstName}</strong> !</p>
        <p>Nous sommes ravis de vous accueillir au sein de Paname Consulting.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre compte a été créé</h3>
          <p style="margin:0;">Vous pouvez maintenant accéder à votre espace personnel et commencer votre parcours avec nous.</p>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${this.configService.get<string>('FRONTEND_URL')}/login" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Me connecter</a>
        </div>
        <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>L'équipe Paname Consulting</strong></p>
      </div>`;
  }
}
