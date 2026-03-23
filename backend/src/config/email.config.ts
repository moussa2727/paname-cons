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

// ==================== TYPES ====================

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

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailStatus {
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

// ==================== CONFIGURATION ====================

const SMTP_CONFIG = {
  HOST: 'smtp.gmail.com',
  PORTS: {
    SSL: 465,
    STARTTLS: 587,
  },
  TIMEOUTS: {
    CONNECTION: 30000,
    GREETING: 10000,
    SOCKET: 15000,
  },
  TLS: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2' as const,
  },
  // Force IPv4 -- evite ENETUNREACH sur adresses IPv6 Gmail
  FAMILY: 4,
} as const;

const LIMITS_CONFIG = {
  MAX_EMAILS_PER_DAY: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 2000,
  CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000,
} as const;

// ==================== SERVICE ====================

@Injectable()
export class EmailConfig implements OnApplicationBootstrap, OnModuleDestroy {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  private isInitializing: boolean = false;
  private emailSentTimestamps: Date[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  readonly fromName: string = 'Paname Consulting';

  constructor(private readonly configService: ConfigService) {}

  // ==================== LIFECYCLE ====================

  async onApplicationBootstrap(): Promise<void> {
    await this.initialize();
    this.cleanupTimer = setInterval(
      () => this.cleanupOldTimestamps(),
      LIMITS_CONFIG.CLEANUP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.close();
  }

  // ==================== CREDENTIALS ====================

  private resolveCredentials(): { user: string; pass: string } | null {
    const user =
      this.configService.get<string>('EMAIL_USER') ||
      process.env.EMAIL_USER ||
      '';

    const pass =
      this.configService.get<string>('EMAIL_PASS') ||
      process.env.EMAIL_PASS ||
      '';

    if (!user || !pass) return null;

    return { user, pass };
  }

  // ==================== INITIALISATION ====================

  private buildTransporterConfig(
    port: typeof SMTP_CONFIG.PORTS.SSL | typeof SMTP_CONFIG.PORTS.STARTTLS,
    credentials: { user: string; pass: string },
  ): SMTPTransport.Options {
    const isSSL = port === SMTP_CONFIG.PORTS.SSL;

    return {
      host: SMTP_CONFIG.HOST,
      port,
      secure: isSSL,
      requireTLS: true,
      auth: {
        user: credentials.user,
        pass: credentials.pass,
      },
      connectionTimeout: SMTP_CONFIG.TIMEOUTS.CONNECTION,
      greetingTimeout: SMTP_CONFIG.TIMEOUTS.GREETING,
      socketTimeout: SMTP_CONFIG.TIMEOUTS.SOCKET,
      tls: SMTP_CONFIG.TLS,
      // family non type dans SMTPTransport.Options mais supporte par nodemailer
      ...({ family: SMTP_CONFIG.FAMILY } as Record<string, unknown>),
    } as SMTPTransport.Options;
  }

  private async tryTransporter(
    config: SMTPTransport.Options,
    label: string,
  ): Promise<boolean> {
    try {
      this.transporter = nodemailer.createTransport(config);
      await this.transporter.verify();
      this.isAvailable = true;
      this.logger.log(`SMTP operationnel -- ${label}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Echec SMTP (${label}): ${msg}`);
      return false;
    }
  }

  private async initialize(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const credentials = this.resolveCredentials();

      if (!credentials) {
        this.logger.error(
          'EMAIL_USER ou EMAIL_PASS manquant -- emails desactives',
        );
        this.logger.error(
          '   Definissez EMAIL_USER et EMAIL_PASS dans votre .env',
        );
        return;
      }

      this.logger.log('Initialisation SMTP Gmail...');
      this.logger.log(`   Expediteur: ${this.maskEmail(credentials.user)}`);

      // Tentative 1 -- SSL port 465 IPv4
      const sslConfig = this.buildTransporterConfig(
        SMTP_CONFIG.PORTS.SSL,
        credentials,
      );
      if (await this.tryTransporter(sslConfig, 'SSL:465 IPv4')) return;

      // Tentative 2 -- STARTTLS port 587 IPv4
      const starttlsConfig = this.buildTransporterConfig(
        SMTP_CONFIG.PORTS.STARTTLS,
        credentials,
      );
      if (await this.tryTransporter(starttlsConfig, 'STARTTLS:587 IPv4'))
        return;

      // Tentative 3 -- service: 'gmail' simplifie avec family force
      try {
        this.logger.warn('Tentative configuration simplifiee...');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: credentials.user,
            pass: credentials.pass,
          },
          tls: SMTP_CONFIG.TLS,
          ...({ family: SMTP_CONFIG.FAMILY } as Record<string, unknown>),
        } as SMTPTransport.Options);

        await this.transporter.verify();
        this.isAvailable = true;
        this.logger.log('SMTP operationnel -- Gmail simplifie IPv4');
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(`Toutes les tentatives SMTP ont echoue: ${msg}`);
        this.logger.error(
          '   Verifiez votre mot de passe application sur https://myaccount.google.com/apppasswords',
        );
        this.isAvailable = false;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  async initManually(): Promise<void> {
    this.isInitializing = false;
    await this.initialize();
  }

  // ==================== ENVOI ====================

  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.isAvailable) {
      await this.initialize();
      if (!this.isAvailable) {
        return { success: false, error: 'Service SMTP indisponible' };
      }
    }

    if (!this.canSendEmail()) {
      return { success: false, error: "Limite quotidienne d'emails atteinte" };
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= LIMITS_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const credentials = this.resolveCredentials();
        const fromEmail = options.from || credentials?.user || '';
        const fromName = options.fromName || this.fromName;

        const mailOptions: nodemailer.SendMailOptions = {
          from: `${fromName} <${fromEmail}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
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
          attachments: options.attachments ?? [],
          priority: options.priority ?? 'normal',
          headers: {
            'X-Priority': options.priority === 'high' ? '1' : '3',
            'X-MSMail-Priority':
              options.priority === 'high' ? 'High' : 'Normal',
            Importance: options.priority === 'high' ? 'high' : 'normal',
            'X-Mailer': `${this.fromName} Mailer`,
            'X-Auto-Response-Suppress': 'All',
            Precedence: 'bulk',
          },
          encoding: 'utf-8',
        };

        const info = (await this.transporter.sendMail(mailOptions)) as {
          messageId: string;
        };

        this.emailSentTimestamps.push(new Date());

        const recipientInfo = Array.isArray(options.to)
          ? `${options.to.length} destinataire(s)`
          : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

        this.logger.log(
          `Email envoye (tentative ${attempt}/${LIMITS_CONFIG.RETRY_ATTEMPTS}) -- "${options.subject}" vers ${recipientInfo}`,
        );

        return { success: true, messageId: info.messageId };
      } catch (error: unknown) {
        lastError = error;
        this.logSendError(error, attempt);

        if (attempt < LIMITS_CONFIG.RETRY_ATTEMPTS) {
          const delay =
            LIMITS_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.warn(`Nouvelle tentative dans ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error:
        lastError instanceof Error
          ? lastError.message
          : "Erreur inconnue lors de l'envoi",
    };
  }

  private logSendError(error: unknown, attempt: number): void {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : 'UNKNOWN';
    const message = error instanceof Error ? error.message : 'Erreur inconnue';

    this.logger.error(
      `Erreur SMTP ${code} (tentative ${attempt}/${LIMITS_CONFIG.RETRY_ATTEMPTS}): ${message}`,
    );

    if (code === 'EAUTH') {
      this.logger.error(
        '   Generez un nouveau mot de passe application sur https://myaccount.google.com/apppasswords',
      );
    }
  }

  // ==================== UTILITAIRES ====================

  private canSendEmail(): boolean {
    this.cleanupOldTimestamps();

    if (this.emailSentTimestamps.length >= LIMITS_CONFIG.MAX_EMAILS_PER_DAY) {
      this.logger.warn(
        `Limite quotidienne atteinte: ${this.emailSentTimestamps.length}/${LIMITS_CONFIG.MAX_EMAILS_PER_DAY}`,
      );
      return false;
    }

    return true;
  }

  private cleanupOldTimestamps(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const before = this.emailSentTimestamps.length;
    this.emailSentTimestamps = this.emailSentTimestamps.filter(
      (t) => t > oneDayAgo,
    );
    const removed = before - this.emailSentTimestamps.length;
    if (removed > 0) {
      this.logger.debug(`${removed} timestamp(s) expires supprimes`);
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private maskEmail(email: string): string {
    if (!email?.includes('@')) return '***@***';
    const [name, domain] = email.split('@');
    const masked = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
    return `${masked}@${domain}`;
  }

  // ==================== METHODES PUBLIQUES ====================

  isServiceAvailable(): boolean {
    return !!this.resolveCredentials() && this.isAvailable;
  }

  getStatus(): EmailStatus {
    const options = this.transporter?.options as SMTPTransport.Options;
    const credentials = this.resolveCredentials();

    return {
      available: this.isServiceAvailable(),
      message: this.isAvailable
        ? 'SMTP Gmail operationnel'
        : 'Service SMTP indisponible',
      host: options?.host ?? SMTP_CONFIG.HOST,
      port: options?.port ?? SMTP_CONFIG.PORTS.SSL,
      secure: options?.secure ?? true,
      fromEmail: credentials?.user ?? 'Non configure',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) await this.initialize();

      if (!this.isAvailable || !this.transporter) {
        return {
          success: false,
          message:
            'Service SMTP indisponible\n' +
            '   1. Verifiez EMAIL_USER et EMAIL_PASS dans votre .env\n' +
            "   2. Verifiez votre mot de passe d'application Google\n" +
            '   3. Verifiez votre connexion reseau',
        };
      }

      await this.transporter.verify();
      const options = this.transporter.options as SMTPTransport.Options;
      const credentials = this.resolveCredentials();

      return {
        success: true,
        message:
          `SMTP Gmail operationnel\n` +
          `   Expediteur: ${this.maskEmail(credentials?.user ?? '')}\n` +
          `   Hote: ${options.host ?? SMTP_CONFIG.HOST}:${options.port ?? SMTP_CONFIG.PORTS.SSL}\n` +
          `   Securite: ${options.secure ? 'SSL/TLS' : 'STARTTLS'} -- IPv4 force\n` +
          `   Emails aujourd'hui: ${this.emailSentTimestamps.length}/${LIMITS_CONFIG.MAX_EMAILS_PER_DAY}`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, message: `Erreur de test SMTP: ${message}` };
    }
  }

  getEmailStats(): EmailStats {
    this.cleanupOldTimestamps();

    return {
      totalToday: this.emailSentTimestamps.length,
      limit: LIMITS_CONFIG.MAX_EMAILS_PER_DAY,
      available: Math.max(
        0,
        LIMITS_CONFIG.MAX_EMAILS_PER_DAY - this.emailSentTimestamps.length,
      ),
      isAvailable: this.isAvailable,
    };
  }

  close(): void {
    try {
      this.transporter?.close();
      this.logger.log('Connexions SMTP fermees');
    } catch (error) {
      this.logger.warn(`Erreur fermeture SMTP: ${(error as Error).message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Connexion SMTP verifiee avec succes');
      return true;
    } catch (error) {
      this.logger.error(`Echec verification SMTP: ${(error as Error).message}`);
      return false;
    }
  }
}
