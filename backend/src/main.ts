import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';

import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

let cachedApp: any;
let cachedNestApp: NestExpressApplication | null = null; // Maintenant typé correctement
let isInitializing = false;
const logger = new Logger('Bootstrap');
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

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

  // ✅ CORS avec credentials
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie'],
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

  // ✅ Service des fichiers statiques - UNE SEULE FOIS
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath)); // Utiliser app, pas server

  // ✅ MIDDLEWARE: Configuration des cookies
  server.use((req: any, res: any, next: any) => {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 60 * 1000,
      path: '/',
    };

    const originalCookie = res.cookie;
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

  // Préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/', '/api', '/uploads'],
  });

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
  
  // ✅ Retourner les deux instances
  return { server, app };
}

// Handler pour Vercel
if (isVercel) {
  const handler = async (req: any, res: any) => {
    try {
      if (!cachedApp || !cachedNestApp) {
        if (isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 100));
          return handler(req, res);
        }

        isInitializing = true;
        try {
          const { server, app } = await createApp(); // ✅ Récupérer les deux
          cachedApp = server;
          cachedNestApp = app; // ✅ Maintenant assigné !
          
          logger.log('✅ Application initialisée avec succès pour Vercel');
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

  module.exports = handler;
  module.exports.default = handler;
} 

// Pour le développement local
if (!isVercel) {
  async function bootstrap() {
    const { server } = await createApp();
    const port = parseInt(process.env.PORT || '10000', 10);
    const host = process.env.HOST || "0.0.0.0";

    server.listen(port, host, () => {
      const logger = new Logger('Bootstrap');
      logger.log(`✅ Server started successfully on PORT=${port}`); 
      logger.log(`🚀 Application is running on: ${host}:${port}`);
      logger.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.log(`🍪 Session timeout: 30 minutes`);
      logger.log(`🔐 CORS with credentials enabled`);
    });
  }

  bootstrap().catch((error) => {
    console.error('❌ Failed to bootstrap application:', error);
    process.exit(1);
  });
}