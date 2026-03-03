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
const allowedOrigins = [
  "https://panameconsulting.com",
  "https://www.panameconsulting.com",
  "https://panameconsulting.vercel.app",
  "https://paname-consulting.vercel.app",
  "https://vercel.live",
  "http://localhost:5173",
  "http://localhost:10000",
];

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

// Variable globale pour conserver l'instance entre les appels serverless
let app: any;

async function bootstrap() {
  if (!app) {
    const server = express();

    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      {
        logger: isProduction ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
      }
    );

    server.set('trust proxy', isProduction ? 1 : false);

    // CORS
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

    // Middlewares
    server.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 1000 }));
    server.use(express.json({ limit: '10mb' }));
    server.use(compression());
    server.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret-change-me'));

    // Cookies sécurisés
    server.use((_req: any, res: any, next: any) => {
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' as const : 'lax' as const,
        maxAge: 30 * 60 * 1000,
        path: '/',
      };

      const originalCookie = res.cookie.bind(res);
      res.cookie = (name: string, value: string, options: any = {}) => {
        return originalCookie(name, value, { ...cookieOptions, ...options });
      };

      next();
    });

    // Fichiers statiques (attention: Vercel a des limitations)
    const uploadsPath = path.join('/tmp', 'uploads'); // /tmp est writable sur Vercel
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

    // Configuration globale
    app.setGlobalPrefix('api', {
      exclude: ['/', '/api', '/uploads'],
    });

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

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
    logger.log('Application initialisée avec succès');
  }

  return app;
}

// Handler serverless pour Vercel
export default async function handler(req: any, res: any) {
  try {
    const appInstance = await bootstrap();
    const server = appInstance.getHttpServer();
    server.emit('request', req, res);
  } catch (error) {
    logger.error('Serverless handler failed:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  }
}