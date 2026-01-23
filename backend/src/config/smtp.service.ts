import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

@Injectable()
export class SmtpService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string = 'Paname Consulting';

  private readonly logger = new Logger('SmtpService');

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.warn('EMAIL_USER ou EMAIL_PASS non configuré');
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },

       tls: {
        rejectUnauthorized: false, // Pour les problèmes de certificat
      },

    });

    this.fromEmail = emailUser;

    const maskedEmail = this.maskEmail(this.fromEmail);
    this.logger.log(`Service SMTP initialisé avec: ${maskedEmail} (${this.configService.get<string>('EMAIL_USER')}:${this.configService.get<number>('EMAIL_PORT')})`, 'SmtpService');
  }

  /**
   * Vérifie si le service SMTP est configuré
   */
  isConfigured(): boolean {
    return !!this.transporter;
  }

  /**
   * Masque une adresse email pour la journalisation
   */
  private maskEmail(email: string | string[]): string {
    if (!email) return '[EMAIL_NON_DEFINI]';

    if (Array.isArray(email)) {
      return email.map(e => this.maskSingleEmail(e)).join(', ');
    }

    return this.maskSingleEmail(email);
  }

  /**
   * Masque une adresse email unique
   */
  private maskSingleEmail(email: string): string {
    if (!email || typeof email !== 'string') return '[EMAIL_INVALIDE]';

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '[EMAIL_MAL_FORMATE]';

    const maskedLocal = localPart.length > 2
      ? localPart.substring(0, 2) + '*'.repeat(Math.min(localPart.length - 2, 4))
      : '*'.repeat(localPart.length);

    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      const mainDomain = domainParts[0];
      const maskedDomain = mainDomain.length > 2
        ? mainDomain.substring(0, 2) + '*'.repeat(Math.min(mainDomain.length - 2, 3))
        : '*'.repeat(mainDomain.length);

      const tld = domainParts.slice(1).join('.');
      return `${maskedLocal}@${maskedDomain}.${tld}`;
    }

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Masque les IDs de message
   */
  private maskMessageId(id?: string): string {
    if (!id) return '[ID_MASQUE]';
    return id.substring(0, 4) + '****' + id.substring(Math.max(id.length - 4, 0));
  }

  /**
   * Envoie un email via SMTP Gmail
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      const error = 'Service SMTP non configuré. Vérifiez EMAIL_USER et EMAIL_PASS.';
      this.logger.error(error, 'SmtpService');
      return { success: false, error };
    }

    try {
      const maskedTo = this.maskEmail(options.to);
      const subjectPreview = options.subject.substring(0, 50) + (options.subject.length > 50 ? '...' : '');
      this.logger.log(`Tentative d'envoi d'email à: ${maskedTo}, Sujet: ${subjectPreview}`, 'SmtpService');

      const result = await this.transporter.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        priority: options.priority || 'normal',
      });

      const maskedId = this.maskMessageId(result.messageId);
      this.logger.log(`Email envoyé avec succès à: ${maskedTo} (ID: ${maskedId})`, 'SmtpService');
      return { success: true };

    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      const maskedError = this.maskSensitiveInfo(errorMessage);

      this.logger.error(`Échec d'envoi d'email: ${maskedError}`, 'SmtpService', error.stack);

      return {
        success: false,
        error: maskedError
      };
    }
  }

  /**
   * Masque les informations sensibles dans les messages d'erreur
   */
  private maskSensitiveInfo(message: string): string {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let maskedMessage = message;

    const emails = message.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        const maskedEmail = this.maskSingleEmail(email);
        maskedMessage = maskedMessage.replace(email, maskedEmail);
      });
    }

    maskedMessage = maskedMessage.replace(/(pass(word)?|token|secret|key)=[^&\s]+/gi, (match) => {
      const [key] = match.split('=');
      return `${key}=***`;
    });

    return maskedMessage;
  }

  /**
   * Teste la connexion SMTP
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Service SMTP non configuré'
      };
    }

    try {
      const maskedEmail = this.maskEmail(this.fromEmail);
      this.logger.log(`Test de connexion SMTP avec: ${maskedEmail}`, 'SmtpService');

      await this.transporter.verify();

      this.logger.log('Connexion SMTP réussie', 'SmtpService');
      return {
        success: true,
        message: 'Connexion SMTP réussie'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const maskedError = this.maskSensitiveInfo(errorMessage);

      this.logger.error(`Échec de connexion SMTP: ${maskedError}`, 'SmtpService');
      return {
        success: false,
        message: `Échec de connexion SMTP: ${maskedError}`
      };
    }
  }

  /**
   * Récupère le statut du service SMTP
   */
  getStatus() {
    const isConfigured = this.isConfigured();
    const maskedEmail = this.maskEmail(this.fromEmail);

    return {
      available: isConfigured,
      configured: isConfigured,
      message: isConfigured ? 'Service SMTP configuré et prêt' : 'Service SMTP non configuré',
      fromEmail: maskedEmail,
      fromName: this.fromName,
      provider: 'SMTP Gmail'
    };
  }

  /**
   * Récupère le statut détaillé (logs internes sécurisés)
   */
  private getDetailedStatusForLogs() {
    const isConfigured = this.isConfigured();
    const maskedEmail = this.maskEmail(this.fromEmail);

    return {
      configured: isConfigured,
      fromEmail: maskedEmail,
      provider: 'SMTP Gmail'
    };
  }

  /**
   * Traduction des erreurs SMTP courantes
   */
  private getErrorMessage(error: any): string {
    const message = error.message || 'Erreur inconnue';

    if (message.includes('Invalid login')) {
      return 'Identifiants SMTP invalides. Vérifiez EMAIL_USER et EMAIL_PASS.';
    }
    if (message.includes('ECONNREFUSED')) {
      return 'Impossible de se connecter au serveur SMTP. Vérifiez EMAIL_HOST et EMAIL_PORT.';
    }
    if (message.includes('Invalid email')) {
      return 'Adresse email invalide.';
    }
    if (message.includes('ETIMEDOUT')) {
      return 'Délai d\'attente dépassé. Le serveur SMTP ne répond pas.';
    }

    return message;
  }

  /**
   * Méthode simplifiée pour les emails courants
   */
  async sendSimpleEmail(to: string, subject: string, html: string): Promise<boolean> {
    const result = await this.sendEmail({ to, subject, html });
    return result.success;
  }

  /**
   * Journalisation sécurisée du service
   */
  logSecureInfo() {
    const status = this.getDetailedStatusForLogs();
    this.logger.log(`Statut SMTP: ${JSON.stringify(status)}`, 'SmtpService');
  }
}