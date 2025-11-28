import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

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

  // Configuration CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://localhost:10000',
    'https://panameconsulting.com',
    'https://www.panameconsulting.com',
    'https://panameconsulting.vercel.app',
    'https://panameconsulting.up.railway.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origine (comme les applications mobiles)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Origin non autorisée:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
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
      setHeaders: (res, path: string) => {
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
      },
    }),
  );

  // 🔒 Utilisation du PORT depuis les variables d'environnement
  const port = process.env.PORT || 10000;

  await app.listen(port);

  console.log(`🚀 Application démarrée sur le port ${port}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`🔗 API: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('❌ Erreur lors du démarrage:', error);
  process.exit(1);
});