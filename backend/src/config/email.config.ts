import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { LoggerSanitizer } from '../common/utils/logger-sanitizer.util';
import { promises as dnsPromises } from 'dns';

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
    const emailUser = this.getEmailUser();
    this.fromEmail = emailUser || '';
  }

  async onApplicationBootstrap() {
    await this.initialize();
  }

  onModuleDestroy() {
    this.close();
  }

  private getEmailUser(): string {
    return (
      process.env.EMAIL_USER ||
      this.configService.get<string>('EMAIL_USER') ||
      ''
    );
  }

  private getEmailPass(): string {
    return (
      process.env.EMAIL_PASS ||
      this.configService.get<string>('EMAIL_PASS') ||
      ''
    );
  }

  private async getIPv4Addresses(hostname: string): Promise<string[]> {
    try {
      const addresses = await dnsPromises.lookup(hostname, { all: true });
      const ipv4Addresses = addresses
        .filter((addr) => addr.family === 4)
        .map((addr) => addr.address);

      if (ipv4Addresses.length > 0) {
        this.logger.log(
          `IPv4 résolus pour ${hostname}: ${ipv4Addresses.join(', ')}`,
        );
        return ipv4Addresses;
      } else {
        this.logger.warn(`Aucune adresse IPv4 trouvée pour ${hostname}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Erreur résolution DNS pour ${hostname}: ${error}`);
      return [];
    }
  }

  private async initialize(): Promise<void> {
    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();

    if (!emailUser || !emailPass) {
      this.logger.error('EMAIL_USER ou EMAIL_PASS manquant');
      return;
    }

    try {
      this.logger.log(`Tentative connexion SMTP pour: ${emailUser}`);

      // Get IPv4 addresses for Gmail SMTP
      const ipv4Addresses = await this.getIPv4Addresses('smtp.gmail.com');

      if (ipv4Addresses.length === 0) {
        this.logger.error(
          'Impossible de résoudre les adresses IPv4 pour smtp.gmail.com',
        );
        return;
      }

      const configs = ipv4Addresses.flatMap(
        (ip) =>
          [
            // Config 1: Explicit SMTP with STARTTLS on port 587 (preferred)
            {
              host: ip,
              port: 587,
              secure: false,
              requireTLS: true,
              auth: { type: 'Login', user: emailUser, pass: emailPass },
              connectionTimeout: 30000,
              greetingTimeout: 15000,
              socketTimeout: 30000,
              debug: true,
              logger: true,
              tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
            },
            // Config 2: SSL on port 465
            {
              host: ip,
              port: 465,
              secure: true,
              auth: { type: 'Login', user: emailUser, pass: emailPass },
              connectionTimeout: 30000,
              greetingTimeout: 15000,
              socketTimeout: 30000,
              debug: true,
              logger: true,
              tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
            },
          ] as SMTPTransport.Options[],
      );

      // Add fallback Gmail service config
      configs.push({
        service: 'gmail',
        auth: { type: 'Login', user: emailUser, pass: emailPass },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        debug: true,
        logger: true,
        tls: { rejectUnauthorized: false },
      } as SMTPTransport.Options);

      let lastError: Error | null = null;

      for (let i = 0; i < configs.length; i++) {
        try {
          const config = configs[i];
          const configName =
            'host' in config
              ? `${config.host}:${config.port}`
              : 'gmail service';
          this.logger.log(
            `Tentative configuration ${i + 1}/${configs.length} (${configName})`,
          );

          this.transporter = nodemailer.createTransport(config);

          await this.transporter.verify();
          this.isAvailable = true;
          this.logger.log(
            `Service SMTP Gmail opérationnel (config ${i + 1} - ${configName})`,
          );
          return;
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error('Erreur inconnue');
          this.logger.warn(
            `Échec configuration ${i + 1}: ${lastError.message}`,
          );

          // Close connection if it was established
          try {
            this.transporter?.close();
          } catch {
            // Ignore close errors
          }
        }
      }

      // All configs failed
      throw lastError || new Error('Toutes les configurations SMTP ont échoué');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Échec initialisation SMTP: ${errorMessage}`);

      if (error instanceof Error && error.message.includes('timeout')) {
        this.logger.error('Solutions possibles:');
        this.logger.error('1. Vérifiez votre connexion internet');
        this.logger.error(
          '2. Vérifiez que les ports 587/465 ne sont pas bloqués par votre firewall',
        );
        this.logger.error(
          '3. Vérifiez que vous utilisez un mot de passe application Gmail',
        );
      }
    }
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable) {
      return { success: false, error: 'Service SMTP indisponible' };
    }

    try {
      const fromEmail = options.from || this.fromEmail;
      const fromName = options.fromName || this.fromName;
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const mailOptions: nodemailer.SendMailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
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
      };

      const info = (await this.transporter.sendMail(mailOptions)) as {
        messageId: string;
      };

      this.emailSentTimestamps.push(new Date());

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

      this.logger.log(`Email envoyé avec succès vers ${recipientInfo}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Échec envoi email: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
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
    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();
    return !!(emailUser && emailPass);
  }

  getStatus(): Status {
    const emailUser = this.getEmailUser();
    return {
      available: this.isServiceAvailable(),
      message: this.isAvailable
        ? 'Service disponible'
        : 'Service non configuré',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      fromEmail: emailUser || 'Non configuré',
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

      return {
        success: true,
        message: 'Connexion SMTP réussie',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Échec de connexion: ${errorMessage}`,
      };
    }
  }

  close(): void {
    if (this.transporter) {
      try {
        this.transporter.close();
        this.logger.log('Connexions SMTP fermées');
      } catch (error) {
        this.logger.warn(`Erreur fermeture SMTP: ${(error as Error).message}`);
      }
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.verify();
        this.logger.log('Connexion SMTP vérifiée avec succès');
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Échec de vérification SMTP: ${(error as Error).message}`,
      );
      return false;
    }
    return false;
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
      limit: 100,
      available: Math.max(0, 100 - todayCount),
      isAvailable: this.isAvailable,
    };
  }
}
