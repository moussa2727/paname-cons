import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenCleanupCron {
  private readonly logger = new Logger(TokenCleanupCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupResetTokens() {
    this.logger.log('Nettoyage des reset tokens expirés');

    try {
      const result = await this.prisma.resetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      this.logger.log(`${result.count} reset tokens nettoyés`);
    } catch (error: unknown) {
      this.logger.error(
        `Erreur nettoyage reset tokens: ${(error as Error).message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupRevokedTokens() {
    this.logger.log('Nettoyage des tokens révoqués');

    try {
      const result = await this.prisma.revokedToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(`${result.count} tokens révoqués nettoyés`);
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage tokens révoqués: ${(error as Error).message}`,
      );
    }
  }
}
