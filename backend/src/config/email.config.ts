// sendgrid-email.config.ts
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

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
  apiKeyConfigured: boolean;
  fromEmail: string;
}

export interface EmailStats {
  totalToday: number;
  limit: number;
  available: number;
  isAvailable: boolean;
}

interface SendGridResponse {
  headers: { [key: string]: string };
  statusCode: number;
}

interface SendGridClientWithRequest {
  send(mailData: sgMail.MailDataRequired): Promise<[SendGridResponse, any]>;
  setApiKey(apiKey: string): void;
}

@Injectable()
export class EmailConfig implements OnApplicationBootstrap, OnModuleDestroy {
  private sgMail: SendGridClientWithRequest | null = null;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  readonly host: string = 'smtp.sendgrid.net';
  readonly port: number = 587;
  private apiKey: string;
  private defaultFromEmail: string = process.env.SENDGRID_FROM;
  private emailSentTimestamps: Date[] = [];

  constructor(private configService: ConfigService) {
    this.apiKey = this.getEnv('SENDGRID_API_KEY');
    this.fromEmail = this.getEnv('SENDGRID_FROM') || this.defaultFromEmail;
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable || !this.sgMail) {
      return { success: false, error: 'Service SendGrid indisponible' };
    }

    try {
      // Déterminer l'expéditeur
      const from = options.from
        ? `"${options.fromName || this.fromName}" <${options.from}>`
        : `"${this.fromName}" <${this.fromEmail}>`;

      // Gérer les destinataires multiples
      const to = Array.isArray(options.to) ? options.to : [options.to];

      // Construire les options d'envoi SendGrid
      const emailOptions: sgMail.MailDataRequired = {
        from,
        to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      };

      // Ajouter le texte brut si fourni
      if (options.text) {
        emailOptions.text = options.text;
      }

      // Ajouter les CC et BCC
      if (options.cc) {
        emailOptions.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
      }
      if (options.bcc) {
        emailOptions.bcc = Array.isArray(options.bcc)
          ? options.bcc
          : [options.bcc];
      }

      // Ajouter les pièces jointes (format SendGrid)
      if (options.attachments && options.attachments.length > 0) {
        emailOptions.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content
            ? Buffer.from(att.content).toString('base64')
            : undefined,
          path: att.path,
        }));
      }

      // Envoi via SendGrid
      const sendResult = await this.sgMail.send(emailOptions);
      const response = sendResult[0];

      this.emailSentTimestamps.push(new Date());
      const recipients = Array.isArray(options.to)
        ? options.to.map((email) => this.maskEmail(email))
        : [this.maskEmail(options.to)];
      this.logger.log(
        `Email envoyé avec succès à ${this.formatRecipients(recipients)}}`,
      );

      return { success: true, messageId: response.headers['x-message-id'] };
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
        ? `Service SendGrid disponible - Email: ${this.maskEmail(this.fromEmail)} - Host: ${this.host}:${this.port}`
        : 'Service non configuré ou indisponible',
      apiKeyConfigured: !!this.apiKey,
      fromEmail: this.fromEmail || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      if (!this.isAvailable || !this.sgMail) {
        return { success: false, message: 'Service SendGrid non disponible' };
      }

      // Test en envoyant un email de test (SendGrid valide la clé API à chaque envoi)
      const testEmailOptions: sgMail.MailDataRequired = {
        to: 'test@example.com',
        from: `"${this.fromName}" <${this.fromEmail}>`,
        subject: 'Test Connection',
        text: 'This is a test email to verify SendGrid connection',
      };

      try {
        await this.sgMail.send(testEmailOptions);
        return { success: true, message: 'Connexion SendGrid réussie' };
      } catch (sendError: unknown) {
        // Si l'erreur est "from address not verified", la connexion API est bonne
        const error = sendError as Error;
        if (
          error.message?.includes('from address') ||
          error.message?.includes('verified')
        ) {
          return {
            success: true,
            message: 'Connexion API réussie (expéditeur à vérifier)',
          };
        }
        throw sendError;
      }
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.sgMail) {
        await this.initialize();
      }

      // Vérification en envoyant un email de test
      const testEmailOptions: sgMail.MailDataRequired = {
        to: 'verify@example.com',
        from: `"${this.fromName}" <${this.fromEmail}>`,
        subject: 'Verify Connection',
        text: 'Verification email',
      };

      await this.sgMail.send(testEmailOptions);
      this.logger.log('Connexion SendGrid vérifiée avec succès');
      return true;
    } catch (error: unknown) {
      // Si l'erreur est liée à l'expéditeur non vérifié, la connexion API est bonne
      const err = error as Error;
      if (
        err.message?.includes('from address') ||
        err.message?.includes('verified')
      ) {
        this.logger.warn('Connexion API OK mais expéditeur non vérifié');
        return true;
      }
      this.logger.error(`Échec vérification SendGrid: ${err.message}`);
      return false;
    }
  }

  close(): void {
    this.sgMail = null;
    this.logger.log('Service SendGrid fermé');
  }

  getFromEmail(): string {
    return this.fromEmail;
  }

  getPort(): number {
    return this.port;
  }

  getHost(): string {
    return this.host;
  }

  getEmailStats(): EmailStats {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayCount = this.emailSentTimestamps.filter(
      (t) => t > oneDayAgo,
    ).length;

    // Limite SendGrid selon le plan (plan gratuit: 100/jour)
    const limit = 100;

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
    try {
      if (!this.apiKey) {
        this.logger.warn('SendGrid: Clé API manquante');
        this.isAvailable = false;
        return;
      }

      // SendGrid automatically uses the set API key for subsequent calls
      sgMail.setApiKey(this.apiKey);
      this.sgMail = sgMail as unknown as SendGridClientWithRequest;

      // Vérifier la connexion
      const isVerified = await this.verifyConnection();
      this.isAvailable = isVerified;

      if (isVerified) {
        this.logger.log(
          `SendGrid initialisé avec succès - Email: ${this.maskEmail(this.fromEmail)}`,
        );
      } else {
        this.logger.error("SendGrid: Échec de l'initialisation");
        this.isAvailable = false;
      }
    } catch (error) {
      this.logger.error(
        `SendGrid: Erreur d'initialisation: ${(error as Error).message}`,
      );
      this.isAvailable = false;
    }
  }
}
