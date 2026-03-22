import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RendezvousStatus } from '@prisma/client';

@Injectable()
export class RendezvousCleanupCron {
  private readonly logger = new Logger(RendezvousCleanupCron.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  /**
   * Annule automatiquement les rendez-vous en attente depuis plus de 5h
   * Exécution toutes les heures
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupPendingRendezvous() {
    this.logger.log('Vérification des rendez-vous en attente');

    try {
      // Vérifier la connexion à la base de données
      await this.prisma.$queryRaw`SELECT 1`;
      // Date limite : il y a 5 heures
      const cutoffTime = new Date(Date.now() - 5 * 60 * 60 * 1000);

      // Rendez-vous en attente depuis plus de 5h
      const pendingRendezvous = await this.prisma.rendezvous.findMany({
        where: {
          status: RendezvousStatus.PENDING,
          createdAt: {
            lt: cutoffTime,
          },
        },
      });

      if (pendingRendezvous.length === 0) {
        this.logger.log('Aucun rendez-vous à annuler');
        return;
      }

      this.logger.log(`${pendingRendezvous.length} rendez-vous en attente`);

      // Annuler chaque rendez-vous et envoyer un email
      for (const rdv of pendingRendezvous) {
        try {
          // Mettre à jour le statut
          await this.prisma.rendezvous.update({
            where: { id: rdv.id },
            data: {
              status: RendezvousStatus.CANCELLED,
              cancellationReason: 'Automatiquement annulé après 5h en attente',
              cancelledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          await this.mailService.sendRendezvousCancelledEmail(
            rdv.email,
            rdv.firstName,
            { id: rdv.id, date: new Date(rdv.date), time: rdv.time },
            'Système',
          );

          this.logger.log('Rendez-vous annulé et email envoyé');
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'annulation du rendez-vous: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log(`${pendingRendezvous.length} rendez-vous annulés`);
    } catch (error) {
      this.logger.error(
        `Erreur lors du nettoyage des rendez-vous: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Nettoie les anciens rendez-vous annulés (conservation 30 jours)
   * Exécution quotidienne à 4h du matin
   */
  @Cron('0 4 * * *') // Tous les jours à 4h du matin
  async cleanupOldCancelledRendezvous() {
    this.logger.log('Nettoyage des anciens rendez-vous annulés');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.rendezvous.deleteMany({
        where: {
          status: RendezvousStatus.CANCELLED,
          updatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`${result.count} anciens rendez-vous annulés supprimés`);
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage anciens rendez-vous: ${(error as Error).message}`,
      );
    }
  }
}
