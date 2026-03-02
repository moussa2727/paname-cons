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
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';

const logger = new Logger('Bootstrap');
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

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
  const server = express();
  
  // Configuration de base
  server.set('trust proxy', isProduction ? 1 : false);
  
  // Middlewares de base
  server.use(helmet());
  server.use(compression());
  server.use(cookieParser(process.env.COOKIE_SECRET));
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Servir les fichiers statiques
  server.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    }
  );

  // Configuration CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) => `${error.property} - ${Object.values(error.constraints).join(', ')}`
        );
        return new BadRequestException(messages);
      },
    })
  );

  // Préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/api'],
  });

  // Versionnement
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.init();
  return app;
}

// Pour Vercel serverless
let cachedApp: any;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      const app = await bootstrap();
      cachedApp = app.getHttpAdapter().getInstance();
    }
    return cachedApp(req, res);
  } catch (error) {
    logger.error('Error in serverless handler:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: isProduction ? 'An error occurred' : error.message 
    });
  }
}

// Pour le développement local
if (!isVercel) {
  async function startLocalServer() {
    try {
      const app = await bootstrap();
      const port = process.env.PORT || 3000;
      
      await app.listen(port);
      logger.log(`Application is running on: http://localhost:${port}`);
      logger.log(`Environment: ${process.env.NODE_ENV}`);
      logger.log(`Vercel: ${isVercel ? 'yes' : 'no'}`);
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  startLocalServer();
}