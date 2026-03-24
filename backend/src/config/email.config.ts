import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerSanitizer } from '../common/utils/logger-sanitizer.util';
// forcing ipv4 - must be first, before any other imports
import {
  setDefaultResultOrder,
  promises as dnsPromises,
  LookupAddress,
} from 'dns';

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
    // Set IPv4 preference
    setDefaultResultOrder('ipv4first');

    // Perform DNS lookup non-blocking
    dnsPromises
      .lookup('smtp.gmail.com', { all: true })
      .then((addresses: LookupAddress[]) => {
        const ipv4Only = addresses.filter((a) => a.family === 4);
        if (ipv4Only.length === 0) {
          console.warn('[DNS] Aucune adresse IPv4 trouvee pour smtp.gmail.com');
        } else {
          console.log(
            `[DNS] IPv4 force -- ${ipv4Only.map((a) => a.address).join(', ')}`,
          );
        }
      })
      .catch(() => {
        console.warn('[DNS] Verification IPv4 non bloquante echouee');
      });

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

  private async initialize(): Promise<void> {
    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();

    if (!emailUser || !emailPass) {
      this.logger.error('EMAIL_USER ou EMAIL_PASS manquant');
      return;
    }

    try {
      this.logger.log(`Tentative connexion SMTP pour: ${emailUser}`);

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'Login',
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        debug: true,
        logger: true,
      });

      await this.transporter.verify();
      this.isAvailable = true;
      this.logger.log('Service SMTP Gmail opérationnel');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Échec initialisation SMTP: ${errorMessage}`);

      if (error instanceof Error && error.message.includes('timeout')) {
        this.logger.error('Solutions possibles:');
        this.logger.error('1. Vérifiez votre connexion internet');
        this.logger.error(
          "2. Vérifiez que le port 587 n'est pas bloqué par votre firewall",
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
