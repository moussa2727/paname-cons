import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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

export interface Status {
  available: boolean;
  message: string;
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
}

// ==================== CONFIGURATION CENTRALISÉE EMAIL ====================

export const EMAIL_CONFIG = {
  // Timeouts SMTP (millisecondes)
  SMTP: {
    CONNECTION_TIMEOUT: 120000,
    GREETING_TIMEOUT: 120000, // 120s pour le handshake SMTP
    SOCKET_TIMEOUT: 120000, // 120s pour les opérations socket
  },

  // Timeouts de traitement (millisecondes)
  PROCESSING: {
    SEND_TIMEOUT: 180000, // 180s pour l'envoi d'un email
    VERIFICATION_DELAY: 60000, // 15s avant vérification au démarrage
  },

  // Configuration BullMQ
  QUEUE: {
    ATTEMPTS: 5, // Augmenté à 5 tentatives
    BACKOFF_DELAY: 10000, // 10s entre tentatives
    STALLED_INTERVAL: 30000, // 30s pour vérifier les jobs bloqués
    MAX_STALLED_COUNT: 1,
    REMOVE_ON_COMPLETE: 100,
    REMOVE_ON_FAIL: 500,
  },

  // Ports et protocoles
  SMTP_CONFIG: {
    service: 'gmail',
    HOST: 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT || '587'),
    SECURE: false,
    FAMILY: 4, // Forcer IPv4
  },
};

/**
 * Point de connexion SMTP unique.
 * Tous les envois d'emails passent par cette classe.
 * MailService et tout autre service injectent EmailConfig pour envoyer.
 */
@Injectable()
export class EmailConfig implements OnApplicationBootstrap {
  private transporter: nodemailer.Transporter;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger(EmailConfig.name);

  constructor(private configService: ConfigService) {
    this.logger = new Logger(EmailConfig.name);

    const emailUser =
      process.env.EMAIL_USER || this.configService.get<string>('EMAIL_USER');
    const emailPass =
      process.env.EMAIL_PASS || this.configService.get<string>('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.warn(
        'EMAIL_USER ou EMAIL_PASS non configuré — les emails ne seront pas envoyés',
      );
    }

    // Configuration SMTP centralisée avec options de retry
    this.transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.SMTP_CONFIG.service,
      family: EMAIL_CONFIG.SMTP_CONFIG.FAMILY,
      host: EMAIL_CONFIG.SMTP_CONFIG.HOST,
      port: EMAIL_CONFIG.SMTP_CONFIG.PORT,
      secure: EMAIL_CONFIG.SMTP_CONFIG.SECURE,
      auth: {
        type: 'LOGIN',
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: EMAIL_CONFIG.SMTP.CONNECTION_TIMEOUT,
      greetingTimeout: EMAIL_CONFIG.SMTP.GREETING_TIMEOUT,
      socketTimeout: EMAIL_CONFIG.SMTP.SOCKET_TIMEOUT,
      tls: {
        rejectUnauthorized: false, // Pour les connexions Gmail
      },
      pool: true, // Activer le pool de connexions
      maxConnections: 5, // Limiter les connexions simultanées
      maxMessages: 100, // Messages par connexion
    } as nodemailer.TransportOptions);

    this.fromEmail = emailUser || '';
  }

  // ==================== INIT ====================

  onApplicationBootstrap() {
    // Vérification asynchrone après démarrage complet du serveur
    setTimeout(() => {
      void this.verifyConnection();
    }, EMAIL_CONFIG.PROCESSING.VERIFICATION_DELAY);
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log(' Gmail SMTP connecté avec succès');
    } catch (error) {
      this.logger.error(
        ` Gmail SMTP échec de connexion: ${(error as Error).message}`,
      );
    }
  }

  // ==================== ENVOI ====================

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.fromEmail) {
      this.logger.error("EMAIL_USER manquant — impossible d'envoyer");
      return { success: false, error: 'EMAIL_USER non configuré' };
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
      });

      const recipientInfo = Array.isArray(options.to)
        ? `${options.to.length} destinataire(s)`
        : `1 destinataire (${LoggerSanitizer.maskEmail(options.to)})`;
      this.logger.log(
        ` Email envoyé — sujet: "${options.subject}" — vers: ${recipientInfo}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Échec envoi — sujet: "${options.subject}" — erreur: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }

  // ==================== UTILITAIRES ====================

  isServiceAvailable(): boolean {
    const emailUser =
      process.env.EMAIL_USER || this.configService.get<string>('EMAIL_USER');
    const emailPass =
      process.env.EMAIL_PASS || this.configService.get<string>('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      return false;
    }
    return true;
  }

  getStatus(): Status {
    const emailUser =
      process.env.EMAIL_USER || this.configService.get<string>('EMAIL_USER');

    return {
      available: this.isServiceAvailable(),
      message: this.isServiceAvailable()
        ? 'Service disponible'
        : 'Service non configuré',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      fromEmail: emailUser || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const isAvailable = this.isServiceAvailable();
      if (!isAvailable) {
        return {
          success: false,
          message: 'Service non configuré (EMAIL_USER ou EMAIL_PASS manquant)',
        };
      }

      await this.transporter.verify();
      return {
        success: true,
        message: 'Connexion SMTP réussie',
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion SMTP: ${(error as Error).message}`,
      };
    }
  }
}
