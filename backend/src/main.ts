// Dans votre fichier principal (main.ts)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as http from 'http';

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
  
  // Trust proxy
  server.set('trust proxy', isProduction ? 1 : false);
  
  // Middleware CORS manuel (sans helmet)
  server.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Définir l'origine dynamiquement
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app, https://paname-consulting.vercel.app');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization, Content-Type');
    
    // Cross-Origin-Resource-Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Headers de sécurité de base (remplacement de helmet)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  // Compression manuelle
  server.use((req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'];
    if (acceptEncoding && acceptEncoding.includes('gzip')) {
      const originalWrite = res.write;
      const originalEnd = res.end;
      const chunks: Buffer[] = [];
      
      (res.write as any) = function(chunk: any, encoding?: any, callback?: any) {
        chunks.push(Buffer.from(chunk));
        return true;
      };
      
      (res.end as any) = function(chunk?: any, encoding?: any, callback?: any) {
        if (chunk) {
          chunks.push(Buffer.from(chunk));
        }
        
        const zlib = require('zlib');
        zlib.gzip(Buffer.concat(chunks), (err: Error | null, compressed: Buffer) => {
          if (err) {
            originalEnd.call(res, chunk, encoding, callback);
            return;
          }
          res.setHeader('Content-Encoding', 'gzip');
          originalEnd.call(res, compressed, encoding, callback);
        });
      };
    }
    next();
  });
  
  // Cookie parser manuel
  server.use((req: any, res, next) => {
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.cookie;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts[1] || '';
        cookies[name] = decodeURIComponent(value);
      });
    }
    
    req.cookies = cookies;
    req.signedCookies = cookies; // Simplifié, sans signature
    
    next();
  });
  
  // JSON parser manuel
  server.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.headers['content-type'] === 'application/json') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
          // Protection contre les trop gros payloads (10mb)
          if (body.length > 10 * 1024 * 1024) {
            res.status(413).json({ error: 'Payload too large' });
            req.destroy();
          }
        });
        
        req.on('end', () => {
          try {
            req.body = body ? JSON.parse(body) : {};
            next();
          } catch (err) {
            res.status(400).json({ error: 'Invalid JSON' });
          }
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });
  
  // URL encoded parser manuel
  server.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
          if (body.length > 10 * 1024 * 1024) {
            res.status(413).json({ error: 'Payload too large' });
            req.destroy();
          }
        });
        
        req.on('end', () => {
          const params = new URLSearchParams(body);
          req.body = {};
          params.forEach((value, key) => {
            req.body[key] = value;
          });
          next();
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });
  
  // Servir les fichiers statiques manuellement
  const uploadsPath = path.join(__dirname, '../uploads');
  server.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsPath, req.url);
    
    // Vérifier que le chemin est dans le répertoire uploads (sécurité)
    if (!filePath.startsWith(uploadsPath)) {
      res.status(403).send('Forbidden');
      return;
    }
    
    // Headers CORS pour les fichiers statiques
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app, https://paname-consulting.vercel.app');
    }
    
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Servir le fichier avec fs
    const fs = require('fs');
    fs.stat(filePath, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
      if (err || !stats.isFile()) {
        res.status(404).send('File not found');
        return;
      }
      
      // Cache pour les images
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Type', getContentType(filePath));
      
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });
  
  logger.log(`Serving uploads from: ${uploadsPath}`);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: false,
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

  // Préfixe global
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

// Fonction utilitaire pour déterminer le Content-Type
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
  };
  return types[ext] || 'application/octet-stream';
}

// Cache pour l'application
let cachedApp: any;
let isAppInitialized = false;

// Handler serverless
export default async function handler(req: any, res: any) {
  try {
    // Gestion des requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      const allowedOrigins = ['https://panameconsulting.vercel.app', 'https://paname-consulting.vercel.app'];
      
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(', '));
      }
      
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
      
      // Créer le serveur HTTP
      const httpServer = http.createServer(app.getHttpAdapter().getInstance());
      
      httpServer.listen(port, () => {
        logger.log(`Application is running on: http://localhost:${port}`);
        logger.log(`Environment: ${process.env.NODE_ENV}`);
        logger.log(`Vercel: ${isVercel ? 'yes' : 'no'}`);
        logger.log(`📁 Uploads path: ${path.join(__dirname, '../uploads')}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  startLocalServer();
}