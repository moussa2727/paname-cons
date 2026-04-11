import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { EmailConfig } from '../../config/email.config';
import { LoggerSanitizer } from '../../common/utils/logger-sanitizer.util';
import { EmailJobData } from '../../interfaces/queue.interface';

const EMAIL_SEND_TIMEOUT = 180000;

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailConfig: EmailConfig, // Injection directe d'EmailConfig
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { data } = job;

    const toEmail = Array.isArray(data.to) ? data.to.join(', ') : data.to;
    const domain = toEmail.split('@')[1];
    this.logger.log(`Traitement email pour domaine ${domain}`);

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Timeout email après ${EMAIL_SEND_TIMEOUT / 1000} secondes`,
              ),
            ),
          EMAIL_SEND_TIMEOUT,
        );
      });

      const toAddress = Array.isArray(data.to) ? data.to[0] : data.to || '';

      // Utiliser EmailConfig directement au lieu de MailService
      const emailPromise = this.emailConfig.sendEmail({
        to: toAddress,
        subject: data.subject || '',
        html: data.html || '',
      });

      const result = (await Promise.race([emailPromise, timeoutPromise])) as {
        success: boolean;
        messageId?: string;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Échec envoi email');
      }
      this.logger.log(`Email envoyé avec succès à ${domain}`);

      return {
        success: true,
        jobId: job.id,
        subject: data.subject,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error(`Erreur d'envoi d'email à ${domain}`, errorMessage);

      if (
        errorMessage.includes('ENETUNREACH') ||
        errorMessage.includes('Connection timeout') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        this.logger.error(
          `Problème de connexion Gmail API pour ${domain} - tentative ${job.attemptsMade + 1}/${job.opts.attempts || 3}`,
        );
        if (job.attemptsMade < (job.opts.attempts || 3) - 1) {
          throw error;
        }
      }

      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        this.logger.error(
          `Échec définitif d'envoi d'email à ${domain} après ${job.attemptsMade + 1} tentatives`,
        );
      }

      throw error;
    }
  }

  @Process('send-bulk-emails')
  async handleSendBulkEmails(job: Job<{ emails: EmailJobData[] }>) {
    const { emails } = job.data;

    this.logger.log('Traitement de emails en bulk');

    const results: Array<{
      success: boolean;
      to: string | string[];
      error?: string;
      messageId?: string;
    }> = [];

    for (const email of emails) {
      try {
        const toAddress = Array.isArray(email.to)
          ? email.to[0]
          : email.to || '';

        // Utiliser EmailConfig directement
        const result = await this.emailConfig.sendEmail({
          to: toAddress,
          subject: email.subject,
          html: email.html,
        });

        results.push({
          success: result.success,
          to: Array.isArray(email.to)
            ? email.to.map((e: string) => LoggerSanitizer.maskEmail(e))
            : LoggerSanitizer.maskEmail(email.to),
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          success: false,
          to: Array.isArray(email.to)
            ? email.to.map((e: string) => LoggerSanitizer.maskEmail(e))
            : LoggerSanitizer.maskEmail(email.to),
          error: (error as Error).message,
        });
      }
    }

    this.logger.log('Emails bulk traités');

    return results;
  }

  // Méthode pour nettoyer les jobs en erreur
  cleanFailedJobs(): void {
    try {
      // Note: L'accès à la queue nécessite l'injection de Queue
      // Cette méthode devrait être déplacée ou supprimée si non utilisée
      this.logger.log('Nettoyage des jobs échoués');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des jobs', error);
    }
  }
}
