/*
 * Paname Consulting API - Main Entry Point
 * Version corrigée pour Vercel Serverless
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as path from 'path';

// Configuration
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const logger = new Logger('Bootstrap');

// Configuration CORS
const allowedOrigins = [
  'https://panameconsulting.vercel.app',
  'https://paname-consulting.vercel.app',
  'https://vercel.live',
  'http://localhost:5173',
  'http://localhost:10000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:10000',
];

// Cache pour Vercel
let cachedNestApp: NestExpressApplication | null = null;
let isInitializing = false;

/**
 * Fonction principale de bootstrap
 */
async function bootstrapServer(): Promise<NestExpressApplication> {
  try {
    // Créer l'application Express
    const expressApp = express();

    expressApp.set('trust proxy', isProduction ? 1 : false);

    // ========== MIDDLEWARE GLOBAL ==========

    // 1. CORS MIDDLEWARE
    expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (!origin && !isProduction) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin, X-API-Key'
      );
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization, X-API-Version');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }

      next();
    });

    // 2. Body parsers
    expressApp.use(express.json({ limit: '10mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 3. Cookie parser
    expressApp.use(cookieParser(process.env.COOKIE_SECRET));

    // 4. Compression
    if (!isVercel) {
      expressApp.use(compression());
    }

    // 5. Fichiers statiques
    const uploadsPath = path.join(process.cwd(), 'uploads');
    expressApp.use('/uploads', express.static(uploadsPath));
    expressApp.use('/api/uploads', express.static(uploadsPath));

    // 6. Rate limiting
    if (!isVercel) {
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: {
          message: 'Trop de requêtes. Veuillez réessayer plus tard.',
          statusCode: 429,
        },
        standardHeaders: true,
      });
      expressApp.use(limiter);
    }

    // ========== CRÉATION NESTJS ==========
    const nestApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: isVercel ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
        abortOnError: false,
      }
    );

    // ========== CONFIGURATION NESTJS ==========

    // CORS avec NestJS
    nestApp.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (process.env.NODE_ENV !== 'production') {
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
          }
        }
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS bloqué pour origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['Set-Cookie', 'Authorization'],
      maxAge: 86400,
    });

    // WebSocket adapter
    nestApp.useWebSocketAdapter(new IoAdapter(nestApp));

    // Helmet
    nestApp.use(
      helmet.default({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://paname-consulting.vercel.app", "https://panameconsulting.vercel.app"],
          },
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
      })
    );

    // Headers supplémentaires
    nestApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.removeHeader('X-Powered-By');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Validation globale
    nestApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: errors => {
          const messages = errors.map(error => {
            const constraints = error.constraints ? Object.values(error.constraints) : ['Validation failed'];
            return `${error.property}: ${constraints.join(', ')}`;
          });
          return new BadRequestException({
            statusCode: 400,
            message: 'Validation failed',
            errors: messages,
          });
        },
      })
    );

    // Préfixe global
    nestApp.setGlobalPrefix('api', {
      exclude: ['/', '/health'],
    });

    await nestApp.init();
    return nestApp;
  } catch (error) {
    logger.error('Failed to bootstrap server', error);
    throw error;
  }
}

// ========== HANDLER POUR VERCEL ==========
if (isVercel) {
  // Handler pour Vercel
  const handler = async (req: express.Request, res: express.Response) => {
    try {
      // Utiliser l'instance en cache ou en créer une nouvelle
      if (!cachedNestApp) {
        if (isInitializing) {
          // Attendre si une initialisation est en cours
          await new Promise(resolve => setTimeout(resolve, 100));
          return handler(req, res);
        }

        isInitializing = true;
        try {
          cachedNestApp = await bootstrapServer();
          logger.log('Server initialized for Vercel');
        } catch (error) {
          logger.error('Initialization failed', error);
          res.status(500).json({
            error: 'Initialization failed',
            message: 'Server is temporarily unavailable',
          });
          return;
        } finally {
          isInitializing = false;
        }
      }

      // Obtenir l'application Express sous-jacente
      const expressApp = cachedNestApp.getHttpAdapter().getInstance() as express.Application;
      
      // Exécuter la requête
      return expressApp(req, res);
    } catch (error) {
      logger.error('Request handling failed', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    }
  };

  // Exporter pour Vercel (format CommonJS)
  module.exports = handler;
} else {
  // ========== DÉMARRAGE LOCAL ==========
  (async () => {
    try {
      logger.log('Starting local server...');
      
      const nestApp = await bootstrapServer();
      
      const port = process.env.PORT || 10000;
      await nestApp.listen(port);
      
      logger.log(`Server running on http://localhost:${port}`);
      logger.log(`API available at http://localhost:${port}/api`);
      
      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.log(`Received ${signal}, shutting down...`);
        await nestApp.close();
        process.exit(0);
      };
      
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
      logger.error('Failed to start local server', error);
      process.exit(1);
    }
  })();
}