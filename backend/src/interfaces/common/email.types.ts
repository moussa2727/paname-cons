// =================================
// TYPES EMAIL (Services de messagerie)
// =================================

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailJobResult {
  success: boolean;
  jobId?: string;
  to?: string | string[];
  subject?: string;
  error?: string;
}

export interface BulkEmailJobData {
  emails: EmailJobData[];
}
