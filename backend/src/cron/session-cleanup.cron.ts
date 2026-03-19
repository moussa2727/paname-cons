import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuthConstants } from '../common/constants/auth.constants';
import { RevocationReason } from '@prisma/client';

@Injectable()
export class SessionCleanupCron {
  private readonly logger = new Logger(SessionCleanupCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    this.logger.log('Nettoyage des sessions expirées');

    try {
      // Nettoyer les refresh tokens expirés
      const expiredTokens = await this.prisma.refreshToken.updateMany({
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

      // Nettoyer les sessions inactives (plus d'1 heure)
      const inactivityLimit = new Date(
        Date.now() - AuthConstants.SESSION_INACTIVITY_LIMIT_MS,
      );
      const inactiveSessions = await this.prisma.session.updateMany({
        where: {
          lastActivity: { lt: inactivityLimit },
          isActive: true,
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          revocationReason: RevocationReason.INACTIVITY,
        },
      });

      this.logger.log(
        `${expiredTokens.count} sessions expirées, ${inactiveSessions.count} sessions inactives`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage sessions: ${(error as Error).message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldSessions() {
    this.logger.log('Nettoyage des anciennes sessions');

    try {
      const maxAgeDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const SESSION_MAX_AGE = RevocationReason.SESSION_MAX_AGE;

      const result = await this.prisma.session.updateMany({
        where: {
          createdAt: { lt: maxAgeDate },
          isActive: true,
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          revocationReason: SESSION_MAX_AGE,
        },
      });

      this.logger.log(`${result.count} anciennes sessions désactivées`);
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage anciennes sessions: ${(error as Error).message}`,
      );
    }
  }
}
