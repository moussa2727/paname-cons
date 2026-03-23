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

// ==================== CONFIGURATION CENTRALISÉE EMAIL ====================

export const EMAIL_CONFIG = {
  // Timeouts SMTP (millisecondes)
  SMTP: {
    CONNECTION_TIMEOUT: 120000,
    GREETING_TIMEOUT: 120000,
    SOCKET_TIMEOUT: 120000,
  },

  // Timeouts de traitement (millisecondes)
  PROCESSING: {
    SEND_TIMEOUT: 180000,
    VERIFICATION_DELAY: 25000,
  },

  // Configuration BullMQ
  QUEUE: {
    ATTEMPTS: 5,
    BACKOFF_DELAY: 10000,
    STALLED_INTERVAL: 30000,
    MAX_STALLED_COUNT: 1,
    REMOVE_ON_COMPLETE: 100,
    REMOVE_ON_FAIL: 500,
  },

  // Configuration SMTP
  SMTP_CONFIG: {
    service: 'gmail',
    HOST: 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT || '587'),
    SECURE: false,
    FAMILY: 4,
  },

  // Limites et retry
  LIMITS: {
    MAX_EMAILS_PER_DAY: 100,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,
  },
};

/**
 * Point de connexion SMTP unique.
 * Tous les envois d'emails passent par cette classe.
 */
@Injectable()
export class EmailConfig implements OnApplicationBootstrap, OnModuleDestroy {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private retryAttempts: number = EMAIL_CONFIG.LIMITS.RETRY_ATTEMPTS;
  private retryDelay: number = EMAIL_CONFIG.LIMITS.RETRY_DELAY;
  private emailSentTimestamps: Date[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private isInitializing: boolean = false;

  constructor(private configService: ConfigService) {
    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();

    if (!emailUser || !emailPass) {
      this.logger.warn(
        'EMAIL_USER ou EMAIL_PASS non configuré — les emails ne seront pas envoyés',
      );
    }

    this.fromEmail = `${this.fromName} <${emailUser || ''}>`;
  }

  // ==================== LIFECYCLE ====================

  async onApplicationBootstrap() {
    await this.initialize();
    this.cleanupTimer = setInterval(
      () => this.cleanupOldTimestamps(),
      EMAIL_CONFIG.LIMITS.CLEANUP_INTERVAL,
    );
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.close();
  }

  // ==================== INITIALISATION ====================

  private async initialize(): Promise<void> {
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();
    const nodeEnv = (
      this.configService.get<string>('NODE_ENV') ||
      process.env.NODE_ENV ||
      'production'
    ).toLowerCase();

    if (!emailUser || !emailPass) {
      this.logger.error('EMAIL_USER ou EMAIL_PASS manquant pour SMTP');
      this.logger.error("Vérifiez vos variables d'environnement :");
      this.logger.error('EMAIL_USER=' + emailUser);
      this.logger.error('EMAIL_PASS=' + (emailPass ? '***' : 'undefined'));
      this.isAvailable = false;
      this.isInitializing = false;
      return;
    }

    try {
      this.logger.log(
        `Configuration SMTP Gmail pour ${nodeEnv.toUpperCase()}...`,
      );

      const transporterConfig: SMTPTransport.Options = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 130000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
      };

      this.transporter = nodemailer.createTransport(transporterConfig);

      await this.transporter.verify();
      this.isAvailable = true;

      this.logger.log('Service SMTP Gmail opérationnel (Production)');
      this.logger.log(`Expéditeur: ${this.maskEmail(emailUser)}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur initialisation SMTP: ${errorMessage}`);
      await this.initializeWithFallback(emailUser, emailPass);
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeWithFallback(
    emailUser: string,
    emailPass: string,
  ): Promise<void> {
    try {
      this.logger.warn('Tentative avec port alternatif 587 (STARTTLS)...');

      const transporterConfig: SMTPTransport.Options = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 130000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3',
        },
      };

      this.transporter = nodemailer.createTransport(transporterConfig);

      await this.transporter.verify();
      this.isAvailable = true;
      this.logger.log(
        'Service SMTP Gmail opérationnel via port 587 (STARTTLS)',
      );
    } catch (fallbackError: unknown) {
      const errorMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : 'Erreur inconnue';
      this.logger.error(`Échec configuration alternative: ${errorMessage}`);
      await this.initializeSimplified(emailUser, emailPass);
    }
  }

  private async initializeSimplified(
    emailUser: string,
    emailPass: string,
  ): Promise<void> {
    try {
      this.logger.warn('Tentative avec configuration simplifiée...');

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      await this.transporter.verify();
      this.isAvailable = true;
      this.logger.log(
        'Service SMTP Gmail opérationnel (configuration simplifiée)',
      );
    } catch (simpleError: unknown) {
      const errorMessage =
        simpleError instanceof Error ? simpleError.message : 'Erreur inconnue';
      this.logger.error(`Échec configuration simplifiée: ${errorMessage}`);
      this.isAvailable = false;
      this.displayTroubleshootingTips(emailUser);
    }
  }

  private displayTroubleshootingTips(emailUser: string): void {
    this.logger.error('🔧 CONSEILS DE DÉPANNAGEMENT SMTP GMAIL:');
    this.logger.error("1. Vérifiez votre mot de passe d'application Google:");
    this.logger.error('   - Allez sur https://myaccount.google.com/security');
    this.logger.error(
      '   - Activez la "Validation en 2 étapes" si ce n\'est pas fait',
    );
    this.logger.error('   - Générez un "Mot de passe d\'application"');
    this.logger.error('   - Utilisez ce mot de passe comme EMAIL_PASS');
    this.logger.error('');
    this.logger.error('2. Vérifiez les accès SMTP dans votre compte Google:');
    this.logger.error("   - Utilisez les mots de passe d'application");
    this.logger.error('');
    this.logger.error('3. Vérifiez votre connexion réseau:');
    this.logger.error('   - Testez la connexion: telnet smtp.gmail.com 465');
    this.logger.error('   - Désactivez temporairement le pare-feu/antivirus');
    this.logger.error('');
    this.logger.error(`4. Email utilisé: ${this.maskEmail(emailUser)}`);
  }

  async initManually(): Promise<void> {
    this.logger.log('Initialisation manuelle du service SMTP...');
    await this.initialize();
  }

  // ==================== ENVOI D'EMAIL ====================

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();

      if (!this.isAvailable) {
        const message = 'Email ignoré - service SMTP indisponible';
        this.logger.warn(message);
        return { success: false, error: message };
      }
    }

    if (!this.transporter) {
      const message = 'Transporter SMTP non initialisé';
      this.logger.error(message);
      return { success: false, error: message };
    }

    if (!this.canSendEmail()) {
      const message = "Limite quotidienne d'emails atteinte";
      this.logger.warn(message);
      return { success: false, error: message };
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const fromEmail = options.from || this.getFromEmailAddress();
        const fromName = options.fromName || this.fromName;
        const recipients = Array.isArray(options.to)
          ? options.to
          : [options.to];

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
          priority: options.priority || 'normal',
        };

        const info = (await this.transporter.sendMail(mailOptions)) as {
          messageId: string;
        };

        this.emailSentTimestamps.push(new Date());

        const recipientInfo = Array.isArray(options.to)
          ? `${options.to.length} destinataire(s)`
          : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;

        this.logger.log(
          `Email envoyé (tentative ${attempt}/${this.retryAttempts}) — sujet: "${options.subject}" — vers: ${recipientInfo}`,
        );
        this.logger.debug(`Message ID: ${info.messageId}`);

        return {
          success: true,
          messageId: info.messageId,
        };
      } catch (error: any) {
        lastError = error;
        this.logEmailError(error, attempt);

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`Nouvelle tentative dans ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `Échec après ${this.retryAttempts} tentatives pour: ${options.subject}`,
    );

    return {
      success: false,
      error:
        lastError instanceof Error
          ? lastError.message
          : "Erreur inconnue lors de l'envoi de l'email",
    };
  }

  private logEmailError(error: unknown, attempt: number): void {
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: string }).code
        : 'UNKNOWN';
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur inconnue';

    this.logger.error(
      `Erreur SMTP ${errorCode} (tentative ${attempt}): ${errorMessage}`,
    );

    const responseCode =
      error && typeof error === 'object' && 'responseCode' in error
        ? (error as { responseCode?: number }).responseCode
        : undefined;
    const response =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: string }).response
        : undefined;

    if (responseCode) {
      this.logger.error(
        `Code réponse SMTP: ${responseCode} - ${response || 'N/A'}`,
      );
    }

    if (errorCode === 'EAUTH') {
      this.logger.error(
        "Conseil: Générez un nouveau mot de passe d'application Google",
      );
    }
  }

  // ==================== UTILITAIRES ====================

  private canSendEmail(): boolean {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.emailSentTimestamps = this.emailSentTimestamps.filter(
      (timestamp) => timestamp > oneDayAgo,
    );

    if (
      this.emailSentTimestamps.length >= EMAIL_CONFIG.LIMITS.MAX_EMAILS_PER_DAY
    ) {
      this.logger.warn(
        `Limite quotidienne atteinte: ${this.emailSentTimestamps.length}/${EMAIL_CONFIG.LIMITS.MAX_EMAILS_PER_DAY} emails`,
      );
      return false;
    }

    return true;
  }

  private cleanupOldTimestamps(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const before = this.emailSentTimestamps.length;
    this.emailSentTimestamps = this.emailSentTimestamps.filter(
      (timestamp) => timestamp > oneDayAgo,
    );
    const after = this.emailSentTimestamps.length;

    if (before !== after) {
      this.logger.debug(
        `Nettoyage timestamps: ${before - after} anciennes entrées supprimées`,
      );
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
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  private maskEmail(email: string): string {
    if (!email?.includes('@')) return '***@***';
    const [name, domain] = email.split('@');
    const masked = name.length > 2 ? name.substring(0, 2) + '***' : '***';
    return `${masked}@${domain}`;
  }

  private getFromEmailAddress(): string {
    const emailUser = this.getEmailUser();
    return emailUser || '';
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

  private getErrorAdvice(error: unknown): string {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: string }).code
        : undefined;

    if (code === 'EAUTH') {
      return "Générez un nouveau mot de passe d'application sur https://myaccount.google.com/apppasswords";
    }
    if (code === 'ECONNECTION' || code === 'ECONNREFUSED') {
      return 'Vérifiez votre connexion internet et les pare-feux. Testez: telnet smtp.gmail.com 465';
    }
    if (code === 'ETIMEDOUT') {
      return 'Timeout de connexion. Vérifiez votre réseau ou utilisez le port 587';
    }
    if (code === 'ESOCKET') {
      return 'Erreur socket. Vérifiez les paramètres réseau et antivirus';
    }
    return 'Consultez les logs pour plus de détails';
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  isServiceAvailable(): boolean {
    const emailUser = this.getEmailUser();
    const emailPass = this.getEmailPass();

    if (!emailUser || !emailPass) {
      return false;
    }
    return this.isAvailable;
  }

  getStatus(): Status {
    const options = this.transporter?.options as SMTPTransport.Options;
    const emailUser = this.getEmailUser();

    return {
      available: this.isServiceAvailable(),
      message: this.isAvailable
        ? 'SMTP Gmail opérationnel'
        : 'Service SMTP indisponible',
      host: options?.host || 'smtp.gmail.com',
      port: options?.port || 465,
      secure: options?.secure || true,
      fromEmail: emailUser || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      if (this.isAvailable && this.transporter) {
        await this.transporter.verify();
        const options = this.transporter.options as SMTPTransport.Options;

        return {
          success: true,
          message:
            `SMTP Gmail opérationnel\n` +
            `Expéditeur: ${this.maskEmail(this.fromEmail)}\n` +
            `Hôte: ${options.host || 'smtp.gmail.com'}:${options.port || 465}\n` +
            `Sécurité: ${options.secure ? 'SSL/TLS' : 'STARTTLS'}\n` +
            `Emails aujourd'hui: ${this.emailSentTimestamps.length}/${EMAIL_CONFIG.LIMITS.MAX_EMAILS_PER_DAY}`,
        };
      }

      return {
        success: false,
        message:
          ' Service SMTP indisponible. Vérifiez:\n' +
          '1.  EMAIL_USER et EMAIL_PASS sont définis\n' +
          "2.  Le mot de passe d'application Google est valide\n" +
          "3.  L'accès SMTP est autorisé dans votre compte Google\n" +
          '4.  Votre connexion internet fonctionne',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: string }).code
          : 'N/A';

      return {
        success: false,
        message:
          `Erreur de test SMTP: ${errorMessage}\n` +
          `Code: ${errorCode}\n` +
          `Conseil: ${this.getErrorAdvice(error)}`,
      };
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
      limit: EMAIL_CONFIG.LIMITS.MAX_EMAILS_PER_DAY,
      available: Math.max(
        0,
        EMAIL_CONFIG.LIMITS.MAX_EMAILS_PER_DAY - todayCount,
      ),
      isAvailable: this.isAvailable,
    };
  }

  close(): void {
    if (this.transporter) {
      try {
        this.transporter.close();
        this.logger.log('Connexions SMTP fermées');
      } catch (error) {
        this.logger.warn(
          `Erreur lors de la fermeture SMTP: ${(error as Error).message}`,
        );
      }
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Connexion SMTP vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error(
        `Échec de vérification SMTP: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
