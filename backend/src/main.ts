/*
 * Paname Consulting API - Main Entry Point
 * Version unifiée pour développement local et Vercel Serverless
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
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
  // Démarrage silencieux pour masquer les informations sensibles
  
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
  
  // 3. Cookie parser avec configuration cross-domain
  expressApp.use(cookieParser(process.env.COOKIE_SECRET));
  
  // Middleware pour configurer les cookies cross-domain
  expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    
    // Configuration des cookies pour cross-domain
    if (origin && (origin.includes('panameconsulting.vercel.app') || origin.includes('paname-consulting.vercel.app'))) {
      // Pour les requêtes cross-domain, configurer les cookies
      const originalCookie = res.cookie;
      res.cookie = function(name: string, value: string, options?: any) {
        const cookieOptions = {
          ...options,
          sameSite: 'none' as const,
          secure: true,
          httpOnly: true,
          domain: origin.includes('panameconsulting.vercel.app') ? 'panameconsulting.vercel.app' : 'paname-consulting.vercel.app',
        };
        return originalCookie.call(this, name, value, cookieOptions);
      };
    }
    
    next();
  });
  
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
      logger: false, // Désactiver complètement les logs pour masquer les infos sensibles
    }
  );
  
  // ========== CONFIGURATION NESTJS ==========
  
  // CORS dans NestJS (complémentaire)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
    // Options importantes pour les cookies cross-domain
    optionsSuccessStatus: 204,
    preflightContinue: false,
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
  
  if (!isVercel) {
    app.setGlobalPrefix('api');
  }
  
  // ========== INITIALISATION ==========
  await app.init();
  
  // ========== ENDPOINTS DE SANTÉ ==========
  expressApp.get('/', (req: express.Request, res: express.Response) => {
    const prefix = isVercel ? '' : '/api';
    res.json({
      status: 'online',
      service: 'paname-consulting-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cors: allowedOrigins,
      endpoints: {
        auth: `${prefix}/auth`,
        users: `${prefix}/users`,
        procedures: `${prefix}/procedures`,
        contact: `${prefix}/contact`,
        destinations: `${prefix}/destinations`,
        rendezvous: `${prefix}/rendezvous`,
      },
    });
  });
  
  // ========== GESTION VERCEL vs LOCAL ==========
  if (isVercel) {
    // Pour Vercel: retourner l'application Express pour le handler
    return expressApp;
    
  } else {
    // Pour le développement local
    const port = process.env.PORT || 10000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen(port, host);
  }
}

// ========== POINT D'ENTRÉE ==========
if (isVercel) {
  // Pour Vercel, on initialise et exporte directement
  bootstrap().then(expressApp => {
    module.exports = expressApp;
  }).catch((error) => {
    console.error('Erreur d\'initialisation Vercel:', error);
    module.exports = (req: express.Request, res: express.Response) => {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Service unavailable',
        timestamp: new Date().toISOString(),
      });
    };
  });
  
} else if (require.main === module) {
  // Démarrer localement
  bootstrap().catch((error) => {
    // Masquer les erreurs détaillées en production
    if (process.env.NODE_ENV === 'production') {
      console.error('Erreur de démarrage');
    } else {
      console.error('Erreur de démarrage local:', error.message);
    }
    process.exit(1);
  });
}