import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Préfixe global pour toutes les routes API
  app.setGlobalPrefix('api');

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 🔒 Configuration CORS STRICTE pour la PRODUCTION
  const allowedOrigins = [
    'https://panameconsulting.com',
    'https://www.panameconsulting.com',
    'https://panameconsulting.vercel.app',
    'https://panameconsulting.up.railway.app',
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // En production, on est STRICT sur les origines
      if (!origin) {
        // Autoriser les requêtes sans origine (mobile apps, curl, etc.)
        callback(null, true);
        return;
      }
      
      // Vérifier si l'origine est autorisée
      const isAllowed = allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || origin.startsWith(allowedOrigin)
      );
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS bloqué pour l'origine: ${origin}`);
        callback(new Error('Not allowed by CORS policy'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'Access-Control-Allow-Headers',
    ],
    exposedHeaders: [
      'Authorization',
      'X-API-Key',
      'X-Total-Count',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 heures de cache pour les pré-vols
  });

  // Middleware CORS additionnel pour plus de sécurité
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string;
    
    // Vérifier et définir l'origine seulement si autorisée
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    // Gérer les requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    
    next();
  });

  // Création du dossier uploads
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  // Configuration des fichiers statiques
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '30d',
      setHeaders: (res: Response, path: string) => {
        const ext = path.toLowerCase().split('.').pop();
        const mimeTypes: { [key: string]: string } = {
          'png': 'image/png',
          'jpg': 'image/jpeg', 
          'jpeg': 'image/jpeg',
          'webp': 'image/webp',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'pdf': 'application/pdf',
          'txt': 'text/plain',
        };
        
        if (ext && mimeTypes[ext]) {
          res.setHeader('Content-Type', mimeTypes[ext]);
        }
        
        // Headers CORS pour les fichiers statiques
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(', '));
      },
    }),
  );

  // 🔒 PORT depuis les variables d'environnement
  const port = process.env.PORT || 10000;

  await app.listen(port);

  console.log(`🚀 Application démarrée sur le port ${port}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 URL: https://panameconsulting.up.railway.app`);
  console.log(`🔗 API: https://panameconsulting.up.railway.app/api`);
  console.log(`🔒 CORS activé pour: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
  console.error('❌ Erreur lors du démarrage:', error);
  process.exit(1);
});