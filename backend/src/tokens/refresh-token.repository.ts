import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken, RevocationReason } from '@prisma/client';
import { AuthConstants } from '../common/constants/auth.constants';

interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  isRememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    // Supprimer un éventuel token dupliqué (contrainte unique sur token)
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token: data.token },
    });

    if (existingToken) {
      await this.prisma.refreshToken.delete({
        where: { id: existingToken.id },
      });
      this.logger.warn('Token dupliqué supprimé');
    }

    // Vérifier la limite de sessions actives et supprimer la plus ancienne si nécessaire
    const activeSessions = await this.countActiveForUser(data.userId);
    if (activeSessions >= AuthConstants.MAX_ACTIVE_SESSIONS_PER_USER) {
      await this.removeOldestSession(data.userId);
    }

    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        isActive: true,
        isRememberMe: data.isRememberMe ?? false,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        rotationCount: 0,
      },
    });
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  async findValidToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async deactivate(id: string, reason?: RevocationReason): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  async deactivateAllForUser(
    userId: string,
    reason?: RevocationReason,
  ): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });
    return result.count;
  }

  async deactivateAllExceptUser(
    excludeUserId: string,
    reason?: RevocationReason,
  ): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId: { not: excludeUserId }, isActive: true },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });
    return result.count;
  }

  /**
   * Rotation sécurisée dans une transaction atomique.
   * isRememberMe est hérité de l'ancien token — jamais réécrit depuis le client.
   *
   * Deux garde-fous avant toute rotation :
   *   1. MAX_REFRESH_TOKEN_ROTATION : nombre de rotations atteint → SESSION_MAX_AGE
   *   2. SESSION_MAX_DURATION_MS    : durée de vie absolue depuis createdAt du token
   *      original dépassée → SESSION_MAX_AGE
   *      (une session remember_me de 14j renouvelée ne peut jamais dépasser 30j au total)
   */
  async rotateToken(
    oldTokenId: string,
    newToken: string,
    newExpiresAt: Date,
  ): Promise<RefreshToken> {
    return this.prisma.$transaction(async (tx) => {
      const oldToken = await tx.refreshToken.findUnique({
        where: { id: oldTokenId },
      });

      if (!oldToken) {
        throw new UnauthorizedException('Token introuvable');
      }

      // Garde 1 : limite du nombre de rotations
      if (oldToken.rotationCount >= AuthConstants.MAX_REFRESH_TOKEN_ROTATION) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            revocationReason: RevocationReason.SESSION_MAX_AGE,
          },
        });
        throw new UnauthorizedException('Nombre maximum de rotations atteint');
      }

      // Garde 2 : durée de vie absolue de la session depuis sa création
      const sessionAgeMs = Date.now() - oldToken.createdAt.getTime();
      if (sessionAgeMs >= AuthConstants.SESSION_MAX_DURATION_MS) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            revocationReason: RevocationReason.SESSION_MAX_AGE,
          },
        });
        throw new UnauthorizedException(
          'Durée maximale de session atteinte, veuillez vous reconnecter',
        );
      }

      // Rotation normale : pas de revocationReason sur l'ancien token
      await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: {
          isActive: false,
          rotatedAt: new Date(),
        },
      });

      return tx.refreshToken.create({
        data: {
          userId: oldToken.userId,
          token: newToken,
          expiresAt: newExpiresAt,
          isActive: true,
          isRememberMe: oldToken.isRememberMe,
          ipAddress: oldToken.ipAddress,
          userAgent: oldToken.userAgent,
          rotationCount: oldToken.rotationCount + 1,
          previousTokenId: oldTokenId,
        },
      });
    });
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async removeOldestSession(userId: string): Promise<void> {
    const oldestSession = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestSession) {
      await this.deactivate(
        oldestSession.id,
        RevocationReason.MAX_SESSIONS_REACHED,
      );
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: RevocationReason.SESSION_EXPIRED,
      },
    });
    return result.count;
  }

  /**
   * Deux cas traités :
   *   1. Sessions inactives (isRememberMe=false uniquement) dépassant inactivityLimit
   *   2. Sessions ayant dépassé SESSION_MAX_DURATION_MS quelle que soit leur nature
   *      (y compris remember_me) — plafond absolu de 30 jours
   */
  async cleanupInactiveSessions(inactivityLimit: Date): Promise<number> {
    // Cas 1 : inactivité sur sessions normales uniquement
    const inactiveResult = await this.prisma.refreshToken.updateMany({
      where: {
        lastActivity: { lt: inactivityLimit },
        isActive: true,
        isRememberMe: false, // ne touche PAS aux remember_me
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: RevocationReason.INACTIVITY,
      },
    });

    // Cas 2 : sessions ayant dépassé la durée de vie absolue (remember_me inclus)
    const sessionMaxAgeLimit = new Date(
      Date.now() - AuthConstants.SESSION_MAX_DURATION_MS,
    );
    const maxAgeResult = await this.prisma.refreshToken.updateMany({
      where: {
        createdAt: { lt: sessionMaxAgeLimit },
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: RevocationReason.SESSION_MAX_AGE,
      },
    });

    const total = inactiveResult.count + maxAgeResult.count;
    if (maxAgeResult.count > 0) {
      this.logger.log('Nettoyage des sessions inactives');
    }
    return total;
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { lastActivity: new Date() },
    });
  }
}
