/*
 * Paname Consulting API - Main Entry Point
 * Version unifiée pour développement local et Vercel Serverless
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as compression from 'compression';

// Configuration pour détecter Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION || false;

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

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('Démarrage de l\'application Paname Consulting...');
  
  // Créer l'application Express
  const expressApp = express();
  
  // ========== MIDDLEWARE GLOBAL (pour toutes les requêtes) ==========
  
  // 1. CORS MIDDLEWARE - DOIT ÊTRE EN PREMIER
  expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    
    // Vérifier si l'origine est autorisée
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Toujours définir ces headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Gérer les préflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(204).end(); // No Content
      return;
    }
    
    next();
  });
  
  // 2. Body parsers
  expressApp.use(express.json({ 
    limit: '10mb',
    verify: (req: any, res: any, buf: Buffer, encoding: BufferEncoding) => {
      try {
        if (buf && buf.length) {
          JSON.parse(buf.toString(encoding || 'utf8'));
        }
      } catch {
        req.invalidJson = true;
      }
    }
  }));
  
  expressApp.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000,
  }));
  
  // 3. Cookie parser
  expressApp.use(cookieParser(process.env.COOKIE_SECRET || 'paname-consulting-secret-key-2024'));
  
  // 4. Compression (uniquement en local)
  if (!isVercel) {
    expressApp.use(compression());
  }
  
  // 5. Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
      status: 429,
      message: 'Trop de requêtes depuis cette IP',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  expressApp.use(limiter);
  
  // ========== CRÉATION DE L'APPLICATION NESTJS ==========
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: isVercel ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug'],
    }
  );
  
  // ========== CONFIGURATION NESTJS ==========
  
  // CORS dans NestJS (complémentaire)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // En développement, autoriser localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
  });
  
  // Helmet security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }));
  
  // Headers de sécurité additionnels
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (isVercel) {
      res.header('Vercel-CDN-Cache-Control', 'public, max-age=0, must-revalidate');
    }
    
    next();
  });
  
  // Validation globale
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => {
        const constraints = error.constraints ? Object.values(error.constraints) : [];
        return `${error.property}: ${constraints.join(', ')}`;
      });
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
        timestamp: new Date().toISOString(),
      });
    },
  }));
  
  // Prefix global
  app.setGlobalPrefix('api');
  
  // ========== INITIALISATION ==========
  await app.init();
  
  // ========== ENDPOINTS DE SANTÉ ==========
  expressApp.get('/', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'online',
      service: 'paname-consulting-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cors: allowedOrigins,
    });
  });
  
  expressApp.get('/api', (req: express.Request, res: express.Response) => {
    res.json({
      service: 'paname-consulting-api',
      version: process.env.npm_package_version || '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        procedures: '/api/procedures',
        contact: '/api/contact',
        destinations: '/api/destinations',
        rendezvous: '/api/rendezvous',
      },
      timestamp: new Date().toISOString(),
    });
  });
  
  // ========== GESTION VERCEL vs LOCAL ==========
  if (isVercel) {
    // Pour Vercel: retourner l'application Express pour le handler
    logger.log('Application prête pour Vercel Serverless');
    return expressApp;
    
  } else {
    // Pour le développement local
    const port = process.env.PORT || 10000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen(port, host, () => {
      logger.log(`Serveur démarré sur http://${host}:${port}`);
      logger.log(`API: http://${host}:${port}/api`);
      logger.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.log('CORS activé pour:');
      allowedOrigins.forEach(origin => {
        logger.log(`   - ${origin}`);
      });
    });
  }
}

// ========== POINT D'ENTRÉE ==========
if (isVercel) {
  // Pour Vercel, on exporte le handler directement sans initialisation asynchrone
  // L'initialisation se fera lors du premier appel
  let appInstance: any = null;
  
  const getHandler = async () => {
    if (!appInstance) {
      try {
        appInstance = await bootstrap();
        return appInstance;
      } catch (error) {
        console.error('Erreur d\'initialisation Vercel:', error);
        throw error;
      }
    }
    return appInstance;
  };
  
  // Exporter le handler pour Vercel
  const handler = async (req: express.Request, res: express.Response) => {
    try {
      const expressApp = await getHandler();
      return expressApp(req, res);
    } catch (error) {
      console.error('Vercel handler error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };
  
  // Export pour Vercel
  module.exports = handler;
  
} else if (require.main === module) {
  // Démarrer localement
  bootstrap().catch((error) => {
    console.error('Erreur de démarrage local:', error);
    process.exit(1);
  });
}