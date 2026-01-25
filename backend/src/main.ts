/*
 * Paname Consulting API - Main Entry Point
 * Version optimisée pour Vercel Serverless et développement local
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as compression from 'compression';

// Configuration pour détecter Vercel (méthode recommandée)
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

// Variables pour le cache (uniquement pour Vercel)
let cachedApp: express.Application | null = null;
let cachedNestApp: NestExpressApplication | null = null;
let isInitializing = false;

async function bootstrapServer() {
  try {
    // Créer l'application Express
    const expressApp = express();

    // ========== MIDDLEWARE GLOBAL ==========

    // 1. CORS MIDDLEWARE - DOIT ÊTRE EN PREMIER
    expressApp.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const origin = req.headers.origin;

        if (origin && allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (!origin && !isProduction) {
          // Permettre les requêtes sans origin en dev
          res.setHeader('Access-Control-Allow-Origin', '*');
        }

        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin, X-API-Key'
        );
        res.setHeader(
          'Access-Control-Expose-Headers',
          'Set-Cookie, Authorization, X-API-Version'
        );
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') {
          return res.status(204).end();
        }

        next();
      }
    );

    // 2. Body parsers avec validation JSON
    expressApp.use(
      express.json({
        limit: '10mb',
        verify: (
          req: any,
          res: express.Response,
          buf: Buffer,
          encoding: BufferEncoding
        ) => {
          if (buf && buf.length) {
            try {
              JSON.parse(buf.toString(encoding || 'utf8'));
            } catch (e) {
              if (!isVercel) {
                logger.warn('Invalid JSON payload received');
              }
              // Marquer la requête comme ayant un JSON invalide
              req.invalidJson = true;
            }
          }
        },
      })
    );

    expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 3. Cookie parser (vérifier que COOKIE_SECRET existe en prod)
    if (!process.env.COOKIE_SECRET && isProduction) {
      logger.error(
        'COOKIE_SECRET environment variable is required in production'
      );
      if (!isVercel) process.exit(1);
    }
    expressApp.use(cookieParser(process.env.COOKIE_SECRET));

    // 4. Compression (éviter la double compression sur Vercel)
    if (!isVercel) {
      expressApp.use(compression());
    }

    // 5. Rate limiting (configuration différente pour Vercel)
    const limiter = rateLimit({
      windowMs: isVercel ? 60 * 1000 : 15 * 60 * 1000, // 1 min sur Vercel, 15 min en local
      max: isVercel ? 100 : 1000, // Limite plus basse sur Vercel
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      message: {
        status: 429,
        message: 'Too many requests, please try again later.',
        timestamp: new Date().toISOString(),
      },
    });

    expressApp.use(limiter);

    // ========== CRÉATION NESTJS ==========
    const nestApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: isVercel
          ? ['error', 'warn'] // Sur Vercel, seulement erreurs et warnings
          : ['log', 'error', 'warn', 'debug', 'verbose'], // Complet en local
        abortOnError: false,
      }
    );

    // ========== CONFIGURATION NESTJS ==========

    // CORS configuration (en complément du middleware)
    nestApp.enableCors({
      origin: (origin, callback) => {
        // En développement local, permettre toutes les origines
        if (!isProduction) {
          return callback(null, true);
        }

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          if (!isVercel) {
            logger.warn(`CORS blocked for origin: ${origin}`);
          }
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      exposedHeaders: ['Set-Cookie', 'Authorization', 'X-API-Version'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cookie',
        'Set-Cookie',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-API-Key',
      ],
      maxAge: 86400,
    });

    // Sécurité Helmet
    nestApp.use(
      helmet({
        contentSecurityPolicy: isProduction,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );

    // Headers de sécurité supplémentaires
    nestApp.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        res.removeHeader('X-Powered-By');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        if (isVercel) {
          res.setHeader(
            'Vercel-CDN-Cache-Control',
            'public, max-age=0, must-revalidate'
          );
        }

        next();
      }
    );

    // Validation globale
    nestApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: errors => {
          const messages = errors.map(error => {
            const constraints = error.constraints
              ? Object.values(error.constraints)
              : ['Validation failed'];
            return `${error.property}: ${constraints.join(', ')}`;
          });
          return new BadRequestException({
            statusCode: 400,
            message: 'Validation failed',
            errors: messages,
            timestamp: new Date().toISOString(),
          });
        },
      })
    );

    // Préfixe global de l'API
    nestApp.setGlobalPrefix('api', {
      exclude: isVercel ? [] : ['/'], // Endpoint health en root sur Vercel
    });

    // Initialisation
    await nestApp.init();

    return { expressApp, nestApp };
  } catch (error) {
    logger.error('Failed to bootstrap server', error);
    throw error;
  }
}

// ========== POINT D'ENTRÉE VERCEL ==========
if (isVercel) {
  const handler = async (req: express.Request, res: express.Response) => {
    try {
      // Utiliser l'app en cache ou en créer une nouvelle
      if (!cachedApp || !cachedNestApp) {
        if (isInitializing) {
          // Attendre si une initialisation est en cours
          await new Promise(resolve => setTimeout(resolve, 100));
          return handler(req, res);
        }

        isInitializing = true;
        try {
          const { expressApp, nestApp } = await bootstrapServer();
          cachedApp = expressApp;
          cachedNestApp = nestApp;
          logger.log('Server initialized for Vercel');
        } catch (error) {
          logger.error('Initialization failed', error);
          return res.status(500).json({
            error: 'Initialization failed',
            message: 'Server is temporarily unavailable',
          });
        } finally {
          isInitializing = false;
        }
      }

      // Exécuter la requête
      return cachedApp!(req, res);
    } catch (error) {
      logger.error('Request handling failed', error);

      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          ...(isProduction ? {} : { detail: error.message }),
        });
      }
    }
  };

  // Exporter le handler pour Vercel
  module.exports = handler;
  module.exports.default = handler;
} else {
  // ========== DÉMARRAGE LOCAL ==========
  (async () => {
    try {
      logger.log(' Starting local server...');

      const { nestApp } = await bootstrapServer();

      const port = process.env.PORT || 10000;
      const host = process.env.HOST || '0.0.0.0';

      await nestApp.listen(port, host);

      logger.log(` Server running on http://${host}:${port}`);
      logger.log(` API available at http://${host}:${port}/api`);
      logger.log(` Environment: ${process.env.NODE_ENV || 'development'}`);

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.log(` Received ${signal}, shutting down gracefully...`);
        await nestApp.close();
        logger.log(' Server closed');
        process.exit(0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Error handlers
      process.on('uncaughtException', error => {
        logger.error('Uncaught Exception:', error);
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });
    } catch (error) {
      logger.error('Failed to start local server', error);
      process.exit(1);
    }
  })();
}
