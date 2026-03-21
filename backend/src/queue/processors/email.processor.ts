import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { EmailJobData } from '../../interfaces/queue.interface';
import { LoggerSanitizer } from '../../common/utils/logger-sanitizer.util';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { data } = job;

    this.logger.log('Traitement email');

    try {
      // Ajouter un timeout manuel pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Timeout email après 60 secondes')),
          60000,
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

      this.logger.log('Email envoyé avec succès');

      return {
        success: true,
        jobId: job.id,
        subject: data.subject,
      };
    } catch (error) {
      this.logger.error(
        'Erreur envoi email',
        (error as Error).message,
        (error as Error).stack,
      );

      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        this.logger.log('Échec définitif');
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
}
