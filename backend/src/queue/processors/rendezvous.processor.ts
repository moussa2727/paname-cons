import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelledBy } from '@prisma/client';
import { Job } from 'bull';

interface RendezvousJobData {
  action: 'create' | 'cancel' | 'reminder' | 'auto_cancel';
  rendezvousId?: string;
  userId?: string;
  email?: string;
  firstName?: string;
  details?: {
    cancelledBy?: CancelledBy;
  };
}

@Processor('rendezvous')
export class RendezvousProcessor {
  private readonly logger = new Logger(RendezvousProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('create-rendezvous')
  async handleCreateRendezvous(job: Job<RendezvousJobData>) {
    const { data } = job;
    this.logger.log(
      `Traitement creation rendezvous ${data.rendezvousId?.substring(0, 8)}***`,
    );

    try {
      if (data.email && data.firstName && data.rendezvousId) {
        const rendezvous = await this.prisma.rendezvous.findUnique({
          where: { id: data.rendezvousId },
        });

        if (!rendezvous) {
          this.logger.warn(`Rendez-vous ${data.rendezvousId} non trouve`);
          return { success: false, error: 'Rendez-vous non trouve' };
        }

        await this.mailService.sendRendezvousConfirmationEmail(
          data.email,
          data.firstName,
          {
            id: rendezvous.id,
            date: new Date(rendezvous.date),
            time: rendezvous.time,
            destination: rendezvous.destination,
            destinationAutre: rendezvous.destinationAutre,
          },
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
  async handleCancelRendezvous(job: Job<RendezvousJobData>) {
    const { data } = job;
    this.logger.log('Traitement annulation rendez-vous');

    try {
      if (data.email && data.firstName && data.rendezvousId) {
        const rendezvous = await this.prisma.rendezvous.findUnique({
          where: { id: data.rendezvousId },
        });

        if (!rendezvous) {
          this.logger.warn('Rendez-vous non trouvé');
          return { success: false, error: 'Rendez-vous non trouvé' };
        }

        await this.mailService.sendRendezvousCancelledEmail(
          data.email,
          data.firstName,
          {
            id: rendezvous.id,
            date: new Date(rendezvous.date),
            time: rendezvous.time,
          },
          (data.details?.cancelledBy === 'SYSTEM'
            ? 'ADMIN'
            : data.details?.cancelledBy) ?? 'USER',
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
  async handleSendReminder(job: Job<RendezvousJobData>) {
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

        await this.mailService.sendRendezvousReminderEmail(
          data.email,
          data.firstName,
          {
            date: new Date(rendezvous.date),
            time: rendezvous.time,
            id: rendezvous.id,
          },
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
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

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
          await this.prisma.rendezvous.update({
            where: { id: rdv.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason:
                'Annulation automatique: non confirmé dans les 5 heures',
            },
          });

          await this.mailService.sendRendezvousCancelledEmail(
            rdv.email,
            rdv.firstName,
            {
              date: new Date(rdv.date),
              time: rdv.time,
              id: rdv.id,
            },
            'ADMIN',
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
