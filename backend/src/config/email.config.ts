// gmail-email.config.ts
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1, Auth } from 'googleapis';

// Type pour les credentials (défini localement pour éviter l'import)
interface Credentials {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string;
  token_type?: string;
  id_token?: string | null;
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
}

export interface Status {
  available: boolean;
  message: string;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  refreshTokenConfigured: boolean;
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
  private oAuth2Client: Auth.OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private readonly logger = new Logger(EmailConfig.name);
  private isAvailable: boolean = false;
  readonly fromEmail: string;
  readonly fromName: string = 'Paname Consulting';
  private adminEmail: string;
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private emailSentTimestamps: Date[] = [];

  constructor(private configService: ConfigService) {
    this.clientId = this.getEnv('GMAIL_CLIENT_ID');
    this.clientSecret = this.getEnv('GMAIL_CLIENT_SECRET');
    this.refreshToken = this.getEnv('GMAIL_REFRESH_TOKEN');
    this.fromEmail = this.getEnv('GMAIL_FROM') || '';
    this.adminEmail = this.getEnv('GMAIL_USER');
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!this.isAvailable || !this.gmail) {
      return { success: false, error: 'Service Gmail API indisponible' };
    }

    try {
      await this.ensureValidToken();

      const rawEmail = this.createRawEmail(options);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawEmail,
        },
      });

      this.emailSentTimestamps.push(new Date());
      const recipients = Array.isArray(options.to)
        ? options.to.map((email) => this.maskEmail(email))
        : [this.maskEmail(options.to)];
      this.logger.log(
        `Email envoyé avec succès à ${this.formatRecipients(recipients)} - Message ID: ${response.data.id}`,
      );

      return { success: true, messageId: response.data.id || undefined };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec envoi email: ${msg}`);

      if (msg.includes('invalid_grant') || msg.includes('401')) {
        this.logger.log('Token expiré, tentative de rafraîchissement...');
        await this.refreshAccessToken();

        try {
          const rawEmail = this.createRawEmail(options);
          const response = await this.gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawEmail },
          });
          this.emailSentTimestamps.push(new Date());
          return { success: true, messageId: response.data.id || undefined };
        } catch (retryError) {
          return { success: false, error: (retryError as Error).message };
        }
      }

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
        ? `Service Gmail API disponible - Email: ${this.maskEmail(this.fromEmail)}`
        : 'Service non configuré ou indisponible',
      clientIdConfigured: !!this.clientId,
      clientSecretConfigured: !!this.clientSecret,
      refreshTokenConfigured: !!this.refreshToken,
      fromEmail: this.fromEmail || 'Non configuré',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      if (!this.isAvailable || !this.gmail) {
        return { success: false, message: 'Service Gmail API non disponible' };
      }

      const profile = await this.gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        message: `Connexion Gmail API réussie - Compte: ${profile.data.emailAddress}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.gmail) {
        await this.initialize();
      }

      if (!this.gmail) {
        return false;
      }

      this.logger.log(
        `Connexion Gmail API vérifiée - Compte: ${this.maskEmail(this.fromEmail)}`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Échec vérification Gmail API: ${err.message}`);
      return false;
    }
  }

  close(): void {
    this.gmail = null;
    this.oAuth2Client = null;
    this.logger.log('Service Gmail API fermé');
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

    const limit = 500;

    return {
      totalToday: todayCount,
      limit,
      available: Math.max(0, limit - todayCount),
      isAvailable: this.isAvailable,
    };
  }

  async getAccountInfo(): Promise<{
    email: string;
    messagesTotal: number;
    threadsTotal: number;
  } | null> {
    if (!this.isAvailable || !this.gmail) {
      return null;
    }

    try {
      await this.ensureValidToken();
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      return {
        email: profile.data.emailAddress || '',
        messagesTotal: profile.data.messagesTotal || 0,
        threadsTotal: profile.data.threadsTotal || 0,
      };
    } catch (error) {
      this.logger.error(
        `Erreur récupération compte: ${(error as Error).message}`,
      );
      return null;
    }
  }

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
      if (!this.clientId || !this.clientSecret || !this.refreshToken) {
        this.logger.warn(
          'Gmail API: Identifiants manquants (clientId, clientSecret, refreshToken)',
        );
        this.isAvailable = false;
        return;
      }

      if (!this.fromEmail) {
        this.logger.warn(
          'Gmail API: Email expéditeur non configuré (GMAIL_FROM)',
        );
        this.isAvailable = false;
        return;
      }

      // Initialiser le client OAuth2 via googleapis
      this.oAuth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
      );

      this.oAuth2Client.setCredentials({
        refresh_token: this.refreshToken,
      });

      // Gérer le rafraîchissement automatique
      this.oAuth2Client.on('tokens', (tokens: Credentials) => {
        if (tokens.refresh_token) {
          this.logger.warn(
            'Nouveau refresh token reçu - Mettez à jour votre .env',
          );
        }
        this.logger.log("Token d'accès rafraîchi automatiquement");
      });

      this.gmail = google.gmail({
        version: 'v1',
        auth: this.oAuth2Client,
      });

      const isVerified = await this.verifyConnection();
      this.isAvailable = isVerified;

      if (isVerified) {
        this.logger.log(
          `Gmail API initialisée avec succès - Email: ${this.maskEmail(this.fromEmail)}`,
        );
      } else {
        this.logger.error("Gmail API: Échec de l'initialisation");
        this.isAvailable = false;
      }
    } catch (error) {
      this.logger.error(
        `Gmail API: Erreur d'initialisation: ${(error as Error).message}`,
      );
      this.isAvailable = false;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('Client OAuth2 non initialisé');
    }

    const credentials = this.oAuth2Client.credentials;

    if (!credentials.access_token || !credentials.expiry_date) {
      await this.refreshAccessToken();
      return;
    }

    const now = Date.now();
    if (credentials.expiry_date <= now + 5 * 60 * 1000) {
      this.logger.log("Token proche de l'expiration, rafraîchissement...");
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('Client OAuth2 non initialisé');
    }

    try {
      const { credentials } = await this.oAuth2Client.refreshAccessToken();
      this.oAuth2Client.setCredentials({
        refresh_token: credentials.refresh_token || this.refreshToken,
      });
      this.logger.log("Token d'accès rafraîchi avec succès");
    } catch (error) {
      this.logger.error(
        `Échec du rafraîchissement du token: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private createRawEmail(options: EmailOptions): string {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const from = options.from || this.fromEmail;
    const fromName = options.fromName || this.fromName;

    let email = '';

    email += `MIME-Version: 1.0\r\n`;
    email += `To: ${to}\r\n`;
    email += `From: "${fromName}" <${from}>\r\n`;
    email += `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=\r\n`;

    if (options.replyTo) {
      email += `Reply-To: ${options.replyTo}\r\n`;
    }

    if (options.cc) {
      const cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      email += `Cc: ${cc}\r\n`;
    }
    if (options.bcc) {
      const bcc = Array.isArray(options.bcc)
        ? options.bcc.join(', ')
        : options.bcc;
      email += `Bcc: ${bcc}\r\n`;
    }

    if (options.priority === 'high') {
      email += `Priority: urgent\r\n`;
      email += `X-Priority: 1\r\n`;
    } else if (options.priority === 'low') {
      email += `Priority: non-urgent\r\n`;
      email += `X-Priority: 5\r\n`;
    }

    const boundary =
      '----=_Part_' + Date.now() + '_' + Math.random().toString(36);
    email += `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n`;

    email += `--${boundary}\r\n`;
    email += `Content-Type: text/html; charset=UTF-8\r\n`;
    email += `Content-Transfer-Encoding: base64\r\n\r\n`;
    email += `${Buffer.from(options.html).toString('base64')}\r\n\r\n`;

    if (options.text) {
      email += `--${boundary}\r\n`;
      email += `Content-Type: text/plain; charset=UTF-8\r\n`;
      email += `Content-Transfer-Encoding: base64\r\n\r\n`;
      email += `${Buffer.from(options.text).toString('base64')}\r\n\r\n`;
    }

    if (options.attachments && options.attachments.length > 0) {
      for (const attachment of options.attachments) {
        email += `--${boundary}\r\n`;
        email += `Content-Type: application/octet-stream; name="${attachment.filename}"\r\n`;
        email += `Content-Transfer-Encoding: base64\r\n`;
        email += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;

        let content: Buffer;
        if (attachment.content) {
          content = Buffer.isBuffer(attachment.content)
            ? attachment.content
            : Buffer.from(attachment.content);
        } else {
          content = Buffer.from('');
        }

        email += content.toString('base64');
        email += `\r\n\r\n`;
      }
    }

    email += `--${boundary}--`;

    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
