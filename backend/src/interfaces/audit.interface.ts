export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AuditOptions {
  skip?: boolean;
  maskFields?: string[];
  sensitive?: boolean;
}
