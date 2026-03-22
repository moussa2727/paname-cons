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

type TransportConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  service?: string;
  auth: {
    user: string;
    pass: string;
  };
};

@Injectable()
export class EmailConfig implements OnModuleInit {
  private transporter: nodemailer.Transporter | null = null;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger(EmailConfig.name);
  private isReady = false;

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT');
    const emailService = this.configService.get<string>('EMAIL_SERVICE');

    if (!emailUser || !emailPass) {
      this.logger.warn('EMAIL_USER ou EMAIL_PASS non configuré');
      this.fromEmail = '';
      return;
    }

    this.fromEmail = emailUser;

    // Construction de la configuration avec les bons types
    const config: TransportConfig = {
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };

    // Si HOST est spécifié
    if (emailHost) {
      config.host = emailHost;
      config.port = emailPort || 587;
      config.secure = emailPort === 465;
      this.logger.log(`📧 SMTP: ${emailHost}:${config.port}`);
    }
    // Sinon utiliser SERVICE
    else if (emailService) {
      config.service = emailService;
      this.logger.log(`📧 Service: ${emailService}`);
    }
    // Fallback Gmail
    else {
      config.service = 'gmail';
      this.logger.log('📧 Service: Gmail (par défaut)');
    }

    // Création du transporteur
    this.transporter = nodemailer.createTransport(
      config as nodemailer.TransportOptions,
    );
  }

  async onModuleInit() {
    if (!this.transporter || !this.fromEmail) {
      this.isReady = false;
      return;
    }

    try {
      await this.transporter.verify();
      this.isReady = true;
      this.logger.log('✅ Service email prêt');
    } catch (error) {
      this.isReady = false;
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      if (errorMessage.includes('timeout')) {
        this.logger.error('❌ Timeout - Vérifiez votre connexion internet');
      } else if (errorMessage.includes('Invalid login')) {
        this.logger.error(
          '❌ Identifiants invalides - Vérifiez EMAIL_USER et EMAIL_PASS',
        );
      } else {
        this.logger.error(`❌ Erreur connexion: ${errorMessage}`);
      }
    }
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady || !this.transporter) {
      return { success: false, error: 'Service email non disponible' };
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
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      });

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

      this.logger.log(
        `📧 Email envoyé — sujet: "${options.subject}" — vers: ${recipientInfo}`,
      );
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `❌ Échec envoi — sujet: "${options.subject}" — erreur: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return { success: false, message: 'Service email non configuré' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'Connexion SMTP réussie' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, message: `Échec: ${errorMessage}` };
    }
  }

  getStatus(): { available: boolean; message: string } {
    if (!this.fromEmail) {
      return { available: false, message: 'Email non configuré' };
    }
    if (!this.isReady) {
      return { available: false, message: 'Service email non connecté' };
    }
    return {
      available: true,
      message: `Service email prêt (${LoggerSanitizer.maskEmail(this.fromEmail)})`,
    };
  }
}
