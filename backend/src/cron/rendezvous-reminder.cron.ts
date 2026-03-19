import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { DestinationEnum } from '@prisma/client';

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
        const html = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Rappel : Vous avez un rendez-vous aujourd'hui.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rdv.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rdv.time}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${rdv.destination === DestinationEnum.AUTRE ? rdv.destinationAutre || 'Autre' : rdv.destination}</div>
            </div>
            <p>Nous sommes impatients de vous rencontrer.</p>
            <div style="text-align:center;margin-top:30px;">
              <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon rendez-vous</a>
            </div>
          </div>`;

        await this.mailService.sendRendezvousReminderEmail(
          rdv.email,
          rdv.firstName,
          html,
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
          const html = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Rappel : Vous avez un rendez-vous demain.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
                <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rdv.date).toLocaleDateString('fr-FR')}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rdv.time}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${rdv.destination === DestinationEnum.AUTRE ? rdv.destinationAutre || 'Autre' : rdv.destination}</div>
              </div>
              <p>Nous sommes impatients de vous rencontrer.</p>
              <div style="text-align:center;margin-top:30px;">
                <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon rendez-vous</a>
              </div>
            </div>`;

          await this.mailService.sendRendezvousReminderEmail(
            rdv.email,
            rdv.firstName,
            html,
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
