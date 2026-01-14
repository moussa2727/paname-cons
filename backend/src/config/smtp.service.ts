import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
}

@Injectable()
export class SmtpService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(SmtpService.name);
  private readonly fromEmail: string;
  private readonly fromName: string = 'Paname Consulting';
  private readonly emailUser: string;
  private readonly emailPass: string;  

  constructor(private configService: ConfigService) {
    // Configuration simplifiée et robuste pour Gmail
    this.emailUser = this.configService.get<string>('EMAIL_USER') || process.env.EMAIL_USER || getEnv("EMAIL_USER", '');
    this.emailPass = this.configService.get<string>('EMAIL_PASS') || process.env.EMAIL_PASS || getEnv("EMAIL_PASS", '');
    this.fromEmail = this.emailUser;
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'LOGIN',
        user: this.emailUser,
        pass: this.emailPass,
      },
      // Configuration optimisée pour Gmail
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 secondes
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const maskedUser = this.maskEmail(this.emailUser);
    this.logger.log(`Service SMTP initialisé pour: ${maskedUser}`);
  }

  /**
   * Vérifie si le service SMTP est configuré
   */
  isConfigured(): boolean {
    return !!(this.emailUser && this.emailPass);
  }

  /**
   * Masque une adresse email pour la journalisation
   */
  private maskEmail(email: string | string[]): string {
    if (!email) return '[EMAIL_NON_DEFINI]';
    
    // Gestion des tableaux d'emails
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
    
    // Garde les 2 premiers caractères du local part, masque le reste
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + '*'.repeat(Math.min(localPart.length - 2, 4))
      : '*'.repeat(localPart.length);
    
    // Masque partiellement le domaine
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
   * Masque le mot de passe pour la journalisation
   */
  private maskPassword(password: string): string {
    if (!password) return '[MOT_DE_PASSE_NON_DEFINI]';
    if (password.length <= 4) return '****';
    return password.substring(0, 2) + '*'.repeat(password.length - 4) + password.substring(password.length - 2);
  }

  /**
   * Envoie un email avec les options fournies
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    // Vérification rapide de la configuration
    if (!this.isConfigured()) {
      const error = 'Service SMTP non configuré. Vérifiez EMAIL_USER et EMAIL_PASS.';
      this.logger.error(error);
      return { success: false, error };
    }

    try {
      const maskedTo = this.maskEmail(options.to);
      this.logger.log(`Tentative d'envoi d'email à: ${maskedTo}, Sujet: ${options.subject.substring(0, 50)}${options.subject.length > 50 ? '...' : ''}`);

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        replyTo: options.replyTo,
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        attachments: options.attachments,
        priority: options.priority,
      });

      this.logger.log(`Email envoyé avec succès à: ${maskedTo}`);
      return { success: true };
      
    } catch (error: any) {
      // Gestion d'erreur améliorée avec masquage
      const errorMessage = this.getErrorMessage(error);
      const maskedError = this.maskSensitiveInfo(errorMessage);
      
      this.logger.error(`Échec d'envoi d'email: ${maskedError}`);
      
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
    // Masque les emails dans le message d'erreur
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let maskedMessage = message;
    
    const emails = message.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        const maskedEmail = this.maskSingleEmail(email);
        maskedMessage = maskedMessage.replace(email, maskedEmail);
      });
    }
    
    // Masque les tokens/passwords potentiels
    maskedMessage = maskedMessage.replace(/(pass(word)?|token|secret|key)=[^&\s]+/gi, (match) => {
      const [key, value] = match.split('=');
      return `${key}=***`;
    });
    
    return maskedMessage;
  }

  /**
   * Teste la connexion SMTP
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      const maskedUser = this.maskEmail(this.emailUser);
      return {
        success: false,
        message: `SMTP non configuré. Email: ${maskedUser}`
      };
    }

    try {
      const maskedUser = this.maskEmail(this.emailUser);
      this.logger.log(`Test de connexion SMTP pour: ${maskedUser}`);
      
      await this.transporter.verify();
      
      this.logger.log('Connexion SMTP réussie');
      return {
        success: true,
        message: 'Connexion SMTP réussie avec Gmail'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const maskedError = this.maskSensitiveInfo(errorMessage);
      
      this.logger.error(`Échec de connexion SMTP: ${maskedError}`);
      return {
        success: false,
        message: `Échec de connexion SMTP: ${maskedError}`
      };
    }
  }

  /**
   * Récupère le statut du service SMTP (version masquée pour la sécurité)
   */
  getStatus() {
    const isConfigured = this.isConfigured();
    const maskedEmail = this.maskEmail(this.fromEmail);
    const maskedUser = this.maskEmail(this.emailUser);
    
    return {
      available: isConfigured,
      configured: isConfigured,
      message: isConfigured ? 'Service SMTP configuré et prêt' : 'Service SMTP non configuré',
      fromEmail: maskedEmail,
      fromName: this.fromName,
      emailUserConfigured: !!this.emailUser,
      emailPassConfigured: !!this.emailPass,
      host: 'smtp.gmail.com'
    };
  }

  /**
   * Récupère le statut détaillé (uniquement pour les logs internes sécurisés)
   */
  private getDetailedStatusForLogs() {
    const isConfigured = this.isConfigured();
    const maskedUser = this.maskEmail(this.emailUser);
    const maskedPass = this.maskPassword(this.emailPass);
    
    return {
      configured: isConfigured,
      emailUser: maskedUser,
      emailPassConfigured: !!this.emailPass,
      emailPassLength: this.emailPass ? this.emailPass.length : 0,
      emailPassMasked: maskedPass
    };
  }

  /**
   * Méthode utilitaire pour convertir HTML en texte brut
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ') // Remplace les balises par des espaces
      .replace(/\s+/g, ' ') // Réduit les espaces multiples
      .trim();
  }

  /**
   * Traduction des erreurs SMTP courantes
   */
  private getErrorMessage(error: any): string {
    const message = error.message || 'Erreur inconnue';
    
    // Messages d'erreur courants de Gmail
    if (message.includes('Invalid login')) {
      return 'Identifiants Gmail incorrects. Utilisez un mot de passe d\'application.';
    }
    if (message.includes('rate limit')) {
      return 'Limite d\'envoi atteinte. Veuillez patienter.';
    }
    if (message.includes('timeout')) {
      return 'Timeout de connexion au serveur SMTP.';
    }
    if (message.includes('ECONNREFUSED')) {
      return 'Connexion refusée au serveur SMTP.';
    }
    if (message.includes('535')) {
      return 'Échec d\'authentification. Activez la vérification en 2 étapes et utilisez un mot de passe d\'application.';
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
    this.logger.log(`Statut SMTP: ${JSON.stringify(status)}`);
  }
}