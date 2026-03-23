// forcing ipv4
import { setDefaultResultOrder } from 'dns';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { PrismaService } from './prisma/prisma.service';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { JsonExceptionFilter } from './common/filters/json-exception.filter';

const corsOrigins =
  process.env.NODE_ENV === 'production'
    ? [
        'https://panameconsulting.com',
        'https://www.panameconsulting.com',
        'https://panameconsulting.vercel.app',
      ]
    : ['http://localhost:5173', 'http://localhost:10000'];
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: process.env.NODE_ENV === 'production',
    cors: false,
    abortOnError: false,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const logger = new Logger('Bootstrap');
  app.useLogger(logger);

  // ==================== SÉCURITÉ ====================
  interface HttpAdapterWithSet {
    set?(name: string, value: any): void;
  }
  const httpAdapter = app.getHttpAdapter().getInstance() as HttpAdapterWithSet;
  if (httpAdapter?.set) {
    httpAdapter.set('trust proxy', 1);
  }
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

  // Vérifier les variables d'environnement SMTP
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    logger.warn(
      " Variables SMTP non configurées. Le service d'email ne fonctionnera pas.",
    );
    logger.warn(
      '   Définissez EMAIL_USER et EMAIL_PASS dans votre fichier .env',
    );
  } else {
    logger.log(
      `SMTP configuré pour: ${emailUser.substring(0, 3)}...@${emailUser.split('@')[1]}`,
    );
  }
  // ==================== PRÉFIXE GLOBAL ====================
  app.setGlobalPrefix('api', {
    exclude: [
      '/api',
      '/uploads/',
      '/uploads/destinations/',
      '/uploads/profiles/',
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
  app.useGlobalFilters(new JsonExceptionFilter(), new PrismaExceptionFilter());
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
  const port = configService.get<number>('PORT', 10000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Serveur API démarré sur : http://0.0.0.0:${port}`);
  logger.log(`Environnement : ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap().catch((error) => {
  console.error('Erreur fatale au démarrage:', error);
  process.exit(1);
});
