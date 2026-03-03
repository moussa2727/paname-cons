import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
import { IoAdapter } from '@nestjs/platform-socket.io';

const logger = new Logger('Bootstrap');
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

// Configuration CORS - Correspond à votre vercel.json
const allowedOrigins = [
  'https://panameconsulting.vercel.app',
  'https://paname-consulting.vercel.app',
  'https://vercel.live',
  'http://localhost:5173',
  'http://localhost:10000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:10000',
];

// Headers CORS depuis vercel.json
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://panameconsulting.vercel.app, https://paname-consulting.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, Authorization'
};

async function bootstrap() {
  const server = express();
  
  // Configuration de base
  server.set('trust proxy', isProduction ? 1 : false);
  
  // Middlewares de base
  server.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permet les requêtes cross-origin pour les uploads
  }));
  
  // Middleware CORS pour toutes les requêtes
  server.use((req: { headers: { origin: any; }; method: string; }, res: { setHeader: (arg0: string, arg1: string) => void; status: (arg0: number) => { (): any; new(): any; end: { (): void; new(): any; }; }; }, next: () => void) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['https://panameconsulting.vercel.app', 'https://paname-consulting.vercel.app'];
    
    // Définir l'origin dynamiquement
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(', '));
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization, Content-Type');
    
    // Support pour les cookies SameSite=None sur HTTPS
    if (isProduction) {
      res.setHeader('Set-Cookie', 'SameSite=None; Secure; HttpOnly; Path=/');
    }
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  
  server.use(compression());
  server.use(cookieParser(process.env.COOKIE_SECRET));
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Servir les fichiers statiques - Important pour les uploads
  const uploadsPath = path.join(__dirname, '../uploads');
  server.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res: { req: { headers: { origin: any; }; }; set: (arg0: string, arg1: string) => void; }, filePath: string) => {
      const origin = res.req?.headers?.origin;
      const allowedOrigins = ['https://panameconsulting.vercel.app', 'https://paname-consulting.vercel.app', 'https://vercel.live'];
      
      // CORS dynamique pour les uploads
      if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      } else {
        res.set('Access-Control-Allow-Origin', allowedOrigins.join(', '));
      }
      
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Set-Cookie, Authorization');
      
      // Cache pour les images
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  
  logger.log(`Serving uploads from: ${uploadsPath}`);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: false, // Désactivé car géré par vercel.json et notre configuration
    }
  );

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

  // Préfixe global - Correspond à votre vercel.json
  app.setGlobalPrefix('api', {
    exclude: ['/', '/api', '/uploads'],
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
let isAppInitialized = false;

export default async function handler(req: any, res: any) {
  try {
    // Gestion des requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app, https://paname-consulting.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      res.status(200).end();
      return;
    }

    if (!isAppInitialized || !cachedApp) {
      logger.log('Initializing NestJS application...');
      const app = await bootstrap();
      cachedApp = app.getHttpServer();
      isAppInitialized = true;
      logger.log('NestJS application initialized successfully');
    }

    // Logging des requêtes (optionnel)
    logger.debug(`${req.method} ${req.url}`);

    return cachedApp(req, res);
  } catch (error) {
    logger.error('Error in serverless handler:', error);
    
    // Gestion d'erreur améliorée
    const statusCode = error.status || 500;
    const errorMessage = isProduction 
      ? 'Internal Server Error' 
      : error.message;

    res.status(statusCode).json({ 
      error: errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url
    });
  }
}

// Pour le développement local
if (!isVercel) {
  async function startLocalServer() {
    try {
      const app = await bootstrap();
      const port = process.env.PORT || 3000;
      
      // Configuration CORS locale
      app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
        exposedHeaders: ['Set-Cookie', 'Authorization'],
      });

      await app.listen(port);
      logger.log(`Application is running on: http://localhost:${port}`);
      logger.log(`Environment: ${process.env.NODE_ENV}`);
      logger.log(`Vercel: ${isVercel ? 'yes' : 'no'}`);
      logger.log(`📁 Uploads path: ${path.join(__dirname, '../uploads')}`);
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  startLocalServer();
}