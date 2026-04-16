import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, Auth } from 'googleapis';

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

@Injectable()
export class EmailConfig implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EmailConfig.name);
  private oAuth2Client: Auth.OAuth2Client | null = null;
  private isAvailable = false;
  private readonly fromEmail: string;
  private readonly fromName = 'Paname Consulting';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private emailSentTimestamps: Date[] = [];

  constructor(private configService: ConfigService) {
    this.clientId = this.getEnv('GMAIL_CLIENT_ID');
    this.clientSecret = this.getEnv('GMAIL_CLIENT_SECRET');
    this.refreshToken = this.getEnv('GMAIL_REFRESH_TOKEN');
    this.fromEmail = this.getEnv('GMAIL_FROM') || '';
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) await this.initialize();
    if (!this.isAvailable || !this.oAuth2Client)
      return { success: false, error: 'Service indisponible' };

    try {
      await this.ensureValidToken();

      const raw = this.buildRawEmail(options);
      const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      this.emailSentTimestamps.push(new Date());
      this.logger.log(`Email envoyé à ${this.maskEmail(options.to)}`);

      return { success: true, messageId: response.data.id || undefined };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Échec: ${msg}`);

      if (msg.includes('invalid_grant') || msg.includes('401')) {
        await this.refreshAccessToken();
        try {
          const raw = this.buildRawEmail(options);
          const gmail = google.gmail({
            version: 'v1',
            auth: this.oAuth2Client,
          });
          const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw },
          });
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

  async onApplicationBootstrap() {
    await this.initialize();
  }
  onModuleDestroy() {
    this.oAuth2Client = null;
  }

  private async initialize(): Promise<void> {
    if (
      !this.clientId ||
      !this.clientSecret ||
      !this.refreshToken ||
      !this.fromEmail
    ) {
      this.logger.warn('Identifiants Gmail manquants');
      this.isAvailable = false;
      return;
    }

    this.oAuth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
    );
    this.oAuth2Client.setCredentials({ refresh_token: this.refreshToken });

    try {
      // Verify connection by testing token refresh
      await this.ensureValidToken();
      this.isAvailable = true;
      this.logger.log(
        `Gmail API initialisée - ${this.maskEmail(this.fromEmail)}`,
      );
    } catch (error) {
      this.logger.error(
        `Échec initialisation Gmail: ${(error as Error).message}`,
      );
      this.isAvailable = false;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.oAuth2Client) throw new Error('Client non initialisé');
    const creds = this.oAuth2Client.credentials;
    if (
      !creds.access_token ||
      !creds.expiry_date ||
      creds.expiry_date <= Date.now() + 5 * 60 * 1000
    ) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.oAuth2Client) throw new Error('Client non initialisé');
    const { credentials } = await this.oAuth2Client.refreshAccessToken();
    this.oAuth2Client.setCredentials({
      refresh_token: credentials.refresh_token || this.refreshToken,
    });
    this.logger.log('Token rafraîchi');
  }

  private buildRawEmail(options: EmailOptions): string {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const from = options.from || this.fromEmail;
    const fromName = options.fromName || this.fromName;

    let email = `MIME-Version: 1.0\r\nTo: ${to}\r\nFrom: "${fromName}" <${from}>\r\n`;
    email += `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=\r\n`;

    if (options.replyTo) email += `Reply-To: ${options.replyTo}\r\n`;
    if (options.cc)
      email += `Cc: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}\r\n`;
    if (options.bcc)
      email += `Bcc: ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}\r\n`;

    if (options.priority === 'high')
      email += `Priority: urgent\r\nX-Priority: 1\r\n`;
    else if (options.priority === 'low')
      email += `Priority: non-urgent\r\nX-Priority: 5\r\n`;

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
    email += `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n`;
    email += `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    email += `${Buffer.from(options.html).toString('base64')}\r\n\r\n`;

    if (options.text) {
      email += `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      email += `${Buffer.from(options.text).toString('base64')}\r\n\r\n`;
    }

    for (const att of options.attachments || []) {
      email += `--${boundary}\r\nContent-Type: application/octet-stream; name="${att.filename}"\r\n`;
      email += `Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
      const content = att.content
        ? Buffer.isBuffer(att.content)
          ? att.content
          : Buffer.from(att.content)
        : Buffer.from('');
      email += `${content.toString('base64')}\r\n\r\n`;
    }

    email += `--${boundary}--`;
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private maskEmail(email: string | string[]): string {
    const e = Array.isArray(email) ? email[0] : email;
    if (!e) return '';
    const [local, domain] = e.split('@');
    return local.length <= 3
      ? `${local.charAt(0)}***@${domain}`
      : `${local.slice(0, 3)}***@${domain}`;
  }

  private getEnv(key: string): string {
    return process.env[key] || this.configService.get<string>(key) || '';
  }
}
