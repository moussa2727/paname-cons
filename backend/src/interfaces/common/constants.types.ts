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
