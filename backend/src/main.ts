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

// Configuration CORS
const productionOrigins = [
  "https://panameconsulting.com",
  "https://www.panameconsulting.com",
  "https://panameconsulting.vercel.app",
  "https://paname-consulting.vercel.app",
  "https://vercel.live",
  "http://localhost:5173",
  "http://localhost:10000",
];

const allowedOrigins = [...productionOrigins];

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
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

async function bootstrap() {
  const server = express();

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: isProduction
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    }
  );

  server.set('trust proxy', isProduction ? 1 : false);

  // CORS avec validation dynamique
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} non autorisee`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Body parsers
  server.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 1000 }));
  server.use(express.json({ limit: '10mb' }));

  // Compression
  server.use(compression());

  // Cookie Parser avec fallback
  server.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret-change-me'));

  // Middleware cookies sécurisés
  server.use((_req: any, res: any, next: any) => {
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      maxAge: 30 * 60 * 1000,
      path: '/',
    };

    const originalCookie = res.cookie.bind(res);
    res.cookie = (name: string, value: string, options: any = {}) => {
      return originalCookie(name, value, { ...cookieOptions, ...options });
    };

    next();
  });

  // Serveur de fichiers statiques pour les uploads
  const uploadsPath = path.join(process.cwd(), 'uploads');
  server.use('/uploads', express.static(uploadsPath));

  // Security headers
  server.use(
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

  // Préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/', '/api', '/uploads'],
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      exceptionFactory: (errors) => {
        const messages = errors.map((error: any) => {
          const constraints = error.constraints ? Object.values(error.constraints) : [];
          return `${error.property}: ${constraints.join(', ')}`;
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
          timestamp: new Date().toISOString(),
        });
      },
    }),
  );

  // Versionnement
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.init();

  const port = parseInt(process.env.PORT || '10000', 10);

  server.listen(port, () => {
    logger.log(`Serveur demarre sur PORT=${port}`);
    logger.log(`Application: localhost:${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Session timeout: 30 minutes`);
    logger.log(`CORS avec credentials active`);
  });

  return { server, app };
}

// Démarrage du serveur persistant
bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});