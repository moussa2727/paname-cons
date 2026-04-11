import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Interface pour le résultat de sendMail
interface SentMessageInfo {
  messageId?: string;
  envelope?: unknown;
  accepted?: string[];
  rejected?: string[];
  pending?: string[];
  response?: string;
}

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
  priority?: 'high' | 'normal' | 'low';
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
  family?: string | string[];
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
  private transporter!: Transporter;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private emailSentTimestamps: Date[] = [];

  // Configuration SMTP
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpUser: string;
  private readonly smtpPass: string;

  constructor(private configService: ConfigService) {
    // Email expéditeur
    this.fromEmail = this.getEnv('EMAIL_USER') || '';

    // Configuration SMTP
    this.smtpHost = this.getEnv('EMAIL_HOST') || 'smtp.gmail.com';
    this.smtpPort = parseInt(this.getEnv('EMAIL_PORT') || '587', 10);
    this.smtpSecure = this.getEnv('EMAIL_SECURE') === 'true';
    this.smtpUser = this.getEnv('EMAIL_USER') || '';
    this.smtpPass = this.getEnv('EMAIL_PASS') || '';
  }

  private getEnv(key: string): string {
    return process.env[key] || this.configService.get<string>(key) || '';
  }

  async onApplicationBootstrap() {
    await this.initialize();
  }

  onModuleDestroy() {
    this.close();
  }

  private async initialize(): Promise<void> {
    if (!this.smtpUser || !this.smtpPass) {
      this.logger.error(
        'Variables SMTP manquantes : EMAIL_USER, EMAIL_PASS (et optionnellement EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE)',
      );
      return;
    }

    try {
      // Création du transporteur SMTP avec config Railway-compatible
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Nécessaire pour Railway/conteneurs
          minVersion: 'TLSv1.2',
        },
        family: 4,

        // Timeout et retries
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      } as nodemailer.SMTPPool.Options);

      // Vérification de la connexion
      await this.transporter.verify();

      this.isAvailable = true;
      this.logger.log(
        `Service SMTP opérationnel (${this.smtpHost}:${this.smtpPort}) - ${this.maskEmail(this.smtpUser)}`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec initialisation SMTP: ${msg}`);
      this.isAvailable = false;
    }
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable || !this.transporter) {
      return { success: false, error: 'Service SMTP indisponible' };
    }

    try {
      const mailOptions = {
        from: options.from
          ? `"${options.fromName || this.fromName}" <${options.from}>`
          : `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        priority: options.priority,
        attachments: options.attachments,
      };

      const info = (await this.transporter.sendMail(
        mailOptions,
      )) as SentMessageInfo;

      this.emailSentTimestamps.push(new Date());
      const recipients = Array.isArray(options.to)
        ? options.to.map((email) => this.maskEmail(email))
        : [this.maskEmail(options.to)];
      this.logger.log(
        `Email envoyé avec succès à ${this.formatRecipients(recipients)}`,
      );

      return { success: true, messageId: info.messageId };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec envoi email: ${msg}`);
      return { success: false, error: msg };
    }
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  getStatus(): Status {
    return {
      available: this.isAvailable,
      message: this.isAvailable
        ? `Service SMTP disponible (${this.smtpHost}:${this.smtpPort})`
        : 'Service non configuré ou indisponible',
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpSecure,
      fromEmail: this.fromEmail || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      if (!this.isAvailable || !this.transporter) {
        return { success: false, message: 'Service SMTP non disponible' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Connexion SMTP réussie' };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }
      await this.transporter?.verify();
      this.logger.log('Connexion SMTP vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error(`Échec vérification SMTP: ${(error as Error).message}`);
      return false;
    }
  }

  close(): void {
    if (this.transporter) {
      this.transporter.close();
      this.logger.log('Connexion SMTP fermée');
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

    // Limite dépend du provider (Gmail: 500, autre: configurable)
    const limit = this.smtpHost.includes('gmail') ? 500 : 1000;

    return {
      totalToday: todayCount,
      limit,
      available: Math.max(0, limit - todayCount),
      isAvailable: this.isAvailable,
    };
  }

  // Utilitaires privés
  private maskEmail(email: string): string {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 3) return `${local.charAt(0)}***@${domain}`;
    return `${local.slice(0, 3)}***@${domain}`;
  }

  private formatRecipients(recipients: string | string[]): string {
    if (Array.isArray(recipients)) {
      if (recipients.length <= 2) return recipients.join(', ');
      return `${recipients.slice(0, 2).join(', ')} +${recipients.length - 2} autres`;
    }
    return recipients;
  }
}
