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
