import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import type { NotificationJobData } from '../../interfaces/queue.interface';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private mailService: MailService,
    private prisma: PrismaService,
  ) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>) {
    const { data } = job;
    this.logger.log('Traitement notification');

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new Error(
          `User ${data.userId?.substring(0, 8) + '***'} not found`,
        );
      }

      // Uniquement EMAIL/GMAIL
      if (data.channels?.includes('email')) {
        await this.mailService.sendAdminAlert(
          data.title,
          data.body,
          'info',
          data.metadata,
          user.email, // Email dynamique de l'utilisateur
          `${user.firstName} ${user.lastName}`, // Nom dynamique de l'utilisateur
        );
      }

      this.logger.log('Notification envoyée');

      return { success: true, userId: user.id };
    } catch (error) {
      this.logger.error(`Erreur notification: ${(error as Error).message}`);
      throw error;
    }
  }
}
