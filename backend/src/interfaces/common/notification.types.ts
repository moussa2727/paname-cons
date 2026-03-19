// =================================
// TYPES NOTIFICATION (Notifications système)
// =================================

export interface NotificationConfig {
  enabled: boolean;
  channels: string[];
  templates: {
    email: boolean;
    sms: boolean;
    push: boolean;
    webhook: boolean;
  };
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  recipients: string[];
  channels: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channel: string;
  error?: string;
  timestamp: string;
}
