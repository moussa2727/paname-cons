import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RendezvousReminderCron {
  private readonly logger = new Logger(RendezvousReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  @Cron('0 8 * * *') // Tous les jours à 8h
  async sendDailyReminders() {
    this.logger.log('Envoi des rappels de rendez-vous');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const rendezvous = await this.prisma.rendezvous.findMany({
        where: {
          date: dateStr,
          status: 'CONFIRMED',
        },
      });

      this.logger.log(`${rendezvous.length} rappels à envoyer`);

      for (const rdv of rendezvous) {
        await this.mailService.sendRendezvousReminderEmail(
          rdv.email,
          rdv.firstName,
          { date: new Date(rdv.date), time: rdv.time },
        );
      }

      this.logger.log(`${rendezvous.length} rappels envoyés`);
    } catch (error) {
      this.logger.error(`Erreur envoi rappels: ${(error as Error).message}`);
    }
  }

  @Cron('0 18 * * *') // Tous les jours à 18h
  async sendEveningReminders() {
    this.logger.log('Envoi des rappels pour demain');

    try {
      // Obtenir la date de demain
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Récupérer tous les rendez-vous confirmés pour demain
      const rendezvous = await this.prisma.rendezvous.findMany({
        where: {
          date: tomorrowStr,
          status: 'CONFIRMED',
        },
        include: {
          user: {
            select: {
              firstName: true,
              email: true,
            },
          },
        },
      });

      if (rendezvous.length === 0) {
        this.logger.log('Aucun rendez-vous confirmé pour demain');
        return;
      }

      // Envoyer les rappels pour chaque rendez-vous
      for (const rdv of rendezvous) {
        try {
          await this.mailService.sendRendezvousReminderEmail(
            rdv.email,
            rdv.firstName,
            { date: new Date(rdv.date), time: rdv.time },
          );

          this.logger.log('Rappel envoyé');
        } catch (error) {
          this.logger.error(`Erreur envoi rappel: ${(error as Error).message}`);
        }
      }

      this.logger.log(
        `${rendezvous.length} rappels du lendemain matin envoyés avec succès`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi des rappels du lendemain: ${(error as Error).message}`,
      );
    }
  }
}
