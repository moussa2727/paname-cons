import {
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
    BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail/mail.service';
import { ResetToken } from '../schemas/reset-token.schema';
import { User, UserRole } from '../schemas/user.schema';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RevokedTokenService } from './revoked-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { SessionService } from './session.service';
import { AuthConstants } from './auth.constants';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly loginAttempts = new Map<string, {
        attempts: number,
        lastAttempt: Date,
        ttl: Date
    }>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService,
        private readonly mailService: MailService,
        private readonly revokedTokenService: RevokedTokenService,
        private readonly refreshTokenService: RefreshTokenService,
        @InjectModel(ResetToken.name)
        private readonly resetTokenModel: Model<ResetToken>,
    ) { }

    // Helper function pour convertir l'ObjectId en string
    private convertObjectIdToString(id: any): string {
        if (id instanceof Types.ObjectId) {
            return id.toString();
        }
        return String(id);
    }

    // Gestion des tentatives de connexion
    private getLoginAttempts(email: string): { attempts: number, lastAttempt: Date } {
        this.cleanupExpiredAttempts();
        const data = this.loginAttempts.get(email);
        return data ? { 
            attempts: data.attempts, 
            lastAttempt: data.lastAttempt 
        } : { attempts: 0, lastAttempt: new Date(0) };
    }

    private incrementLoginAttempts(email: string): void {
        const current = this.loginAttempts.get(email) || { 
            attempts: 0, 
            lastAttempt: new Date(0),
            ttl: new Date()
        };
        
        current.attempts++;
        current.lastAttempt = new Date();
        current.ttl = new Date(Date.now() + AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES * 60 * 1000);
        
        this.loginAttempts.set(email, current);
        this.logger.warn(`Tentative de connexion échouée pour ${email}. Tentatives: ${current.attempts}`);
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

   async register(registerDto: RegisterDto) {
  try {
    const existingAdmin = await this.usersService.findByRole(UserRole.ADMIN);
    if (existingAdmin) {
      registerDto.role = UserRole.USER;
    } else {
      registerDto.role = UserRole.ADMIN;
    }

    const newUser = await this.usersService.create(registerDto);
    const jti = uuidv4();
    const userId = this.convertObjectIdToString(newUser._id);

    // ✅ GÉNÉRATION DES DEUX TOKENS (comme dans login)
    const jtiAccess = uuidv4();
    const jtiRefresh = uuidv4();

    const accessPayload = {
      email: newUser.email,
      sub: userId,
      role: newUser.role,
      jti: jtiAccess,
      tokenType: 'access'
    };

    const refreshPayload = {
      sub: userId,
      email: newUser.email,
      role: newUser.role,
      jti: jtiRefresh,
      tokenType: 'refresh'
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: AuthConstants.JWT_EXPIRATION,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // ✅ CRÉATION SESSION ET WHITELIST
    await this.sessionService.create(
      userId,
      accessToken,
      new Date(Date.now() + 15 * 60 * 1000)
    );

    try {
      await this.refreshTokenService.deactivateAllForUser(userId);
      const decodedRefresh = this.jwtService.decode(refreshToken) as any;
      const refreshExp = new Date(((decodedRefresh?.exp || 0) * 1000) || (Date.now() + 7 * 24 * 60 * 60 * 1000));
      await this.refreshTokenService.create(userId, refreshToken, refreshExp);
    } catch (error) {
      this.logger.warn(`Impossible d'enregistrer le refresh token: ${error.message}`);
    }

    this.logger.log(`Nouvel utilisateur enregistré: ${newUser.email} (rôle: ${newUser.role})`);

    // ✅ RENVOI COHÉRENT AVEC FRONTEND
    return {
      access_token: accessToken, // ✅ Même clé que frontend
      refreshToken: refreshToken, // ✅ Ajout du refreshToken
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isAdmin: newUser.role === UserRole.ADMIN,
        isActive: newUser.isActive // ✅ Ajout pour cohérence
      }
    };
  } catch (error) {
    this.logger.error(`Erreur lors de l'enregistrement: ${error.message}`);
    throw error;
  }
}

async login(user: User) {
  const jtiAccess = uuidv4();
  const jtiRefresh = uuidv4();
  const userId = this.convertObjectIdToString(user._id);

  const accessPayload = { 
    sub: userId, 
    email: user.email,
    role: user.role,
    jti: jtiAccess,
    tokenType: 'access'
  };

  const refreshPayload = {
    sub: userId,
    email: user.email,
    role: user.role,
    jti: jtiRefresh,
    tokenType: 'refresh'
  };
  
  const accessToken = this.jwtService.sign(accessPayload, {
    expiresIn: AuthConstants.JWT_EXPIRATION,
  });

  const refreshToken = this.jwtService.sign(refreshPayload, {
    expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
    secret: process.env.JWT_REFRESH_SECRET,
  });

  await this.sessionService.create(
    userId,
    accessToken,
    new Date(Date.now() + 15 * 60 * 1000)
  );

  // Whitelist refresh token
  try {
    await this.refreshTokenService.deactivateAllForUser(userId);
    const decodedRefresh = this.jwtService.decode(refreshToken) as any;
    const refreshExp = new Date(((decodedRefresh?.exp || 0) * 1000) || (Date.now() + 7 * 24 * 60 * 60 * 1000));
    await this.refreshTokenService.create(userId, refreshToken, refreshExp);
  } catch (error) {
    this.logger.warn(`Impossible d'enregistrer le refresh token: ${error.message}`);
  }

  // ✅ CORRECTION : Utiliser access_token pour cohérence avec frontend
  return {
    access_token: accessToken, // ✅ Changé de accessToken à access_token
    refreshToken: refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isAdmin: user.role === UserRole.ADMIN, // ✅ Ajout pour cohérence
      isActive: user.isActive // ✅ Ajout pour cohérence
    },
  };
}

    async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; sessionExpired?: boolean }> {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token manquant');
        }

        try {
            // Whitelist enforcement
            let isWhitelisted = await this.refreshTokenService.isValid(refreshToken);
            if (!isWhitelisted) {
                throw new UnauthorizedException('Refresh token non autorisé');
            }

            // Check if already used
            const wasRevoked = await this.revokedTokenService.isTokenRevoked(refreshToken);
            if (wasRevoked) {
                throw new UnauthorizedException('Refresh token déjà utilisé');
            }

            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            if ((payload as any)?.tokenType !== 'refresh') {
                throw new UnauthorizedException('Type de token invalide');
            }

            // Session lifetime check
            const maxSessionMs = AuthConstants.MAX_SESSION_DURATION_MS;
            const issuedAtMs = ((payload as any)?.iat || 0) * 1000;
            if (issuedAtMs && Date.now() - issuedAtMs > maxSessionMs) {
                try {
                    await this.logoutUser((payload as any).sub, 'Session maximale atteinte');
                    await this.refreshTokenService.deactivateByToken(refreshToken);
                } catch (error) {
                    this.logger.warn(`Erreur lors du logout: ${error.message}`);
                }
                return {
                    accessToken: '',
                    refreshToken,
                    sessionExpired: true
                };
            }

            const user = await this.usersService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('Utilisateur non trouvé');
            }

            const userId = this.convertObjectIdToString(user._id);
            const newJti = uuidv4();
            const newAccessToken = this.jwtService.sign(
                { 
                    sub: userId, 
                    email: user.email,
                    role: user.role,
                    jti: newJti,
                    tokenType: 'access'
                },
                { 
                    expiresIn: AuthConstants.JWT_EXPIRATION,
                }
            );

            const newRefreshJti = uuidv4();
            const newRefreshToken = this.jwtService.sign(
                {
                    sub: userId,
                    email: user.email,
                    role: user.role,
                    jti: newRefreshJti,
                    tokenType: 'refresh'
                },
                {
                    expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRATION,
                    secret: process.env.JWT_REFRESH_SECRET,
                }
            );

            await this.sessionService.create(
                userId,
                newAccessToken,
                new Date(Date.now() + 15 * 60 * 1000)
            );

            // Revoke old refresh token
            try {
                const expMs = ((payload as any)?.exp || 0) * 1000;
                await this.revokedTokenService.revokeToken(refreshToken, new Date(expMs || Date.now() + 7 * 24 * 60 * 60 * 1000));
                await this.refreshTokenService.deactivateByToken(refreshToken);
            } catch (error) {
                this.logger.warn(`Impossible de révoquer l'ancien refresh token: ${error.message}`);
            }

            // Whitelist new refresh token
            try {
                const decodedNewRefresh = this.jwtService.decode(newRefreshToken) as any;
                const newExp = new Date(((decodedNewRefresh?.exp || 0) * 1000) || (Date.now() + 7 * 24 * 60 * 60 * 1000));
                await this.refreshTokenService.create(userId, newRefreshToken, newExp);
            } catch (error) {
                this.logger.warn(`Impossible d'enregistrer le nouveau refresh token: ${error.message}`);
            }

            return { 
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            this.logger.error(`Erreur de refresh token: ${error.message}`);
            throw new UnauthorizedException('Refresh token invalide');
        }
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        try {
            const attempts = this.getLoginAttempts(email);

            if (attempts.attempts >= AuthConstants.MAX_LOGIN_ATTEMPTS) {
                const timeSinceLastAttempt = (Date.now() - attempts.lastAttempt.getTime()) / (1000 * 60);
                if (timeSinceLastAttempt < AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES) {
                    throw new UnauthorizedException(
                        `Trop de tentatives. Réessayez dans ${Math.ceil(
                            AuthConstants.LOGIN_ATTEMPTS_TTL_MINUTES - timeSinceLastAttempt
                        )} minutes`
                    );
                } else {
                    this.resetLoginAttempts(email);
                }
            }

            const user = await this.usersService.validateUser(email, password);

            if (!user) {
                this.incrementLoginAttempts(email);
                return null;
            }

            // Maintenance mode check
            const isMaintenance = await this.usersService.isMaintenanceMode();
            if (isMaintenance && user.role !== UserRole.ADMIN) {
                this.logger.warn(`Tentative de connexion bloquée en mode maintenance pour: ${email}`);
                throw new UnauthorizedException(
                    'Le système est en maintenance. Seuls les administrateurs peuvent se connecter.'
                );
            }

            this.resetLoginAttempts(email);
            return user;
        } catch (error) {
            this.logger.error(`Erreur de validation utilisateur pour ${email}: ${error.message}`);
            throw error;
        }
    }

    async logoutAll() {
        const [revokeResult, sessionsResult] = await Promise.all([
            this.revokedTokenService.revokeAllTokens(),
            this.sessionService.deleteAllSessions()
        ]);

        // ✅ CORRECTION : Utiliser usersService pour déconnecter tous les utilisateurs
        const logoutResult = await this.usersService.logoutAll();

        return {
            message: 'Déconnexion système complète effectuée',
            stats: {
                tokensRevoked: revokeResult.revokedCount,
                sessionsCleared: sessionsResult.deletedCount,
                usersLoggedOut: logoutResult.loggedOutCount,
            }
        };
    }
    // Gestion des tokens
    async revokeToken(token: string, expiresAt: Date): Promise<void> {
        try {
            await this.revokedTokenService.revokeToken(token, expiresAt);
            this.logger.log(`Token révoqué: ${token.substring(0, 10)}...`);
        } catch (error) {
            if (error?.code === 11000) {
                this.logger.warn('Token déjà révoqué');
                return;
            }
            this.logger.error(`Erreur de révocation du token: ${error.message}`);
            throw error;
        }
    }

    async isTokenRevoked(token: string): Promise<boolean> {
        return await this.revokedTokenService.isTokenRevoked(token);
    }

    async revokeAllTokens(): Promise<{ 
        message: string, 
        revokedCount: number,
        sessionsCleared: number 
    }> {
        const tokensResult = await this.revokedTokenService.revokeAllTokens();
        const sessionsResult = await this.sessionService.deleteAllSessions();
        
        return {
            message: 'Tokens et sessions révoqués',
            revokedCount: tokensResult.revokedCount,
            sessionsCleared: sessionsResult.deletedCount
        };
    }

    async logoutWithSessionDeletion(userId: string, token: string): Promise<void> {
        try {
            await this.sessionService.deleteSession(token);
            try {
                const decoded = this.jwtService.decode(token) as any;
                if (decoded && decoded.exp) {
                    await this.revokeToken(token, new Date(decoded.exp * 1000));
                }
            } catch (error) {
                this.logger.warn(`Erreur lors de la révocation du token: ${error.message}`);
            }
            this.loginAttempts.delete(userId);
            this.logger.log(`Déconnexion avec suppression de session pour l'utilisateur ${userId}`);
        } catch (error) {
            this.logger.error(`Erreur lors de la déconnexion avec suppression: ${error.message}`);
            throw error;
        }
    }

    async validateToken(token: string): Promise<boolean> {
        try {
            const payload = this.jwtService.verify(token);
            const [isRevoked, isActive] = await Promise.all([
                this.isTokenRevoked(token),
                this.sessionService.isTokenActive(token)
            ]);
            const userExists = await this.usersService.exists(payload.sub);
            return !isRevoked && isActive && userExists;
        } catch (error) {
            this.logger.warn(`Token invalide: ${error.message}`);
            return false;
        }
    }

   
    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            const resetToken = await this.resetTokenModel.findOne({
                token,
                expiresAt: { $gt: new Date() }
            });

            if (!resetToken) {
                throw new UnauthorizedException('Token invalide ou expiré');
            }

            const user = await this.usersService.findById(resetToken.user.toString());
            if (!user) {
                throw new NotFoundException('Utilisateur non trouvé');
            }

            const userId = this.convertObjectIdToString(user._id);
            await this.usersService.resetPassword(userId, newPassword);

            await this.resetTokenModel.deleteOne({ _id: resetToken._id });
            this.logger.log(`Mot de passe réinitialisé pour ${user.email}`);
        } catch (error) {
            this.logger.error(`Erreur de réinitialisation: ${error.message}`);
            throw error;
        }
    }

    private getFrontendUrl(): string {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
        return process.env.FRONTEND_URL || 'https://panameconsulting.com';
    }
    
    // Développement
    return process.env.FRONTEND_URL || 'http://localhost:5173';
}

    async sendPasswordResetEmail(email: string): Promise<void> {
        try {
            const user = await this.usersService.findByEmail(email);
            if (!user) {
                this.logger.warn(`Demande de réinitialisation pour email inexistant: ${email}`);
                return;
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + AuthConstants.RESET_TOKEN_EXPIRATION_MS);

            await this.resetTokenModel.deleteMany({ 
                user: user._id 
            });

            await this.resetTokenModel.create({
                token: resetToken,
                user: user._id,
                expiresAt
            });

            const frontendUrl = this.getFrontendUrl();
            const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
            
            try {
                await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
                this.logger.log(`Email de réinitialisation envoyé à ${email}`);
            } catch (emailError) {
                this.logger.warn(`Échec envoi email - Token pour ${email}: ${resetUrl}`);
            }

        } catch (error) {
            this.logger.error(`Erreur lors de la demande de réinitialisation: ${error.message}`);
        }
    }

    async getProfile(userId: string): Promise<User> {
        try {
            this.logger.log(`Tentative de récupération du profil pour l'utilisateur: ${userId}`);
            
            if (!userId) {
                throw new BadRequestException('ID utilisateur manquant');
            }

            const user = await this.usersService.findById(userId);
            
            if (!user) {
                throw new NotFoundException('Utilisateur non trouvé');
            }

            this.logger.log(`Profil récupéré avec succès pour: ${user.email}`);
            return user;
        } catch (error) {
            this.logger.error(`Erreur de récupération du profil: ${error.message}`);
            throw error;
        }
    }

    // Logout automatique et nettoyage
    async logoutUser(userId: string, reason: string = 'Logout automatique'): Promise<void> {
        try {
            const activeSessions = await this.sessionService.getActiveSessionsByUser(userId);

            for (const session of activeSessions) {
                try {
                    const decoded = this.jwtService.decode(session.token) as any;
                    if (decoded && decoded.exp) {
                        await this.revokeToken(session.token, new Date(decoded.exp * 1000));
                    }
                } catch (error) {
                    this.logger.warn(`Erreur lors de la révocation du token: ${error.message}`);
                }
            }

            await this.sessionService.deleteAllUserSessions(userId);
            this.loginAttempts.delete(userId);

            this.logger.log(`Logout complet pour l'utilisateur ${userId}: ${reason}`);
        } catch (error) {
            this.logger.error(`Erreur lors du logout pour ${userId}: ${error.message}`);
            throw error;
        }
    }

    async cleanupExpiredSessions(): Promise<void> {
        try {
            const expiredSessions = await this.sessionService.getExpiredSessions();

            for (const session of expiredSessions) {
                try {
                    const decoded = this.jwtService.decode(session.token) as any;
                    if (decoded && decoded.exp) {
                        await this.revokeToken(session.token, new Date(decoded.exp * 1000));
                    }
                } catch (error) {
                    this.logger.warn(`Erreur lors de la révocation du token expiré: ${error.message}`);
                }
            }

            await this.sessionService.deleteExpiredSessions();
            this.logger.log(`Nettoyage de ${expiredSessions.length} sessions expirées`);
        } catch (error) {
            this.logger.error(`Erreur lors du nettoyage des sessions: ${error.message}`);
            throw error;
        }
    }

    async cleanupUserSessions(userId: string): Promise<void> {
        try {
            await this.sessionService.deleteAllUserSessions(userId);
            this.logger.log(`Sessions nettoyées pour l'utilisateur ${userId}`);
        } catch (error) {
            this.logger.error(`Erreur lors du nettoyage des sessions pour ${userId}: ${error.message}`);
            throw error;
        }
    }
}