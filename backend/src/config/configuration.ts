import { getRedisConfig } from './redis.config';

export default () => ({
  // Configuration de base
  port: process.env.PORT || 10000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Base de données
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Configuration Redis centralisée avec support dual-stack
  redis: getRedisConfig(),

  // Email (optionnel)
  email: {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  cookies: {
    secret: process.env.COOKIE_SECRET,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
  },

  // Bull Queue (optionnel)
  bull: {
    queuePrefix: 'panameconsulting',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
    enabled: process.env.BULL_ENABLED !== 'false',
  },
});
