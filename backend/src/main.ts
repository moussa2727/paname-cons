import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';

import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

// ✅ Types explicites pour éviter les erreurs de runtime
let cachedServer: express.Express | null = null;
let cachedNestApp: NestExpressApplication | null = null;
let initPromise: Promise<{ server: express.Express; app: NestExpressApplication }> | null = null;

const logger = new Logger('Bootstrap');
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

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
  scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
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

async function createApp(): Promise<{ server: express.Express; app: NestExpressApplication }> {
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

  // ✅ CORS avec validation dynamique
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} non autorisée`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  // ✅ Body parsers
  server.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 1000 }));
  server.use(express.json({ limit: '10mb' }));

  // ✅ Compression
  server.use(compression());

  // ✅ Cookie Parser avec fallback pour éviter un crash si COOKIE_SECRET absent
  server.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret-change-me'));

  // ✅ Middleware cookies sécurisés
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

  const uploadsPath = path.join(process.cwd(), 'uploads');
  server.use('/uploads', express.static(uploadsPath));

  // ✅ Security headers
  server.use(
    helmet({
      contentSecurityPolicy: { directives: cspDirectives },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      noSniff: true,
      xssFilter: true,
    }),
  );

  // ✅ Préfixe global (uploads retiré car désactivé sur Vercel)
  app.setGlobalPrefix('api', {
    exclude: ['/', '/api', '/uploads'],
  });

  // ✅ Validation globale
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

  // ✅ Versionnement
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.init();

  return { server, app };
}

// ✅ Handler Vercel — Promise unique, pas de récursion infinie
if (isVercel) {
  const getApp = (): Promise<{ server: express.Express; app: NestExpressApplication }> => {
    if (cachedServer && cachedNestApp) {
      return Promise.resolve({ server: cachedServer, app: cachedNestApp });
    }

    // Réutiliser la même promesse si init déjà en cours
    if (!initPromise) {
      initPromise = createApp()
        .then(({ server, app }) => {
          cachedServer = server;
          cachedNestApp = app;
          logger.log('✅ Application initialisée pour Vercel');
          return { server, app };
        })
        .catch((error) => {
          // Permettre une nouvelle tentative au prochain appel
          initPromise = null;
          logger.error('❌ Échec initialisation:', error);
          throw error;
        });
    }

    return initPromise;
  };

  const handler = async (req: any, res: any) => {
    try {
      const { server } = await getApp();
      return server(req, res);
    } catch (error) {
      logger.error('❌ Erreur handler Vercel:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Service temporairement indisponible',
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  // ✅ Export simple — double export évité pour compatibilité ESM/CJS
  module.exports = handler;
}

// ✅ Développement local uniquement
if (!isVercel) {
  async function bootstrap() {
    const { server } = await createApp();
    const port = parseInt(process.env.PORT || '10000', 10);

    server.listen(port, () => {
      logger.log(`✅ Serveur démarré sur PORT=${port}`);
      logger.log(`🚀 Application: localhost:${port}`);
      logger.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.log(`🍪 Session timeout: 30 minutes`);
      logger.log(`🔐 CORS avec credentials activé`);
    });
  }

  bootstrap().catch((error) => {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  });
}