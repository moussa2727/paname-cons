// =================================
// TYPES HEALTH CHECK (Vérification santé système)
// =================================

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckStatus;
    cache: HealthCheckStatus;
    storage: HealthCheckStatus;
    memory: HealthCheckStatus;
    cpu: HealthCheckStatus;
  };
}

export interface HealthCheckStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}
