import { ValidationPipe, Logger, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { json, urlencoded } from "express";
import helmet from "helmet";
import compression from "compression";
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // Création de l'application NestJS
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      bufferLogs: true,
    });

    // =====================
    // CONFIGURATION SÉCURITÉ
    // =====================
    
    // Helmet pour la sécurité HTTP
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://maps.googleapis.com"],
        },
      },
    }));

    // Compression Gzip - utilisation correcte
    app.use(compression());

    // Limite de taille des requêtes
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    // =====================
    // CONFIGURATION CORS STRICTE
    // =====================
    
    const allowedOrigins = [
      "https://panameconsulting.vercel.app",
      "https://panameconsulting-*.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ];

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 🔒 BLOQUER les requêtes sans origin
        if (!origin) {
          logger.warn('Tentative d\'accès sans origine - REJETÉE');
          return callback(new Error('Origin header required'), false);
        }
        
        // Vérifier si l'origine est autorisée
        const isAllowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            const regex = new RegExp(allowedOrigin.replace('*', '.*'));
            return regex.test(origin);
          }
          return allowedOrigin === origin;
        });

        if (isAllowed) {
          logger.log(`✅ Origine autorisée: ${origin}`);
          callback(null, true);
        } else {
          logger.warn(`❌ Origine non autorisée: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization', 
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Auth-Token',
        'Cache-Control'
      ],
      exposedHeaders: ['Authorization', 'Content-Range', 'X-Total-Count'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // =====================
    // MIDDLEWARE DE SÉCURITÉ
    // =====================
    
    // Middleware pour vérifier l'origine sur toutes les requêtes
    app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      
      // Autoriser uniquement les health checks sans origin
      if (req.path === '/health' || req.path === '/') {
        return next();
      }
      
      // 🔒 Bloquer toutes les autres requêtes sans origin
      if (!origin) {
        logger.warn(`Requête sans origine bloquée: ${req.method} ${req.path}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Origin header required',
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    });

    // =====================
    // CONFIGURATION GLOBALE
    // =====================
    
    // Versioning de l'API
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1'
    });

    // Préfixe global API
    app.setGlobalPrefix('api', {
      exclude: ['health', ''] // Exclure les routes publiques
    });

    // Validation globale
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        validationError: {
          target: false,
          value: false
        }
      })
    );

    // =====================
    // GESTIONNAIRES DE ROUTES AVEC NESTJS
    // =====================
    
    // Route health check (accessible sans origin)
    const healthHandler = (_req: Request, res: Response) => {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        environment: process.env.NODE_ENV || 'production',
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        },
        node: process.version,
      };
      res.json(health);
    };

    // Route racine (accessible sans origin)
    const rootHandler = (_req: Request, res: Response) => {
      res.json({
        message: '🚀 Paname Consulting API',
        version: '1.0',
        documentation: '/api/docs',
        health: '/health',
        timestamp: new Date().toISOString(),
        cors: {
          allowedOrigins: allowedOrigins,
          strictOrigin: true
        }
      });
    };

    // Application des routes avec la syntaxe Express directe
    const server = app.getHttpAdapter().getInstance();
    server.get('/health', healthHandler);
    server.get('/', rootHandler);

    // =====================
    // DÉMARRAGE DU SERVEUR
    // =====================
    
    const port = process.env.PORT || 10000;
    
    await app.listen(port, '0.0.0.0');
    
    logger.log('='.repeat(60));
    logger.log('🚀 PANAME CONSULTING API DÉMARRÉE AVEC SUCCÈS');
    logger.log('='.repeat(60));
    logger.log(`📊 Environnement: ${process.env.NODE_ENV || 'production'}`);
    logger.log(`🔌 Port: ${port}`);
    logger.log(`🌐 URL: http://0.0.0.0:${port}`);
    logger.log(`🔗 API: http://0.0.0.0:${port}/api`);
    logger.log(`❤️  Health: http://0.0.0.0:${port}/health`);
    logger.log(`🔒 CORS STRICT: Origin header required`);
    logger.log(`🌍 Origines autorisées: ${allowedOrigins.join(', ')}`);
    logger.log('='.repeat(60));

  } catch (error) {
    logger.error('❌ ERREUR CRITIQUE LORS DU DÉMARRAGE', error);
    process.exit(1);
  }
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error('💥 ERREUR FATALE', error);
  process.exit(1);
});