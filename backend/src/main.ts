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
  "https://panameconsulting.vercel.app",
  "https://panameconsulting.com",
  "https://www.panameconsulting.com",
  "https://panameconsulting.up.railway.app",
];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error("CORS blocked"), false);
    }
  },
  credentials: true,
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
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