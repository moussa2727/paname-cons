import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AuthService } from "./auth.service";
import { RevokedTokenService } from "./revoked-token.service";

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly revokedToken: RevokedTokenService,
  ) {}

  // Nettoyage HOURLY des sessions expirées (désactivation)
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanupExpiredSessions() {
    try {
      this.logger.log("Début du nettoyage automatique des sessions expirées");
      await this.authService.cleanupExpiredSessions();
      this.logger.log(" Nettoyage automatique des sessions terminé avec succès");
    } catch (error: any) {
      this.logger.error(` Erreur lors du nettoyage automatique des sessions: ${error.message}`, error.stack);
    }
  }

  // Nettoyage QUOTIDIEN des sessions (doublon volontaire pour robustesse)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyCleanup() {
    try {
      this.logger.log(" Début du nettoyage quotidien des sessions");
      // Note: Appel identique à handleCleanupExpiredSessions pour garantie quotidienne
      await this.authService.cleanupExpiredSessions();
      this.logger.log(" Nettoyage quotidien des sessions terminé avec succès");
    } catch (error: any) {
      this.logger.error(` Erreur lors du nettoyage quotidien des sessions: ${error.message}`, error.stack);
    }
  }

  // Nettoyage QUOTIDIEN des tokens révoqués expirés
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRevokedTokensCleanup() {
    try {
      this.logger.log("Début du nettoyage des tokens révoqués expirés");
      await this.revokedToken.cleanupExpiredTokens();
      this.logger.log("Nettoyage des tokens révoqués expirés terminé avec succès");
    } catch (error: any) {
      this.logger.error(`Erreur lors du nettoyage des tokens révoqués: ${error.message}`, error.stack);
    }
  }
}