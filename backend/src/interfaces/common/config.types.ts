// =================================
// TYPES CONFIGURATION (Configuration système)
// =================================

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: any;
  cloudinary: any;
  cache: any;
  auth: any;
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: string;
  };
}
