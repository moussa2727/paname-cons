import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
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
  private gmail!: gmail_v1.Gmail;
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
    return process.env[key] || this.configService.get<string>(key) || '';
  }

  private async initialize(): Promise<void> {
    const clientId = this.getEnv('GMAIL_CLIENT_ID');
    const clientSecret = this.getEnv('GMAIL_CLIENT_SECRET');
    const refreshToken = this.getEnv('GMAIL_REFRESH_TOKEN');
    const emailUser = this.getEnv('EMAIL_USER');

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

      // Vérification via HTTPS (pas SMTP) — jamais bloqué sur Railway
      const { token } = await oauth2Client.getAccessToken();

      if (!token) {
        this.logger.error('Impossible de récupérer un access token OAuth2');
        return;
      }

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      this.isAvailable = true;
      this.logger.log(
        `Service Gmail API opérationnel (${LoggerSanitizer.maskEmail(emailUser)})`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec initialisation Gmail API: ${msg}`);
      this.isAvailable = false;
    }
  }

  private sanitizeSubject(subject: string): string {
    // Remplacer les caractères non alphanumériques par des espaces
    // Garder les accents, les espaces, et les caractères de ponctuation de base
    return subject
      .replace(/[^\w\sàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ.,!?'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildRawEmail(options: EmailOptions): string {
    const fromEmail = options.from || this.fromEmail;
    const fromName = options.fromName || this.fromName;
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const cc = options.cc
      ? Array.isArray(options.cc)
        ? options.cc.join(', ')
        : options.cc
      : '';
    const bcc = options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc.join(', ')
        : options.bcc
      : '';

    const lines: string[] = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${this.sanitizeSubject(options.subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
    ];

    if (cc) lines.push(`Cc: ${cc}`);
    if (bcc) lines.push(`Bcc: ${bcc}`);
    if (options.replyTo) lines.push(`Reply-To: ${options.replyTo}`);

    lines.push('', options.html);

    const raw = lines.join('\r\n');
    return Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable) {
      return { success: false, error: 'Service Gmail API indisponible' };
    }

    try {
      const raw = this.buildRawEmail(options);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      this.emailSentTimestamps.push(new Date());

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

      this.logger.log(`Email envoyé avec succès vers ${recipientInfo}`);

      return { success: true, messageId: response.data.id ?? undefined };
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
        ? 'Service Gmail API disponible'
        : 'Service non configuré',
      host: 'gmail.googleapis.com',
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
      // Test via API HTTP — pas de SMTP
      await this.gmail.users.getProfile({ userId: 'me' });
      return { success: true, message: 'Connexion Gmail API réussie' };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      this.logger.log('Connexion Gmail API vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error(
        `Échec vérification Gmail API: ${(error as Error).message}`,
      );
      return false;
    }
  }

  close(): void {
    // Rien à fermer avec Gmail API HTTP
    this.logger.log('Gmail API client fermé');
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
