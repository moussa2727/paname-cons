import { INestApplicationContext, ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  NestExpressApplication,
  ExpressAdapter,
} from "@nestjs/platform-express";
import {
  useContainer as classValidatorUseContainer,
} from "class-validator";
import express from "express";
import * as fs from "fs";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

function useContainer(
  appContext: INestApplicationContext,
  options: { fallbackOnErrors: boolean },
) {
  classValidatorUseContainer(appContext, options);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // 👇 Création du serveur Express natif
  const server = express();

  // Route health check améliorée
  server.get("/health", (_req, res) => {
    const health = {
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
      platform: process.platform,
    };

    res.status(200).json(health);
  });

  // ➕ Route racine améliorée
  server.get("/", (_req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paname Consulting API</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 2rem; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
          }
          .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          h1 { 
            color: white; 
            margin-bottom: 1rem;
          }
          a { 
            color: #ffd700; 
            text-decoration: none;
          }
          a:hover { 
            text-decoration: underline; 
          }
          .info {
            background: rgba(255,255,255,0.2);
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 API Paname Consulting</h1>
          <div class="info">
            <p><strong>Status:</strong> ✅ En ligne</p>
            <p><strong>Environnement:</strong> ${process.env.NODE_ENV || 'production'}</p>
            <p><strong>Port:</strong> ${process.env.PORT || 10000}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <p>L'API est disponible sur <a href="/api">/api</a></p>
          <p>Health check: <a href="/health">/health</a></p>
          <p>Documentation: <a href="/api/docs">/api/docs</a> (si disponible)</p>
        </div>
      </body>
      </html>
    `);
  });

  try {
    // 👇 Création de l'application Nest avec adaptateur Express personnalisé
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(server),
      {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        bufferLogs: true,
      }
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Sécurité HTTP avec Helmet
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://maps.googleapis.com",
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://fonts.googleapis.com",
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: [
              "'self'",
              "data:",
              "https:",
              "blob:",
            ],
            connectSrc: [
              "'self'",
              "https://maps.googleapis.com",
              "ws:",
              "wss:",
            ],
            frameSrc: ["'self'", "https://www.google.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
      }),
    );

    // Headers de sécurité supplémentaires
    app.use(
      (
        _req: any,
        res: {
          removeHeader: (arg0: string) => void;
          setHeader: (arg0: string, arg1: string) => void;
        },
        next: () => void,
      ) => {
        res.removeHeader("X-Powered-By");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        next();
      },
    );

    // Configuration CORS pour Railway - STRICT
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000", 
      "http://localhost:10000",
      "https://panameconsulting.com",
      "https://www.panameconsulting.com",
      "https://panameconsulting.vercel.app",
      "https://panameconsulting.up.railway.app",
      process.env.RAILWAY_STATIC_URL,
      process.env.FRONTEND_URL,
    ].filter((origin): origin is string => origin !== undefined && origin !== null);

    logger.log(`🌐 Origins CORS autorisés: ${allowedOrigins.join(', ')}`);

    app.enableCors({
      origin: (origin, callback) => {
        // 🔒 REFUSER les requêtes sans origin
        if (!origin) {
          logger.warn(`🚫 Requête sans origin rejetée`);
          return callback(new Error('Origin header required'), false);
        }
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`🚫 Origin non autorisé: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Accept",
        "Authorization", 
        "Cache-Control",
        "X-Requested-With",
        "X-HTTP-Method-Override",
        "X-Forwarded-For",
        "X-Real-IP",
      ],
      exposedHeaders: [
        "Authorization",
        "Content-Range",
        "X-Total-Count",
      ],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 86400,
    });

    // Création du dossier uploads
    const uploadsDir = join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.log(`📁 Dossier uploads créé: ${uploadsDir}`);
    }

    // Configuration des fichiers statiques
    app.use(
      "/uploads",
      express.static(uploadsDir, {
        maxAge: "30d",
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

    // Middleware d'autorisation pour les statistiques
    app.use((req: any, res: any, next: () => void) => {
      if (req.method === 'OPTIONS') {
        return next();
      }
      if (req.path.includes('/stats') && !req.headers.authorization) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      next();
    });

    // Préfixe global API
    app.setGlobalPrefix("api");

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

    const port = process.env.PORT || 10000;
    
    // Log des informations de démarrage
    logger.log('🚀 Démarrage de l application Paname Consulting...');
    logger.log(`📊 Environnement: ${process.env.NODE_ENV}`);
    logger.log(`🔌 Port: ${port}`);
    logger.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Définie' : 'NON DÉFINIE'}`);
    logger.log(`🌐 URL Railway: ${process.env.RAILWAY_STATIC_URL || 'Non définie'}`);

    await app.listen(port);
    
    logger.log(`✅ Serveur démarré avec succès sur le port ${port}`);
    logger.log(`📊 Base de données connectée avec succès`);
    logger.log(`🌍 Health check disponible sur: http://localhost:${port}/health`);
    logger.log(`🔗 API disponible sur: http://localhost:${port}/api`);

  } catch (error) {
    logger.error('❌ Erreur critique lors du démarrage:', error);
    process.exit(1);
  }
}

bootstrap().catch(error => {
  const logger = new Logger('Bootstrap');
  logger.error('💥 Erreur fatale:', error);
  process.exit(1);
});