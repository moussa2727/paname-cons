import { RendezvousStatus, ProcedureStatus } from '@prisma/client';

// ==================== EMAIL JOB DATA ====================

export interface EmailJobData {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  metadata?: {
    type?: string;
    source?: string;
    jobId?: string;
    correlationId?: string;
    userId?: string;
  };
}

// ==================== NOTIFICATION JOB DATA ====================

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  title: string;
  body: string;
  channels?: ('email' | 'sms' | 'push')[];
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// ==================== PROCEDURE JOB DATA ====================

export interface ProcedureJobData {
  procedureId: string;
  action:
    | 'create'
    | 'status_change'
    | 'complete'
    | 'delete'
    | 'cancel'
    | 'reminder';
  oldStatus?: ProcedureStatus;
  newStatus?: ProcedureStatus;
  reason?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

// ==================== RENDEZVOUS JOB DATA ====================

export interface RendezvousJobData {
  rendezvousId: string;
  action:
    | 'create'
    | 'update'
    | 'cancel'
    | 'reminder'
    | 'auto_cancel'
    | 'complete';
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  oldStatus?: RendezvousStatus;
  newStatus?: RendezvousStatus;
  cancelledBy?: 'USER' | 'ADMIN';
  reason?: string;
  details?: {
    date?: Date;
    time?: string;
    destination?: string;
    cancelledBy?: 'USER' | 'ADMIN';
    cancellationReason?: string;
  };
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

// ==================== BACKUP JOB DATA ====================

export interface BackupJobData {
  type: 'full' | 'incremental' | 'schema';
  database: string;
  tables?: string[];
  compression?: boolean;
  retention?: number;
  destination?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
}

// ==================== REPORT JOB DATA ====================

export interface ReportJobData {
  type: 'procedures' | 'rendezvous' | 'users' | 'contacts' | 'statistics';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters?: Record<string, unknown>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  columns?: string[];
  emailTo?: string | string[];
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
}

// ==================== QUEUE STATISTICS ====================

export interface QueueJobStats {
  id: string | number;
  name?: string;
  data: Record<string, unknown>;
  opts?: unknown;
  progress?: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
  delay?: number;
}

export interface QueueStatistics {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  jobs: QueueJobStats[];
  isPaused?: boolean;
  workers?: number;
}

// ==================== EMAIL OPTIONS ====================

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  jobId?: string;
}

// ==================== AUTH EMAIL DATA ====================

export interface WelcomeEmailData {
  firstName: string;
  lastName?: string;
  dashboardUrl: string;
  email?: string;
  role?: string;
}

export interface ResetPasswordEmailData {
  firstName: string;
  resetLink: string;
  expiresInHours?: number;
  email?: string;
}

export interface PasswordChangedEmailData {
  firstName: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ==================== RENDEZVOUS EMAIL DATA ====================

export interface RendezvousConfirmationEmailData {
  id: string;
  firstName: string;
  lastName?: string;
  date: Date;
  time: string;
  destination: string;
  destinationAutre?: string | null;
  email?: string;
  telephone?: string;
  status?: RendezvousStatus;
  rendezvousUrl: string;
}

export interface RendezvousCancelledEmailData {
  id: string;
  firstName: string;
  date: Date;
  time: string;
  cancelledBy: 'USER' | 'ADMIN';
  reason?: string;
  email?: string;
  newRendezvousUrl: string;
}

export interface RendezvousStatusUpdatedEmailData {
  id: string;
  firstName: string;
  date: Date;
  time: string;
  oldStatus: RendezvousStatus;
  newStatus: RendezvousStatus;
  email?: string;
  rendezvousUrl: string;
}

export interface RendezvousReminderEmailData {
  id: string;
  firstName: string;
  date: Date;
  time: string;
  destination: string;
  destinationAutre?: string | null;
  email?: string;
  rendezvousUrl: string;
}

// ==================== PROCEDURE EMAIL DATA ====================

export interface ProcedureCreatedEmailData {
  id: string;
  firstName: string;
  lastName?: string;
  destination: string;
  filiere: string;
  statut: ProcedureStatus;
  email?: string;
  telephone?: string;
  procedureUrl: string;
}

export interface ProcedureStatusUpdatedEmailData {
  id: string;
  firstName: string;
  destination: string;
  filiere: string;
  oldStatus: ProcedureStatus;
  newStatus: ProcedureStatus;
  email?: string;
  procedureUrl: string;
}

export interface ProcedureCompletedEmailData {
  id: string;
  firstName: string;
  destination: string;
  filiere: string;
  email?: string;
  procedureUrl: string;
}

export interface ProcedureDeletedEmailData {
  firstName: string;
  destination: string;
  reason: string;
  email?: string;
}

export interface ProcedureCancelledEmailData {
  firstName: string;
  destination: string;
  reason: string;
  email?: string;
}

// ==================== CONTACT EMAIL DATA ====================

export interface ContactConfirmationEmailData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt?: Date;
}

export interface ContactNotificationEmailData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt: Date;
  adminUrl: string;
}

export interface ContactReplyEmailData {
  firstName: string;
  lastName: string;
  email: string;
  response: string;
}

// ==================== USER EMAIL DATA ====================

export interface ProfileUpdatedEmailData {
  firstName: string;
  email?: string;
  dashboardUrl: string;
}

// ==================== ADMIN ALERT DATA ====================

export interface AdminAlertData {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

// ==================== JOB RESULT TYPES ====================

export interface EmailJobResult {
  success: boolean;
  jobId: string;
  messageId?: string;
  subject?: string;
  error?: string;
  sentAt?: Date;
}

export interface BulkEmailJobResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    to: string | string[];
    error?: string;
    messageId?: string;
  }>;
}

export interface NotificationJobResult {
  success: boolean;
  userId: string;
  notificationId?: string;
  channel?: string;
  error?: string;
  sentAt?: Date;
}

export interface ProcedureJobResult {
  success: boolean;
  procedureId: string;
  action: string;
  error?: string;
  processedAt?: Date;
}

export interface RendezvousJobResult {
  success: boolean;
  rendezvousId: string;
  action: string;
  error?: string;
  processedAt?: Date;
}

export interface BackupJobResult {
  success: boolean;
  type: string;
  database: string;
  backupPath?: string;
  size?: number;
  duration?: number;
  error?: string;
  completedAt?: Date;
}

export interface ReportJobResult {
  success: boolean;
  type: string;
  format: string;
  filePath?: string;
  fileSize?: number;
  rowsCount?: number;
  error?: string;
  completedAt?: Date;
  downloadUrl?: string;
}

// ==================== QUEUE CONFIGURATION ====================

export interface QueueConfig {
  name: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    timeout?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    priority?: number;
  };
}

// ==================== QUEUE EVENTS ====================

export interface QueueEventData {
  queueName: string;
  eventType:
    | 'waiting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'stalled'
    | 'progress'
    | 'paused'
    | 'resumed';
  jobId?: string;
  jobData?: Record<string, unknown>;
  error?: string;
  timestamp: Date;
}

// ==================== INTERFACES INDEX ====================

export * from './queue.interface';
