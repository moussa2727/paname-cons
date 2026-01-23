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
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

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

// Variable pour cacher l'app initialisée (singleton)
let cachedApp: express.Application | null = null;
let isInitializing = false;
let initializationPromise: Promise<express.Application> | null = null;

async function initializeApp(): Promise<express.Application> {
  // Si l'app est déjà initialisée, la retourner
  if (cachedApp) {
    return cachedApp;
  }

  // Si une initialisation est en cours, attendre qu'elle se termine
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
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
          res.status(204).end();
          return;
        }
        
        next();
      });
      
      // 2. Body parsers
      expressApp.use(express.json({ 
        limit: '10mb',
        verify: (req: any, _res: any, buf: Buffer, encoding: BufferEncoding) => {
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
          const originalCookie = res.cookie;
          res.cookie = function(name: string, value: string, options?: any) {
            const cookieOptions = {
              ...options,
              sameSite: 'none' as const,
              secure: true,
              httpOnly: true,
              // Ne pas définir de domaine pour permettre aux deux domaines de fonctionner
              // domain: undefined,
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
        windowMs: 15 * 60 * 1000,
        max: 1000,
        message: {
          status: 429,
          message: 'Trop de requêtes depuis cette IP',
          timestamp: new Date().toISOString(),
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
          return req.path === '/';
        },
      });
      
      expressApp.use(limiter);
      
      // ========== CRÉATION DE L'APPLICATION NESTJS ==========
      const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(expressApp),
        {
          logger: isVercel ? false : ['error', 'warn'],
          abortOnError: false,
        }
      );
      
      // ========== CONFIGURATION NESTJS ==========
      
      // CORS dans NestJS (complémentaire) - AJOUT DE LA CONFIGURATION RECOMMANDÉE
      app.enableCors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
        credentials: true, // IMPORTANT: permet l'envoi des cookies
        exposedHeaders: ['Set-Cookie'], // Expose les headers Set-Cookie
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
        maxAge: 86400,
        optionsSuccessStatus: 204,
        preflightContinue: false,
      });
      
      // Helmet security
      app.use(helmet({
        contentSecurityPolicy: false, 
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
      
      app.setGlobalPrefix('api'); 
      
      // ========== INITIALISATION ==========
      await app.init();
      
      // Mettre en cache l'app pour Vercel
      if (isVercel) {
        cachedApp = expressApp;
      }
      
      isInitializing = false;
      return expressApp;
      
    } catch (error) {
      isInitializing = false;
      initializationPromise = null;
      throw error;
    }
  })();
  
  return initializationPromise;
}

// ========== POINT D'ENTRÉE ==========
if (isVercel) {
  // Pour Vercel: exporter un handler qui initialise l'app à la première requête
  module.exports = async (req: express.Request, res: express.Response) => {
    try {
      const app = await initializeApp();
      return app(req, res);
    } catch (error) {
      console.error('Erreur d\'initialisation Vercel:', error);
      
      // En cas d'erreur, retourner une réponse appropriée
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Service initialization failed',
          timestamp: new Date().toISOString(),
          details: isVercel ? undefined : (error as Error).message,
        });
      }
    }
  };
  
  // Export par défaut pour Vercel
  module.exports.default = module.exports;
  
} else {
  // Démarrer en mode local
  (async () => {
    try {
      const expressApp = await initializeApp();
      const port = process.env.PORT || 10000;
      const host = process.env.HOST || '0.0.0.0';
      
      // En local, on utilise app.listen de NestJS
      const httpAdapter = (expressApp as any).getHttpAdapter?.() || expressApp;
      const server = httpAdapter.listen(port, host, () => {
        console.log(`Serveur démarré sur http://${host}:${port}`);
        console.log(`API disponible sur http://${host}:${port}/api`);
      });
      
      // Gestion gracieuse de l'arrêt
      process.on('SIGTERM', () => {
        console.log('SIGTERM reçu, fermeture du serveur...');
        server.close(() => {
          console.log('Serveur fermé');
          process.exit(0);
        });
      });
      
    } catch (error) {
      console.error('Erreur de démarrage local:', error);
      process.exit(1);
    }
  })();
}