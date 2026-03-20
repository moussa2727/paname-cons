import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as helmet from 'helmet';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { JsonExceptionFilter } from './common/filters/json-exception.filter';
import { LoggingMiddleware } from './common/middlewares/logging.middleware';

const corsOrigins =
  process.env.NODE_ENV === 'production'
    ? [
        'https://panameconsulting.vercel.app',
        'https://www.panameconsulting.com',
      ]
    : ['http://localhost:5173', 'http://localhost:10000'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: process.env.NODE_ENV === 'production',
    cors: false,
    abortOnError: false,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const logger = new Logger('Bootstrap');
  app.useLogger(logger);

  // ==================== SÉCURITÉ ====================
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet.default({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          scriptSrcAttr: [`'unsafe-inline'`],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            `https://fonts.googleapis.com`,
          ],
          fontSrc: [`'self'`, `https://fonts.gstatic.com`],
          imgSrc: [
            `'self'`,
            'data:',
            'validator.swagger.io',
            'res.cloudinary.com',
          ],
          connectSrc: [`'self'`],
          frameSrc: [`'self'`, `https://www.google.com`],
        },
      },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true }
          : false,
    }),
  );

  app.use(compression({ level: 6, threshold: 1024 }));

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Cookie',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });

  app.use(cookieParser(configService.get('COOKIE_SECRET')));

  // ==================== LOGGING ====================
  const loggingMiddleware = new LoggingMiddleware(configService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    loggingMiddleware.use(req, res, next);
  });

  // ==================== PRÉFIXE GLOBAL ====================
  app.setGlobalPrefix('api', {
    exclude: [
      '/',
      '/api',
      '/uploads',
      '/uploads/*path',
      '/uploads/destinations',
      '/uploads/destinations/*path',
      '/uploads/profiles',
      '/uploads/profiles/*path',
      '/version',
      '/debug/headers',
      '/health',
    ],
  });

  // ==================== PIPES ====================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      exceptionFactory: (errors) => ({
        statusCode: 400,
        message: 'Validation échouée',
        errors: errors.map((err) => ({
          field: err.property,
          constraints: err.constraints,
        })),
      }),
    }),
  );

  // ==================== FILTRES ====================
  app.useGlobalFilters(
    new JsonExceptionFilter(),
    new PrismaExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // ==================== UPLOADS STATIQUES ====================
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  // ==================== MIDDLEWARE AUTH SIMPLIFIÉ ====================
  app.use('/api/secret', (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  });

  // ==================== GRACEFUL SHUTDOWN ====================
  async function gracefulShutdown() {
    try {
      logger.log('Début de la fermeture graceful...');
      await app.close();
      logger.log('Fermeture graceful terminée avec succès');
    } catch (error) {
      logger.error(
        `Erreur lors de la fermeture graceful: ${(error as Error).message}`,
      );
    }
  }

  process.on(
    'SIGTERM',
    () => void gracefulShutdown().then(() => process.exit(0)),
  );
  process.on(
    'SIGINT',
    () => void gracefulShutdown().then(() => process.exit(0)),
  );
  prismaService.enableShutdownHooks();

  // ==================== DÉMARRAGE ====================
  const host = configService.get<string>('HOST', '0.0.0.0');
  const port = configService.get<number>('PORT', 10000);
  await app.listen(port, host);

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const domain = process.env.DOMAIN || host;
  logger.log(`🚀 Serveur démarré sur : ${protocol}://${domain}:${port}`);
  logger.log(`Environnement : ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap().catch((error) => {
  console.error('Erreur fatale au démarrage:', error);
  process.exit(1);
});
