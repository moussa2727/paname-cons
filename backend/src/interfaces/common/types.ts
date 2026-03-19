// =================================
// TYPES CENTRALISÉS POUR LES SERVICES
// =================================
// Ce fichier contient tous les types utilisés par les différents services
// organisés par domaine pour une meilleure maintenabilité

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

// =================================
// TYPES CACHE (Gestion du cache)
// =================================
export interface CacheConfig {
  url: string;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

export interface CacheStats {
  connected: boolean;
  memory: string;
  keys: number;
}

// =================================
// TYPES EMAIL (Services de messagerie)
// =================================
export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailJobResult {
  success: boolean;
  jobId?: string;
  to?: string | string[];
  subject?: string;
  error?: string;
}

export interface BulkEmailJobData {
  emails: EmailJobData[];
}

// =================================
// TYPES RENDEZVOUS (Gestion des rendez-vous)
// =================================
export interface RendezvousJobData {
  data: {
    rendezvousId: string;
    email: string;
    firstName: string;
    lastName: string;
    telephone?: string;
    destination?: string;
    date: string;
    time: string;
    filiere?: string;
  };
}

export interface RendezvousQueryDto {
  status?: string;
  date?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  hasAvis?: boolean;
  hasProcedure?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedRendezvousResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =================================
// TYPES PROCEDURES (Gestion des procédures)
// =================================
export interface ProcedureJobData {
  data: {
    procedureId: string;
    userId: string;
    action: string;
    details?: Record<string, unknown>;
  };
}

// =================================
// TYPES TOKENS (Gestion des tokens d'authentification)
// =================================
export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  isRememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionData {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokedTokenData {
  userId: string;
  token: string;
  revokedAt: Date;
  revocationReason: string;
  ipAddress?: string;
  userAgent?: string;
}

// =================================
// TYPES USERS (Gestion des utilisateurs)
// =================================
export interface UserCacheData {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  tokenType: string | null;
}

// =================================
// TYPES CONTACTS (Gestion des contacts)
// =================================
export interface ContactJobData {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    receivedAt: string;
  };
}

export interface ContactNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  id: string;
  receivedAt: string;
}

export interface ContactReplyData {
  firstName: string;
  lastName: string;
  message: string;
  adminResponse: string;
  id: string;
  respondedAt: string;
}

// =================================
// TYPES DESTINATIONS (Gestion des destinations)
// =================================
export interface DestinationData {
  id: string;
  name: string;
  description: string;
  country: string;
  city: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =================================
// TYPES QUEUE (Gestion des files d'attente)
// =================================
export interface QueueJobData {
  name: string;
  data: any;
  opts?: {
    attempts?: number;
    delay?: number;
    priority?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// =================================
// TYPES LOGGING (Gestion des logs)
// =================================
export interface LogMetadata {
  service: string;
  timestamp?: string;
}

// =================================
// TYPES FILTERS (Gestion des erreurs)
// =================================
export interface HttpErrorMetadata {
  message: string;
  status: number;
  path: string;
  method: string;
  stack?: string;
}

export interface PrismaErrorMetadata {
  message: string;
  stack?: string;
  path: string;
  method: string;
  errorCode?: string;
  validationError?: string;
}

export interface JsonErrorMetadata {
  message: string;
  name: string;
  stack?: string;
}

// =================================
// TYPES INTERCEPTORS (Gestion des interceptors)
// =================================
export interface InterceptorTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface InterceptorError {
  message: string;
  stack?: string;
  response?: any;
}

// =================================
// TYPES DECORATORS (Décorateurs personnalisés)
// =================================
export interface DecoratorMetadata {
  roles?: string[];
  permissions?: string[];
  public?: boolean;
}

// =================================
// TYPES GUARDS (Gardes d'accès)
// =================================
export interface GuardMetadata {
  roles?: string[];
  permissions?: string[];
  public?: boolean;
}

// =================================
// TYPES UTILS (Utilitaires communs)
// =================================
export interface SanitizedHeaders {
  [key: string]: string;
}

export interface SanitizedBody {
  [key: string]: unknown;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
}

// =================================
// TYPES CONSTANTS (Constantes système)
// =================================
export interface AuthConstants {
  MAX_ACTIVE_SESSIONS_PER_USER: number;
  REVOCATION_REASONS: Record<string, string>;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
}

export interface CloudinaryConstants {
  DEFAULT_FOLDER: string;
  MAX_FILE_SIZE: string;
  ALLOWED_FORMATS: string[];
  TRANSFORMATIONS: Record<string, any>;
}

export interface CacheConstants {
  DEFAULT_TTL: number;
  USER_TTL: number;
  SESSION_TTL: number;
  PROCEDURE_TTL: number;
  RENDEZVOUS_TTL: number;
  STATS_TTL: number;
}

// =================================
// TYPES MIDDLEWARES (Middlewares personnalisés)
// =================================
export interface MiddlewareTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RequestWithTiming extends Request {
  startTime?: number;
}

// =================================
// TYPES EXCEPTIONS (Exceptions personnalisées)
// =================================
export interface CustomExceptionMetadata {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
}

// =================================
// TYPES VALIDATION (Validation des données)
// =================================
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraints?: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =================================
// TYPES TRANSFORMATION (Transformation de données)
// =================================
export interface TransformOptions {
  exclude?: string[];
  expose?: string[];
  transform?: (value: any) => any;
}

export interface SerializationOptions {
  strategy?: 'exclude' | 'exposeAll';
  exclude?: string[];
  expose?: string[];
}

// =================================
// TYPES CONFIGURATION (Configuration système)
// =================================
export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: PrismaConfig;
  cloudinary: CloudinaryConfig;
  cache: CacheConfig;
  auth: AuthConstants;
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: string;
  };
}

// =================================
// TYPES ENVIRONMENT (Variables d'environnement)
// =================================
export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: string;
  FRONTEND_URL: string;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
}

// =================================
// TYPES STATISTIQUES (Statistiques système)
// =================================
export interface SystemStats {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  cache: CacheStats;
  database: {
    connections: number;
    queries: number;
    errors: number;
  };
}

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

// =================================
// TYPES BACKUP (Sauvegarde système)
// =================================
export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: string;
  compression: boolean;
  encryption: boolean;
  destination: string;
}

export interface BackupResult {
  success: boolean;
  timestamp: string;
  filename: string;
  size: number;
  duration: number;
  error?: string;
}

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

// =================================
// TYPES TESTING (Tests unitaires)
// =================================
export interface TestData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestConfig {
  database: {
    url: string;
    synchronize: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  logging: {
    level: string;
    console: boolean;
    file: boolean;
  };
}

// =================================
// TYPES DEVELOPMENT (Développement)
// =================================
export interface DevConfig {
  hotReload: boolean;
  debug: boolean;
  profiling: boolean;
  tracing: boolean;
  mockData: boolean;
  apiDocs: boolean;
  playground: boolean;
}

// =================================
// TYPES PRODUCTION (Production)
// =================================
export interface ProdConfig {
  hotReload: false;
  debug: false;
  profiling: false;
  tracing: false;
  mockData: false;
  apiDocs: false;
  playground: false;
  security: {
    enabled: true;
    rateLimiting: true;
    cors: true;
    helmet: true;
  };
}

// =================================
// EXPORTATIONS
// =================================
// Les types sont exportés individuellement depuis leurs fichiers respectifs
// Utilisez l'index.ts pour importer tous les types d'un coup
