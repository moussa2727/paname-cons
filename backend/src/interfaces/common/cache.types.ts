// =================================
// TYPES CACHE (Gestion du cache)
// =================================

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

export interface CacheStats {
  connected: boolean;
  memory: string;
  keys: number;
}

export interface CacheConstants {
  DEFAULT_TTL: number;
  USER_TTL: number;
  SESSION_TTL: number;
  PROCEDURE_TTL: number;
  RENDEZVOUS_TTL: number;
  STATS_TTL: number;
}
