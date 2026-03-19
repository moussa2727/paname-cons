// =================================
// TYPES SECURITY (Sécurité système)
// =================================

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    credentials: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: string;
    crossOriginEmbedderPolicy: string;
  };
  encryption: {
    algorithm: string;
    keySize: number;
  };
}

export interface SecurityEvent {
  timestamp: string;
  type:
    | 'login'
    | 'logout'
    | 'failed_login'
    | 'access_denied'
    | 'suspicious_activity';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  resource: string;
  action: string;
  details?: Record<string, unknown>;
}
