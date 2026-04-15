import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { createRedisInstance } from '../config/redis.config';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 1800; // 1 heure
  private redis: Redis;

  constructor() {
    this.logger.log('Configuration Redis initialisée');

    // Utilisation de la configuration centralisée
    this.redis = createRedisInstance();
  }

  // =================================
  // CYCLE DE VIE DU MODULE
  // =================================

  /**
   * Appelé lorsque le module est initialisé
   * Établit la connexion Redis
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.log('Connexion Redis établie avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la connexion Redis:', error);
    }
  }

  /**
   * Appelé lorsque le module est détruit
   * Ferme proprement la connexion Redis
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // Check if Redis is connected in any state (ready, connect, reconnecting)
      if (this.redis.status !== 'end') {
        await this.redis.quit();
        this.logger.log('Connexion Redis fermée avec succès');
      } else {
        this.logger.log('Redis déjà déconnecté');
      }
    } catch (error: unknown) {
      // Ignore "Connection is closed" errors during shutdown
      if (
        error instanceof Error &&
        error.message.includes('Connection is closed')
      ) {
        this.logger.log('Redis déjà fermé');
      } else {
        this.logger.error('Erreur lors de la fermeture Redis:', error);
      }
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl || this.defaultTTL, serializedValue);
    } catch {
      this.logger.error('Erreur cache SET');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      this.logger.error('Erreur cache GET');
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      this.logger.error('Erreur cache DEL');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch {
      this.logger.error('Erreur cache EXISTS');
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log('Invalidation de clés cache');
      }
    } catch {
      this.logger.error('Erreur invalidation cache');
    }
  }

  // Méthodes spécialisées pour les entités fréquemment accédées
  async cacheUser(userId: string, user: any, ttl = 3600): Promise<void> {
    await this.set(`user:${userId}`, user, ttl);
  }

  async getUser(userId: string): Promise<any> {
    return this.get(`user:${userId}`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

  async cacheUserByEmail(email: string, user: any, ttl = 3600): Promise<void> {
    await this.set(`user:email:${email.toLowerCase()}`, user, ttl);
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.get(`user:email:${email.toLowerCase()}`);
  }

  async invalidateUserByEmail(email: string): Promise<void> {
    await this.del(`user:email:${email.toLowerCase()}`);
  }

  async cacheRendezvous(
    id: string,
    rendezvous: any,
    ttl = 1800,
  ): Promise<void> {
    await this.set(`rendezvous:${id}`, rendezvous, ttl);
  }

  async getRendezvous(id: string): Promise<any> {
    return this.get(`rendezvous:${id}`);
  }

  async invalidateRendezvous(id: string): Promise<void> {
    await this.del(`rendezvous:${id}`);
  }

  async cacheProcedure(id: string, procedure: any, ttl = 1800): Promise<void> {
    await this.set(`procedure:${id}`, procedure, ttl);
  }

  async getProcedure(id: string): Promise<any> {
    return this.get(`procedure:${id}`);
  }

  async invalidateProcedure(id: string): Promise<void> {
    await this.del(`procedure:${id}`);
  }

  async cacheUserProcedures(
    userId: string,
    procedures: any[],
    ttl = 1800,
  ): Promise<void> {
    await this.set(`user:${userId}:procedures`, procedures, ttl);
  }

  async getUserProcedures(userId: string): Promise<any[]> {
    const procedures = await this.get(`user:${userId}:procedures`);
    return (procedures as any[]) || [];
  }

  async invalidateUserProcedures(userId: string): Promise<void> {
    await this.del(`user:${userId}:procedures`);
  }

  async cacheUserRendezvous(
    userId: string,
    rendezvous: any[],
    ttl = 1800,
  ): Promise<void> {
    await this.set(`user:${userId}:rendezvous`, rendezvous, ttl);
  }

  async getUserRendezvous(userId: string): Promise<any[]> {
    const rendezvous = await this.get(`user:${userId}:rendezvous`);
    return (rendezvous as any[]) || [];
  }

  async invalidateUserRendezvous(userId: string): Promise<void> {
    await this.del(`user:${userId}:rendezvous`);
  }

  async cacheSession(token: string, session: any, ttl = 7200): Promise<void> {
    await this.set(`session:${token}`, session, ttl);
  }

  async getSession(token: string): Promise<any> {
    return this.get(`session:${token}`);
  }

  async invalidateSession(token: string): Promise<void> {
    await this.del(`session:${token}`);
  }

  async cacheStats(key: string, stats: any, ttl = 300): Promise<void> {
    await this.set(`stats:${key}`, stats, ttl);
  }

  async getStats(key: string): Promise<any> {
    return this.get(`stats:${key}`);
  }

  async invalidateStats(key: string): Promise<void> {
    await this.del(`stats:${key}`);
  }

  async getHealthStatus(): Promise<{
    connected: boolean;
    memory: string;
    keys: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();

      return {
        connected: this.redis.status === 'ready',
        memory:
          info
            .split('\r\n')
            .find((line) => line.startsWith('used_memory_human:'))
            ?.split(':')[1] || 'unknown',
        keys: dbsize,
      };
    } catch {
      return {
        connected: false,
        memory: 'unknown',
        keys: 0,
      };
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
