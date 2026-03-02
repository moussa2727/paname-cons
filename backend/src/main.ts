/*
 * Paname Consulting API - Main Entry Point
 * Version corrigée pour Vercel Serverless et développement local
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as path from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ========== CONFIGURATION ==========
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
let cachedApp: express.Application | null = null;
let cachedNestApp: NestExpressApplication | null = null;
let isInitializing = false;

// ========== MIDDLEWARES ==========

// Middleware de logging pour déboguer
const loggingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
};

// Middleware CORS
const corsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
};

// Middleware pour gérer les routes racine
const rootRouteMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log explicite pour voir toutes les requêtes
  logger.log(`🎯 Route appelée: ${req.method} ${req.url}`);
  
  if (req.url === '/') {
    logger.log('📍 Route racine appelée');
    return res.json({
      message: 'Paname Consulting API is running',
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        api: '/api',
        docs: '/api/docs',
        destinations: '/api/destinations',
        auth: '/api/auth',
        users: '/api/users',
        contact: '/api/contact',
        procedures: '/api/procedures',
        rendezvous: '/api/rendezvous',
        uploads: '/api/uploads',
      },
    });
  }
  
  if (req.url === '/api') {
    logger.log('📍 Route /api appelée');
    return res.json({
      name: 'Paname Consulting API',
      version: '1.0.0',
      status: 'OK',
      endpoints: {
        destinations: '/api/destinations',
        auth: '/api/auth',
        users: '/api/users',
        contact: '/api/contact',
        procedures: '/api/procedures',
        rendezvous: '/api/rendezvous',
        documentation: '/api/docs',
        uploads: '/api/uploads',
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  // Ne pas bloquer les autres routes, les laisser passer à NestJS
  next();
};

// Middleware pour servir les fichiers statiques avant NestJS
const staticFilesMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.url.startsWith('/api/uploads/')) {
    const filename = req.url.replace('/api/uploads/', '');
    const filePath = path.join(process.cwd(), 'uploads', filename);
    logger.log(`📁 Service fichier statique: ${filename}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`❌ Erreur envoi fichier: ${filename}`, err);
        next();
      }
    });
  } else {
    next();
  }
};

// Middleware headers sécurité
const securityHeadersMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (isVercel) {
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=0, must-revalidate');
  }

  next();
};

// ========== CONFIGURATIONS ==========

// Configuration Rate Limit
const getRateLimitConfig = () => {
  if (!isProduction) {
    return null;
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: {
      message: 'Trop de requêtes. Veuillez réessayer plus tard.',
      statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isVercel ? (req: express.Request) => req.headers['x-vercel-forwarded-for'] !== undefined : undefined,
  });
};

// Configuration Helmet
const getHelmetConfig = () => ({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" as const },
});

// Validation Pipe personnalisé
const createValidationPipe = () => new ValidationPipe({
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
      message: 'Validation échouée',
      errors: messages,
      timestamp: new Date().toISOString(),
    });
  },
});

// Configuration Swagger
const setupSwagger = (app: NestExpressApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Paname Consulting API')
    .setDescription('API de gestion des destinations')
    .setVersion('1.0')
    .addTag('destinations')
    .addTag('upload')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  logger.log('📚 Swagger documentation: /api/docs');
};

// ========== FONCTION PRINCIPALE ==========
async function bootstrapServer() {
  try {
    // Création de l'application Express
    const expressApp = express();
    
    // Configuration trust proxy
    expressApp.set('trust proxy', isProduction ? 1 : false);

    // ========== MIDDLEWARES GLOBAUX ==========
    
    // 0. Logging - en premier pour voir toutes les requêtes
    expressApp.use(loggingMiddleware);

    // 1. Routes racine - avant tout autre middleware
    expressApp.use(rootRouteMiddleware);

    // 2. Fichiers statiques - avant CORS et body parsers
    expressApp.use(staticFilesMiddleware);

    // 3. CORS
    expressApp.use(corsMiddleware);

    // 4. Body parsers
    expressApp.use(express.json({ limit: '10mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 5. Cookie parser
    if (!process.env.COOKIE_SECRET && isProduction) {
      logger.error('❌ COOKIE_SECRET manquant en production');
    }
    expressApp.use(cookieParser(process.env.COOKIE_SECRET));

    // 6. Compression (pas sur Vercel)
    if (!isVercel) {
      expressApp.use(compression());
    }

    // 7. Rate limiting
    const rateLimitMiddleware = getRateLimitConfig();
    if (rateLimitMiddleware) {
      expressApp.use(rateLimitMiddleware);
    }

    // ========== CRÉATION NESTJS ==========
    const nestApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: isVercel ? ['error', 'warn', 'log'] : ['log', 'error', 'warn', 'debug', 'verbose'],
        abortOnError: false,
        cors: false,
        bodyParser: false, // Désactivé car géré par express
      }
    );

    // ========== CONFIGURATION NESTJS ==========

    // 1. Validation globale
    nestApp.useGlobalPipes(createValidationPipe());

    // 2. Préfixe global API
    nestApp.setGlobalPrefix('api', {
      exclude: ['/', '/health', '/api'], // Routes exclues du préfixe
    });

    // 3. Versioning API
    nestApp.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // 4. WebSocket adapter
    nestApp.useWebSocketAdapter(new IoAdapter(nestApp));

    // 5. Sécurité Helmet
    nestApp.use(helmet(getHelmetConfig()));

    // 6. Headers de sécurité supplémentaires
    nestApp.use(securityHeadersMiddleware);

    // 7. Swagger documentation
    if (!isProduction || !isVercel) {
      setupSwagger(nestApp);
    }

    await nestApp.init();
    
    logger.log('✅ Serveur initialisé avec succès');
    
    logger.log('📋 Routes principales:');
    
    return { expressApp, nestApp };


  } catch (error) {
    logger.error('❌ Échec du bootstrap:', error);
    throw error;
  }
}

// ========== GESTIONNAIRE VERCEL ==========
if (isVercel) {
  const handler = async (req: express.Request, res: express.Response) => {
    try {
      // Log explicite pour Vercel
      logger.log(`🌐 Vercel: ${req.method} ${req.url}`);
      
      if (!cachedApp || !cachedNestApp) {
        if (isInitializing) {
          logger.log('⏳ Initialisation en cours, attente...');
          await new Promise(resolve => setTimeout(resolve, 100));
          return handler(req, res);
        }

        isInitializing = true;
        logger.log('🔄 Initialisation du cache Vercel...');
        
        logger.log('🔄 Initialisation du cache Vercel...');
        
        try {
          const { expressApp, nestApp } = await bootstrapServer();
          cachedApp = expressApp;
          cachedNestApp = nestApp;
          
          logger.log('✅ Cache Vercel initialisé');
        } catch (error) {
          logger.error('❌ Échec initialisation Vercel:', error);
          return res.status(500).json({
            error: 'Initialization failed',
            message: 'Serveur temporairement indisponible',
          });
        } finally {
          isInitializing = false;
        }
      }

      // Traiter la requête
      return cachedApp!(req, res);
    } catch (error) {
      logger.error('❌ Erreur traitement requête:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Erreur inattendue',
          timestamp: new Date().toISOString(),
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
      logger.log('🚀 Démarrage serveur local...');

      const { nestApp } = await bootstrapServer();

      const port = process.env.PORT || 10000;

      await nestApp.listen(port);

      logger.log(`✅ Serveur démarré sur http://localhost:${port}`);
      logger.log(`📍 Route racine: http://localhost:${port}/`);
      logger.log(`📍 Route API: http://localhost:${port}/api`);
      logger.log(`📍 Destinations: http://localhost:${port}/api/destinations`);
      logger.log(`📁 Uploads: http://localhost:${port}/api/uploads`);
      logger.log(`📚 Docs: http://localhost:${port}/api/docs`);
      logger.log(`🌍 WebSocket: ws://localhost:${port}/api/destinations`);
      logger.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);

      // Gestion arrêt gracieux
      const gracefulShutdown = async (signal: string) => {
        logger.log(`📴 Signal ${signal} reçu, arrêt gracieux...`);
        await nestApp.close();
        logger.log('👋 Serveur arrêté');
        process.exit(0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      process.on('uncaughtException', error => {
        logger.error('💥 Exception non catchée:', error);
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('💥 Rejet non géré:', reason);
      });


    } catch (error) {
      logger.error('❌ Échec démarrage serveur local:', error);
      process.exit(1);
    }
  })();
}