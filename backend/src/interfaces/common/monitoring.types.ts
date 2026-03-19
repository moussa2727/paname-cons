// =================================
// TYPES MONITORING (Monitoring système)
// =================================

export interface MonitoringMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    errors: number;
    avgQueryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
  };
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
}
