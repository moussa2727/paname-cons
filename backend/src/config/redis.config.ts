// =================================
// CONFIGURATION REDIS CENTRALISÉE
// =================================
// Support IPv4/IPv6 dual-stack avec fallback automatique
// Centralisation de toute la configuration Redis

import { Redis } from 'ioredis';

export interface RedisConfig {
  url: string;
  enabled: boolean;
  family?: 4 | 6; // IPv4 ou IPv6 (4 par défaut)
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
}

/**
 * Configuration Redis centralisée avec support dual-stack
 *
 * Priorités:
 * 1. REDIS_URL (complète avec IPv4/IPv6)
 * 2. Variables individuelles (compatibilité)
 * 3. Configuration par défaut
 */
export function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  // Si REDIS_URL est fournie, l'utiliser directement
  if (redisUrl) {
    return {
      url: redisUrl,
      enabled: process.env.REDIS_ENABLED !== 'false',
      family: detectIpFamily(redisUrl),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
    };
  }

  // Compatibilité avec variables individuelles
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379');
  const password = process.env.REDIS_PASSWORD;
  const db = parseInt(process.env.REDIS_DB || '0');

  // Construction URL avec support IPv6
  const isIPv6 = host.includes(':');
  const hostWithBrackets = isIPv6 ? `[${host}]` : host;
  const auth = password ? `:${password}@` : '';
  const url = `redis://${auth}${hostWithBrackets}:${port}/${db}`;

  return {
    url,
    enabled: process.env.REDIS_ENABLED !== 'false',
    family: isIPv6 ? 6 : 4,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };
}

/**
 * Détecte la famille IP (IPv4/IPv6) à partir de l'URL Redis
 */
function detectIpFamily(url: string): 4 | 6 {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // IPv6 : contient des deux-points et n'est pas un port
    if (hostname && hostname.includes(':') && !hostname.includes(']')) {
      return 6;
    }

    // IPv4 ou hostname par défaut
    return 4;
  } catch {
    return 4; // Default à IPv4 en cas d'erreur
  }
}

/**
 * Crée une instance Redis avec la configuration centralisée
 */
export function createRedisInstance(options?: Partial<RedisConfig>): Redis {
  const config = { ...getRedisConfig(), ...options };

  return new Redis(config.url, {
    family: config.family,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    lazyConnect: config.lazyConnect,
    enableOfflineQueue: config.enableOfflineQueue,
    connectTimeout: config.connectTimeout,
    commandTimeout: config.commandTimeout,
  });
}

/**
 * Configuration pour BullMQ (utilise l'URL Redis directement)
 */
export function getBullRedisConfig(): string {
  const config = getRedisConfig();

  if (!config.enabled) {
    throw new Error('Redis est désactivé. Impossible de configurer BullMQ.');
  }

  // BullMQ préfère l'URL directe
  return config.url;
}

/**
 * Validation de la configuration Redis
 */
export function validateRedisConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getRedisConfig();

  if (!config.url) {
    errors.push('REDIS_URL est requise');
  }

  try {
    new URL(config.url);
  } catch {
    errors.push('REDIS_URL format invalide');
  }

  if (config.enabled && !config.url) {
    errors.push('Redis activé mais REDIS_URL manquante');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Configuration par défaut pour l'environnement de développement
 */
export const DEV_REDIS_CONFIG: Partial<RedisConfig> = {
  url: 'redis://localhost:6379/0',
  enabled: true,
  family: 4,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Configuration par défaut pour l'environnement de production
 */
export const PROD_REDIS_CONFIG: Partial<RedisConfig> = {
  enabled: true,
  family: 4, // Forcer IPv4 en production par défaut
  maxRetriesPerRequest: 5,
  lazyConnect: true,
  connectTimeout: 15000,
  commandTimeout: 10000,
};

// Export des configurations par environnement
export const ENVIRONMENT_CONFIGS = {
  development: DEV_REDIS_CONFIG,
  production: PROD_REDIS_CONFIG,
  test: { ...DEV_REDIS_CONFIG, enabled: false },
};
