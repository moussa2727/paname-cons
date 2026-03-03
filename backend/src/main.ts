import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as http from 'http';
import * as fs from 'fs';


const logger = new Logger('Bootstrap');
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

// Configuration CORS - Domaines autorisés
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
  
  // Trust proxy pour les déploiements derrière un proxy (Vercel)
  server.set('trust proxy', isProduction ? 1 : false);
  
  // Middleware CORS principal - DOIT être le premier middleware
  server.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // 🔑 CRITIQUE: Avec credentials: 'include', on doit renvoyer l'origine EXACTE
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin'); // Important pour les CDN/proxies
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
      // Logger les origines non autorisées pour déboguer
      logger.warn(`Origine non autorisée tentant d'accéder à l'API: ${origin}`);
      // Ne pas définir Access-Control-Allow-Origin => le navigateur bloquera
    }
    
    // Headers CORS toujours nécessaires
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin'
    );
    res.setHeader('Access-Control-Expose-Headers', 
      'Set-Cookie, Authorization, Content-Type, Content-Length'
    );
    
    // Politique de ressource cross-origin pour les uploads
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Headers de sécurité de base
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Gestion des requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.status(204).end(); // 204 No Content est standard pour OPTIONS
      return;
    }
    
    next();
  });
  
  // Middleware pour parser les cookies manuellement
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
    req.signedCookies = { ...cookies }; // Copie simple sans signature
    
    next();
  });
  
  // Middleware pour parser le JSON manuellement
  server.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
        req.headers['content-type']?.includes('application/json')) {
      
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
        // Protection contre les trop gros payloads (10mb)
        if (body.length > 10 * 1024 * 1024) {
          res.status(413).json({ 
            error: 'Payload too large',
            message: 'Request entity too large'
          });
          req.destroy();
        }
      });
      
      req.on('end', () => {
        try {
          req.body = body ? JSON.parse(body) : {};
          next();
        } catch (err) {
          res.status(400).json({ 
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON'
          });
        }
      });
    } else {
      next();
    }
  });
  
  // Middleware pour parser les formulaires URL encoded manuellement
  server.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
        req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      
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
  });
  
  // Middleware de compression simple (gzip)
  server.use((req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'];
    if (acceptEncoding && acceptEncoding.includes('gzip')) {
      const originalWrite = res.write;
      const originalEnd = res.end;
      const chunks: Buffer[] = [];
      
      res.write = function(chunk: any, encoding?: any, callback?: any) {
        if (chunk) {
          chunks.push(Buffer.from(chunk));
        }
        return true;
      };
      
      (res.end as any) = function(chunk?: any, encoding?: any, callback?: any) {
        if (chunk) {
          chunks.push(Buffer.from(chunk));
        }
        
        if (chunks.length === 0) {
          originalEnd.call(res, chunk, encoding, callback);
          return;
        }
        
        const zlib = require('zlib');
        zlib.gzip(Buffer.concat(chunks), (err: Error | null, compressed: Buffer) => {
          if (err) {
            originalEnd.call(res, chunk, encoding, callback);
            return;
          }
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          originalEnd.call(res, compressed, encoding, callback);
        });
      };
    }
    next();
  });
  
  // Servir les fichiers statiques (uploads) manuellement
  const uploadsPath = path.join(__dirname, '../uploads');
  
  // Créer le répertoire uploads s'il n'existe pas (pour le développement local)
  if (!isVercel) {
    const fs = require('fs');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      logger.log(`📁 Répertoire uploads créé: ${uploadsPath}`);
    }
  }
  
  server.use('/uploads', (req, res, next) => {
    // Sécurité: éviter les path traversals
    const requestedPath = req.url.split('?')[0]; // Enlever les query params
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(uploadsPath, safePath);
    
    // Vérifier que le chemin est dans le répertoire uploads
    if (!filePath.startsWith(uploadsPath)) {
      logger.warn(`Tentative d'accès en dehors du répertoire uploads: ${requestedPath}`);
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // Headers CORS pour les fichiers statiques
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app');
    }
    
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    // Servir le fichier avec fs
    const fs = require('fs');
    fs.stat(filePath, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
      if (err || !stats.isFile()) {
        logger.debug(`Fichier non trouvé: ${filePath}`);
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      // Cache pour les images
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
      }
      
      // Déterminer le Content-Type
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.zip': 'application/zip',
      };
      
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      
      // Stream le fichier
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      
      stream.on('error', (streamErr: Error) => {
        logger.error(`Erreur lors du streaming du fichier: ${streamErr.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
    });
  });
  
  logger.log(`📁 Dossier uploads servi depuis: ${uploadsPath}`);

  // Créer l'application NestJS
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: false, // Désactivé car géré manuellement
      bodyParser: false, // Désactivé car géré manuellement
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
    exclude: ['/', '/api', '/uploads', '/health'],
  });

  // Versionnement de l'API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.init();
  return app;
}

// Cache pour l'application serverless
let cachedApp: any;
let isAppInitialized = false;

// Handler principal pour Vercel serverless
export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Logger la requête entrante
    logger.debug(`[${requestId}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    
    // Gestion des requêtes OPTIONS (preflight) - CRITIQUE pour CORS
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      
      // 🔑 Règle d'or: avec credentials, renvoyer l'origine EXACTE
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      } else {
        // Fallback pour les requêtes sans origine ou non autorisée
        res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin'
      );
      res.setHeader('Access-Control-Expose-Headers', 
        'Set-Cookie, Authorization, Content-Type, Content-Length'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24h cache pour preflight
      
      res.status(204).end();
      return;
    }

    // Initialiser l'application NestJS si nécessaire (lazy loading)
    if (!isAppInitialized || !cachedApp) {
      logger.log(`[${requestId}] Initialisation de l'application NestJS...`);
      const app = await bootstrap();
      cachedApp = app.getHttpServer();
      isAppInitialized = true;
      logger.log(`[${requestId}] Application NestJS initialisée avec succès`);
    }

    // Ajouter les headers CORS pour les requêtes normales
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }

    // Exécuter la requête
    return cachedApp(req, res);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Erreur dans le handler serverless (${duration}ms):`, error);
    
    // Gestion d'erreur améliorée
    const statusCode = error.status || 500;
    const errorResponse = {
      error: isProduction ? 'Internal Server Error' : error.message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      requestId,
      ...(isProduction ? {} : { stack: error.stack }),
    };

    res.status(statusCode).json(errorResponse);
  }
}

// Pour le développement local (non-Vercel)
if (!isVercel) {
  async function startLocalServer() {
    try {
      const app = await bootstrap();
      const port = process.env.PORT || 3000;
      
      // Créer le serveur HTTP
      const httpServer = http.createServer(app.getHttpAdapter().getInstance());
      
      // Gérer les erreurs du serveur
      httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Le port ${port} est déjà utilisé`);
          process.exit(1);
        } else {
          logger.error('Erreur serveur:', error);
        }
      });
      
      httpServer.listen(port, () => {
        logger.log(`🚀 Application démarrée sur: http://localhost:${port}`);
        logger.log(`📦 Environnement: ${process.env.NODE_ENV || 'development'}`);
        logger.log(`🌐 Mode Vercel: ${isVercel ? 'oui' : 'non'}`);
        logger.log(`📁 Dossier uploads: ${path.join(__dirname, '../uploads')}`);
        logger.log(`🔑 Domaines CORS autorisés:`);
        allowedOrigins.forEach(origin => logger.log(`   - ${origin}`));
      });
      
      // Gestion propre de l'arrêt
      process.on('SIGTERM', () => {
        logger.log('SIGTERM reçu, arrêt gracieux...');
        httpServer.close(() => {
          logger.log('Serveur arrêté');
          process.exit(0);
        });
      });
      
    } catch (error) {
      logger.error('Échec du démarrage du serveur:', error);
      process.exit(1);
    }
  }
  
  startLocalServer();
}