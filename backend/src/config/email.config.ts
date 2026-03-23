import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerSanitizer } from '../common/utils/logger-sanitizer.util';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: nodemailer.SendMailOptions['attachments'];
}

/**
 * Point de connexion SMTP unique.
 * Tous les envois d'emails passent par cette classe.
 * MailService et tout autre service injectent EmailConfig pour envoyer.
 */
@Injectable()
export class EmailConfig implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger(EmailConfig.name);

  constructor(private configService: ConfigService) {
    this.logger = new Logger(EmailConfig.name);

    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.warn(
        'EMAIL_USER ou EMAIL_PASS non configuré — les emails ne seront pas envoyés',
      );
    }

    // ✅ Configuration SMTP correcte
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'LOGIN',
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    this.fromEmail = emailUser || '';
  }

  // ==================== INIT ====================

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('Gmail SMTP connecté avec succès');
    } catch (error) {
      this.logger.error(
        `Gmail SMTP échec de connexion: ${(error as Error).message}`,
      );
    }
  }

  // ==================== ENVOI ====================

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.fromEmail) {
      this.logger.error("EMAIL_USER manquant — impossible d'envoyer");
      return { success: false, error: 'EMAIL_USER non configuré' };
    }

    try {
      const fromEmail = options.from || this.fromEmail;
      const fromName = options.fromName || this.fromName;
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      await this.transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc
            : [options.cc]
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc
            : [options.bcc]
          : undefined,
        attachments: options.attachments || [],
      });

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;
      this.logger.log(
        ` Email envoyé — sujet: "${options.subject}" — vers: ${recipientInfo}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Échec envoi — sujet: "${options.subject}" — erreur: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }

  // ==================== UTILITAIRES ====================

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

  getStatus(): { available: boolean; message: string } {
    return {
      available: !!this.fromEmail,
      message: this.fromEmail
        ? 'Service GMAIL configuré et prêt'
        : 'Service GMAIL non configuré',
    };
  }
}
