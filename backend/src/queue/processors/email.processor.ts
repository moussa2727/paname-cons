import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { EmailJobData } from '../../interfaces/queue.interface';
import { LoggerSanitizer } from '../../common/utils/logger-sanitizer.util';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { data } = job;

    const toEmail = Array.isArray(data.to) ? data.to.join(', ') : data.to;
    this.logger.log(`Traitement email pour ${toEmail}`);

    try {
      // Augmenter le timeout à 120 secondes pour les connexions lentes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Timeout email après 120 secondes')),
          120000,
        );
      });

      const emailPromise = this.mailService.sendEmail({
        to: data.to,
        from: data.from,
        fromName: data.fromName,
        subject: data.subject,
        html: data.html,
        attachments: data.attachments,
        cc: data.cc,
        bcc: data.bcc,
        replyTo: data.replyTo,
      });

      // Utiliser Promise.race pour éviter les blocages
      const result = (await Promise.race([emailPromise, timeoutPromise])) as {
        success: boolean;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Échec envoi email');
      }

      this.logger.log(`Email envoyé avec succès à ${toEmail}`);

      return {
        success: true,
        jobId: job.id,
        subject: data.subject,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error(
        `Erreur envoi email à ${toEmail}`,
        errorMessage,
        (error as Error).stack,
      );

      // Gérer les erreurs de connexion spécifiques
      if (
        errorMessage.includes('ENETUNREACH') ||
        errorMessage.includes('Connection timeout') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        this.logger.error(
          `Problème de connexion SMTP pour ${toEmail} - tentative ${job.attemptsMade + 1}/${job.opts.attempts || 3}`,
        );
        // Ne pas marquer comme échec définitif trop rapidement
        if (job.attemptsMade < (job.opts.attempts || 3) - 1) {
          throw error; // Retenter automatiquement
        }
      }

      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        this.logger.error(
          `Échec définitif d'envoi d'email à ${toEmail} après ${job.attemptsMade + 1} tentatives`,
        );
      }

      throw error;
    }
  }

  @Process('send-bulk-emails')
  async handleSendBulkEmails(job: Job<{ emails: EmailJobData[] }>) {
    const { emails } = job.data;

    this.logger.log('Traitement de emails en bulk');

    const results: {
      success: boolean;
      to: string | string[];
      error?: string;
    }[] = [];
    for (const email of emails) {
      try {
        // Normaliser les types pour correspondre à EmailOptions
        await this.mailService.sendEmail({
          to: email.to,
          from: email.from,
          fromName: email.fromName,
          subject: email.subject,
          html: email.html,
          attachments: email.attachments,
          cc: email.cc
            ? Array.isArray(email.cc)
              ? email.cc
              : [email.cc]
            : undefined,
          bcc: email.bcc
            ? Array.isArray(email.bcc)
              ? email.bcc
              : [email.bcc]
            : undefined,
          replyTo: email.replyTo,
        });
        results.push({
          success: true,
          to: Array.isArray(email.to)
            ? email.to.map((e) => LoggerSanitizer.maskEmail(e))
            : LoggerSanitizer.maskEmail(email.to),
        });
      } catch (error) {
        results.push({
          success: false,
          to: Array.isArray(email.to)
            ? email.to.map((e) => LoggerSanitizer.maskEmail(e))
            : LoggerSanitizer.maskEmail(email.to),
          error: (error as Error).message,
        });
      }
    }

    this.logger.log('Emails bulk traités');

    return results;
  }

  // Méthode pour nettoyer les jobs en erreur
  async cleanFailedJobs(): Promise<void> {
    try {
      const failed = await this.emailQueue.getFailed();
      // Note: getStalled() n'existe pas dans Bull, on utilise getActive() à la place
      const active = await this.emailQueue.getActive();

      this.logger.log(
        `Nettoyage: ${failed.length} jobs échoués, ${active.length} jobs actifs`,
      );

      // Nettoyer les jobs échoués après 24h
      for (const job of failed) {
        const jobAge = Date.now() - job.timestamp;
        if (jobAge > 24 * 60 * 60 * 1000) {
          // 24 heures
          await job.remove();
          this.logger.log(`Job échoué supprimé: ${job.id}`);
        }
      }
    } catch (error) {
      this.logger.error(
        'Erreur lors du nettoyage des jobs',
        (error as Error).message,
      );
    }
  }
}
