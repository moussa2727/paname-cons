// =================================
// TYPES PRISMA (Base de données)
// =================================

export interface PrismaConfig {
  connectionString?: string;
  log?: ('warn' | 'error')[];
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  secure: boolean;
}

export interface PrismaConnectionMetrics {
  connections: number;
  queries: number;
  errors: number;
  avgQueryTime: number;
}

export interface PrismaHealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  message?: string;
  responseTime?: number;
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
}
