import { INestApplicationContext, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  NestExpressApplication,
  ExpressAdapter,
} from "@nestjs/platform-express";
import { useContainer as classValidatorUseContainer } from "class-validator";
import express from "express";
import rateLimit from "express-rate-limit";
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
  // 👇 Création du serveur Express natif
  const server = express();

  server.get("/health", (req, res) => {
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
    };

    res.status(200).json(health);
  });

  // ➕ Route spéciale pour /
  server.get("/", (req, res) => {
    res.status(200).send(`
      <h1>Bienvenue sur le site Paname Consulting</h1>
      <p>L'API est disponible sur <a href="/api">/api</a></p>
    `);
  });

  // 👇 Création de l'application Nest avec adaptateur Express personnalisé
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Sécurité HTTP avec Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "https://www.google.com"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://maps.googleapis.com",
            "https://www.google.com",
            "https://maps.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://www.google.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: [
            "'self'",
            "data:",
            "https://maps.gstatic.com",
            "https://maps.googleapis.com",
            "https://www.google.com",
          ],
          connectSrc: [
            "'self'",
            "http://localhost:3000",
            "https://maps.googleapis.com",
          ],
          frameSrc: ["https://www.google.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    (
      req: any,
      res: {
        removeHeader: (arg0: string) => void;
        header: (arg0: string, arg1: string) => void;
      },
      next: () => void,
    ) => {
      res.removeHeader("X-Powered-By");
      res.header("X-Content-Type-Options", "nosniff");
      next();
    },
  );

  // CORS (MUST come before rate limiting)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://panameconsulting.com',
    'https://www.panameconsulting.com',
    'https://panameconsulting.vercel.app',
    'https://www.panameconsulting.vercel.app',
  ];
  const netlifyPreviewRegex = /^https?:\/\/([a-z0-9-]+--)?panameconsulting\.netlify\.app$/i;
  const localhostRegex = /^http:\/\/localhost:\d+$/i;
  const isAllowedOrigin = (o: string) =>
    allowedOrigins.includes(o) || netlifyPreviewRegex.test(o) || localhostRegex.test(o);

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://panameconsulting.onrender.com",
      "https://panameconsulting.vercel.app",
    ],
    methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      " Cache-Control",
      "X-Requested-With",
      "X-HTTP-Method-Override",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
    exposedHeaders: ["set-cookie"],
  });

  // Fichiers statiques
  const uploadsDir = join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  app.use(
    "/uploads",
    (
      req: any,
      res: { header: (arg0: string, arg1: string) => void },
      next: () => void,
    ) => {
      // Utilisez vos domaines spécifiques au lieu de '*'
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://panameconsulting.onrender.com",
        "https://panameconsulting.vercel.app",
      ];

      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }

      res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept",
      );
      next();
    },
  );

  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      setHeaders: (
        res: { set: (arg0: string, arg1: string) => void },
        path: string,
      ) => {
        if (
          path.endsWith(".jpg") ||
          path.endsWith(".png") ||
          path.endsWith(".webp")
        ) {
          res.set("Content-Type", "image/jpeg");
        }
      },
    }),
  );


  app.use((req: { path: string | string[]; headers: { authorization: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; }, next: () => void) => {
  // Allow CORS preflight to pass without Authorization
  // so browsers can complete OPTIONS before sending actual request
  // and avoid false 401 causing CORS errors.
  if ((req as any).method === 'OPTIONS') {
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
    }),
  );

  const port = process.env.PORT || 10000;
  await app.listen(port);
  console.log(`Database connected successfully`);
  console.log(`Server running on port ${port}`);
}

bootstrap();
