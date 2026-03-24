export interface EmailOptions {
  to: string | string[];
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  attachments?: any[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}
