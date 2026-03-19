// =================================
// TYPES AUDIT (Audit système)
// =================================

export interface AuditLog {
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  statusCode: number;
  duration?: number;
  userAgent?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

export interface AuditTrail {
  logs: AuditLog[];
  summary: {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    avgResponseTime?: number;
  };
}
