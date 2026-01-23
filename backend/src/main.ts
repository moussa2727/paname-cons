/*
 * Paname Consulting API - Main Entry Point
 * Version unifiée pour développement local et Vercel
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './config/logger.service';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import helmet from 'helmet';
import * as compression from 'compression';
import { rateLimit } from 'express-rate-limit';

// Configuration pour Vercel
const isVercel = process.env.VERCEL === '1';

export async function bootstrap() {
  const logger = new LoggerService();
  
  logger.log('Démarrage de l\'application Paname Consulting...', 'Bootstrap');

  // Créer l'application Express pour Vercel
  const server = express();
  
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: isVercel ? false : logger,
    }
  );

  // ========== CORS CONFIGURATION ==========
  const allowedOrigins = [
    'https://panameconsulting.vercel.app',
    'https://paname-consulting.vercel.app',
    'https://vercel.live',
    'http://localhost:5173',
    'http://localhost:10000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:10000',
  ];

  // Middleware CORS - DOIT ÊTRE EN PREMIER
  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (curl, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // En développement local, autoriser toutes les origines locales
      if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      
      // Vérifier si l'origine est autorisée
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS bloqué pour origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Set-Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
  });

  // Gérer explicitement les requêtes OPTIONS (préflight)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || allowedOrigins[0]);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    
    next();
  });

  // ========== SECURITY MIDDLEWARE ==========
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

  // ========== BODY PARSERS ==========
  app.use(express.json({ 
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

  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000,
  }));

  // ========== COMPRESSION ==========
  if (!isVercel) {
    app.use(compression());
  }

  // ========== COOKIE PARSER ==========
  app.use(cookieParser(process.env.COOKIE_SECRET || 'paname-consulting-secret-key-2024'));

  // ========== RATE LIMITING ==========
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requêtes par IP
    message: {
      status: 429,
      message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

  app.use(limiter);

  // ========== VALIDATION ==========
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

  // ========== GLOBAL PREFIX ==========
  app.setGlobalPrefix('api');

  // Use the underlying Express server for direct routes
  server.get('/api', (_req: any, res: any) => {
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
      cors_enabled: true,
      cors_credentials: true,
    });
  });

  // ========== INITIALIZATION ==========
  await app.init();

  // ========== PORT CONFIGURATION ==========
  if (isVercel) {
    // Pour Vercel, exporter l'application Express
    logger.log('Application initialisée pour Vercel Serverless', 'Bootstrap');
    
    // Export pour Vercel
    module.exports = (req: any, res: any) => {
      // Log de la requête
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      
      // Appliquer les headers CORS
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      // Handle preflight OPTIONS
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      
      // Passer la requête à l'application Express
      server(req, res);
    };
    
    console.log('Vercel serverless function ready');
  } else {
    // Pour le développement local
    const port = process.env.PORT || 10000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen(port, host, () => {
      logger.log(`🚀 Serveur démarré avec succès sur http://${host}:${port}`, 'Bootstrap');
      logger.log(`📡 API disponible sur http://${host}:${port}/api`, 'Bootstrap');
      logger.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
      logger.log(`🔒 CORS activé pour: ${allowedOrigins.join(', ')}`, 'Bootstrap');
    });
  }
}

// ========== ENTRY POINT ==========
if (isVercel) {
  // Initialiser pour Vercel
  bootstrap().catch((error) => {
    console.error('Vercel bootstrap error:', error);
    process.exit(1);
  });
} else if (require.main === module) {
  // Démarrer localement
  bootstrap().catch((error) => {
    console.error('Local bootstrap error:', error);
    process.exit(1);
  });
}