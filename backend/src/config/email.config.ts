import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { LoggerSanitizer } from '../common/utils/logger-sanitizer.util';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: nodemailer.SendMailOptions['attachments'];
  priority?: 'high' | 'normal' | 'low';
}

export interface Status {
  available: boolean;
  message: string;
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
}

export interface EmailStats {
  totalToday: number;
  limit: number;
  available: number;
  isAvailable: boolean;
}

@Injectable()
export class EmailConfig implements OnApplicationBootstrap, OnModuleDestroy {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private emailSentTimestamps: Date[] = [];

  constructor(private configService: ConfigService) {
    this.fromEmail =
      process.env.EMAIL_USER ||
      this.configService.get<string>('EMAIL_USER') ||
      '';
  }

  async onApplicationBootstrap() {
    await this.initialize();
  }

  onModuleDestroy() {
    this.close();
  }

  private getEnv(key: string): string {
    return (
      process.env[key] || this.configService.get<string>(key) || ''
    );
  }

  private async initialize(): Promise<void> {
    const clientId     = this.getEnv('GMAIL_CLIENT_ID');
    const clientSecret = this.getEnv('GMAIL_CLIENT_SECRET');
    const refreshToken = this.getEnv('GMAIL_REFRESH_TOKEN');
    const emailUser    = this.getEnv('EMAIL_USER');

    if (!clientId || !clientSecret || !refreshToken || !emailUser) {
      this.logger.error(
        'Variables OAuth2 manquantes : GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, EMAIL_USER',
      );
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground',
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailUser,
          clientId,
          clientSecret,
          refreshToken,
          accessToken: async () => {
            const { token } = await oauth2Client.getAccessToken();
            return token || '';
          },
        },
      } as any);

      await this.transporter.verify();
      this.isAvailable = true;
      this.logger.log(`Service Gmail OAuth2 opérationnel (${emailUser})`);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec initialisation OAuth2 Gmail: ${msg}`);
      this.isAvailable = false;
    }
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable) {
      return { success: false, error: 'Service Gmail OAuth2 indisponible' };
    }

    try {
      const fromEmail = options.from || this.fromEmail;
      const fromName  = options.fromName || this.fromName;
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const mailOptions: nodemailer.SendMailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        replyTo: options.replyTo,
        cc: options.cc
          ? Array.isArray(options.cc) ? options.cc : [options.cc]
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc) ? options.bcc : [options.bcc]
          : undefined,
        attachments: options.attachments || [],
      };

      const info = (await this.transporter.sendMail(mailOptions)) as {
        messageId: string;
      };

      this.emailSentTimestamps.push(new Date());

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

      this.logger.log(`Email envoyé avec succès vers ${recipientInfo}`);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec envoi email: ${msg}`);
      return { success: false, error: msg };
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gm, '')
      .replace(/<script[^>]*>.*?<\/script>/gm, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  getStatus(): Status {
    return {
      available: this.isAvailable,
      message: this.isAvailable
        ? 'Service Gmail OAuth2 disponible'
        : 'Service non configuré',
      host: 'gmail OAuth2',
      port: 443,
      secure: true,
      fromEmail: this.fromEmail || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }
      if (this.transporter) {
        await this.transporter.verify();
      }
      return { success: true, message: 'Connexion Gmail OAuth2 réussie' };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.verify();
        this.logger.log('Connexion Gmail OAuth2 vérifiée avec succès');
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Échec vérification OAuth2: ${(error as Error).message}`,
      );
    }
    return false;
  }

  close(): void {
    if (this.transporter) {
      try {
        this.transporter.close();
        this.logger.log('Connexion Gmail OAuth2 fermée');
      } catch (error) {
        this.logger.warn(`Erreur fermeture: ${(error as Error).message}`);
      }
    }
  }

  getFromEmail(): string {
    return this.fromEmail;
  }

  getEmailStats(): EmailStats {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayCount = this.emailSentTimestamps.filter(
      (t) => t > oneDayAgo,
    ).length;

    return {
      totalToday: todayCount,
      limit: 500,
      available: Math.max(0, 500 - todayCount),
      isAvailable: this.isAvailable,
    };
  }
}
