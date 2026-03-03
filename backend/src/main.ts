import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
const express = require('express');

const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const logger = new Logger('Bootstrap');
const isProduction = process.env.NODE_ENV === 'production';

// Configuration CORS et CSP
const productionOrigins = [
  "https://panameconsulting.com",
  "https://www.panameconsulting.com",
  "https://panameconsulting.vercel.app",
  "https://paname-consulting.vercel.app",
  "https://vercel.live",
  "http://localhost:5173",
  "http://localhost:10000",
];

const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? productionOrigins 
  : [...productionOrigins];

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: process.env.NODE_ENV === 'production' 
    ? ["'self'"] 
    : ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", ...allowedOrigins],
  fontSrc: ["'self'", "https:"],
  frameSrc: ["'self'", "https://vercel.live"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

// Création de l'application Express pour Vercel
let cachedApp: any;

async function createApp() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    }
  );

  server.set('trust proxy', isProduction ? 1 : false);

  // ✅ CORS avec credentials - CECI DÉFINIT DÉJÀ Access-Control-Allow-Origin
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  // service des fichiers statiques depuis le dossier uploads dans mon backend
  const uploadsPath = path.join(process.env.UPLOAD_DIR || '/uploads', 'uploads');
  server.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res: any) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
  }));

  // Préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/', '/api', '/uploads'],
  });
 
  // ✅ MIDDLEWARE: Body parsers
  server.use(express.urlencoded({
    limit: '10mb',
    extended: true,
    parameterLimit: 1000
  }));
  
  server.use(express.json({
    limit: '10mb'
  }));

  // ✅ MIDDLEWARE: Compression
  server.use(compression());

  // ✅ MIDDLEWARE: Cookie Parser
  server.use(cookieParser(process.env.COOKIE_SECRET));

  // ✅ MIDDLEWARE: Configuration des cookies de session (30 minutes)
  server.use((req: any, res: any, next: any) => {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 60 * 1000, // 30 minutes
      path: '/',
    };

    // Sauvegarder la méthode cookie originale
    const originalCookie = res.cookie;
    
    // Remplacer la méthode cookie
    res.cookie = function(name: string, value: string, options: any = {}) {
      return originalCookie.call(this, name, value, { ...cookieOptions, ...options });
    };

    next();
  });

  // ✅ MIDDLEWARE: Security headers avec Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: cspDirectives,
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      noSniff: true,
      xssFilter: true,
    }),
  );

  // ✅ MIDDLEWARE: Headers de sécurité additionnels - SUPPRIMÉ pour éviter les conflits CORS
  // Le middleware suivant a été supprimé car il cause des conflits avec CORS
  // Helmet et enableCors gèrent déjà tous ces headers

  // ✅ VALIDATION GLOBALE
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error: any) => {
          const constraints = error.constraints ? Object.values(error.constraints) : [];
          return `${error.property}: ${constraints.join(', ')}`;
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
          timestamp: new Date().toISOString()
        });
      }
    }),
  );

  // Versionnement
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.init();
  return server;
}

// Handler pour Vercel
export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
}

// Pour le développement local
if (process.env.NODE_ENV !== 'production') {
  async function bootstrap() {
    const server = await createApp();
    const port = parseInt(process.env.PORT || '10000', 10);
    const host = process.env.HOST || "0.0.0.0";

    server.listen(port, host, () => {
      const logger = new Logger('Bootstrap');
      logger.log(`Server started successfully on PORT=${port}`); 
      logger.log(`🚀 Application is running on: ${host}:${port}`);
      logger.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.log(`🍪 Session timeout: 30 minutes`);
      logger.log(`🔐 CORS with credentials enabled`);
    });
  }

  bootstrap().catch((error) => {
    console.error('Failed to bootstrap application:', error);
    process.exit(1);
  });
}