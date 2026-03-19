import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerSanitizer } from '../common/utils/logger-sanitizer.util';

@Injectable()
export class EmailConfig {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger('EmailConfig');

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.warn('EMAIL_USER ou EMAIL_PASS non configuré');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser || process.env.EMAIL_USER,
        pass: emailPass || process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.fromEmail = emailUser || '';
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Service GMAIL non configuré' };
    }

    try {
      const fromEmail = options.from || this.fromEmail;
      const fromName = options.fromName || this.fromName;

      await this.transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      });

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataires`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;
      this.logger.log(`Email envoyé avec succès vers ${recipientInfo}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Échec d'envoi d'email: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Connexion GMAIL réussie' };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  getStatus() {
    return {
      available: !!this.transporter,
      message: this.transporter
        ? 'Service GMAIL configuré et prêt'
        : 'Service GMAIL non configuré',
    };
  }
}
