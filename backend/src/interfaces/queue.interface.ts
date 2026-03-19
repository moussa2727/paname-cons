import type { Attachment } from 'nodemailer/lib/mailer';

export interface EmailJobData {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  channels?: 'email'[];
}

export interface ProcedureJobData {
  procedureId: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  previousStatus?: string;
  newStatus?: string;
  userId?: string;
}
