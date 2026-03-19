import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import bull from 'bull';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

interface RendezvousJobData {
  action: 'create' | 'cancel' | 'reminder' | 'auto_cancel';
  rendezvousId?: string;
  userId?: string;
  email?: string;
  firstName?: string;
  details?: any;
}

@Processor('rendezvous')
export class RendezvousProcessor {
  private readonly logger = new Logger(RendezvousProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Process('create-rendezvous')
  async handleCreateRendezvous(job: bull.Job<RendezvousJobData>) {
    const { data } = job;
    this.logger.log(
      `Traitement creation rendezvous ${data.rendezvousId?.substring(0, 8)}***`,
    );

    try {
      // Envoyer email de confirmation
      if (data.email && data.firstName && data.rendezvousId) {
        const rendezvous = await this.prisma.rendezvous.findUnique({
          where: { id: data.rendezvousId },
        });

        if (!rendezvous) {
          this.logger.warn(`Rendez-vous ${data.rendezvousId} non trouve`);
          return { success: false, error: 'Rendez-vous non trouve' };
        }

        const html = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Nous avons le plaisir de vous confirmer votre rendez-vous.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${rendezvous.destination || rendezvous.destinationAutre || 'Non spécifié'}</div>
            </div>
            <p>Nous sommes impatients de vous rencontrer à notre bureau.</p>
            <div style="text-align:center;margin-top:30px;">
              <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon rendez-vous</a>
            </div>
          </div>`;

        await this.mailService.sendRendezvousReminderEmail(
          data.email,
          data.firstName,
          html,
        );
      }

      this.logger.log('Rendez-vous créé avec succès');
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Erreur traitement rendezvous: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('cancel-rendezvous')
  async handleCancelRendezvous(job: bull.Job<RendezvousJobData>) {
    const { data } = job;
    this.logger.log('Traitement annulation rendez-vous');

    try {
      // Envoyer email d'annulation
      if (data.email && data.firstName && data.rendezvousId) {
        const rendezvous = await this.prisma.rendezvous.findUnique({
          where: { id: data.rendezvousId },
        });

        if (!rendezvous) {
          this.logger.warn('Rendez-vous non trouvé');
          return { success: false, error: 'Rendez-vous non trouvé' };
        }

        const html = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Votre rendez-vous a été annulé.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Rendez-vous annulé</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date prévue :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure prévue :</span> ${rendezvous.time}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${rendezvous.destination || rendezvous.destinationAutre || 'Non spécifié'}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> Annulation de rendez-vous</div>
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reprogrammer un rendez-vous</a>
            </div>
          </div>`;

        await this.mailService.sendRendezvousCancelledEmail(
          data.email,
          data.firstName,
          html,
        );
      }

      this.logger.log('Rendez-vous annulé et email envoyé');
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Erreur annulation rendezvous: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('send-reminder')
  async handleSendReminder(job: bull.Job<RendezvousJobData>) {
    const { data } = job;
    this.logger.log('Envoi rappel rendez-vous');

    try {
      if (data.email && data.firstName && data.rendezvousId) {
        const rendezvous = await this.prisma.rendezvous.findUnique({
          where: { id: data.rendezvousId },
        });

        if (!rendezvous) {
          this.logger.warn('Rendez-vous non trouvé');
          return { success: false, error: 'Rendez-vous non trouvé' };
        }

        const html = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Rappel : Vous avez un rendez-vous.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> Paname Consulting - Kalaban Coura</div>
            </div>
            <p>Nous sommes impatients de vous rencontrer.</p>
          </div>`;

        await this.mailService.sendRendezvousReminderEmail(
          data.email,
          data.firstName,
          html,
        );
      }

      this.logger.log('Rappel envoyé');
      return { success: true };
    } catch (error) {
      this.logger.error(`Erreur envoi rappel: ${(error as Error).message}`);
      throw error;
    }
  }

  @Process('auto-cancel-pending')
  async handleAutoCancelPending() {
    this.logger.log('Annulation automatique des rendez-vous en attente');

    try {
      // Logique réelle pour l'annulation automatique
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

      // Trouver les rendez-vous en attente depuis plus de 5 heures
      const pendingToCancel = await this.prisma.rendezvous.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: fiveHoursAgo,
          },
        },
      });

      if (pendingToCancel.length === 0) {
        this.logger.log('Aucun rendez-vous en attente à annuler');
        return { success: true, message: 'No pending rendezvous to cancel' };
      }

      let cancelledCount = 0;

      for (const rdv of pendingToCancel) {
        try {
          // Mettre à jour le statut du rendez-vous
          await this.prisma.rendezvous.update({
            where: { id: rdv.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason:
                'Annulation automatique: non confirmé dans les 5 heures',
            },
          });

          // Envoyer email d'annulation automatique
          const html = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Votre rendez-vous a été annulé.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
                <h3 style="margin-top:0;color:#ef4444;">Rendez-vous annulé</h3>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date prévue :</span> ${new Date(rdv.date).toLocaleDateString('fr-FR')}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure prévue :</span> ${rdv.time}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> Annulation automatique: non confirmé dans les 5 heures</div>
              </div>
              <div style="text-align:center;margin-top:30px;">
                <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reprogrammer un rendez-vous</a>
              </div>
            </div>`;

          await this.mailService.sendRendezvousCancelledEmail(
            rdv.email,
            rdv.firstName,
            html,
          );

          cancelledCount++;
          this.logger.log('Rendez-vous annulé');
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'annulation du rendez-vous: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log('Nettoyage des anciens rendez-vous annulés');
      return {
        success: true,
        message: `${cancelledCount} pending rendezvous cancelled`,
        cancelledCount,
      };
    } catch (error) {
      this.logger.error(
        `Erreur annulation automatique: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
