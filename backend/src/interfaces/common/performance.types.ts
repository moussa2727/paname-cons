// =================================
// TYPES PERFORMANCE (Performance système)
// =================================

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requests: number;
    bytes: number;
  };
  error: {
    rate: number;
    count: number;
  };
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    percentage: number;
  };
}
