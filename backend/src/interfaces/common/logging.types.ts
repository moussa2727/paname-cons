// =================================
// TYPES LOGGING (Gestion des logs)
// =================================

export interface LogContext {
  context?: string;
  duration?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
}

export interface LogMetadata {
  service: string;
  timestamp?: string;
}
