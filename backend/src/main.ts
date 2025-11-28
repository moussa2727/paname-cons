import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as express from "express";
import { join } from "path";
import * as fs from "fs";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Préfixe global pour toutes les routes API
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

  // 🔒 Configuration CORS STRICTE pour la PRODUCTION
  const allowedOrigins = [
    "https://panameconsulting.vercel.app",
    "https://panameconsulting.com",
    "https://www.panameconsulting.com",
    "https://panameconsulting.up.railway.app",
    "http://localhost:10000", // Ajout pour le développement
    "http://localhost:5173", // ⭐ AJOUTEZ CELUI-CI
    "http://localhost:5174", // Optionnel pour d'autres ports
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(`🚫 CORS bloqué: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Origin,X-Requested-With,Content-Type,Accept,Authorization",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Gestion globale des requêtes OPTIONS (preflight)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      res.header(
        "Access-Control-Allow-Methods",
        "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept,Authorization",
      );
      res.status(204).send();
    } else {
      next();
    }
  });

  // Création du dossier uploads
  const uploadsDir = join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  // Configuration des fichiers statiques (SANS en-têtes CORS manuels)
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      setHeaders: (res: Response, path: string) => {
        const ext = path.toLowerCase().split(".").pop();
        const mimeTypes: { [key: string]: string } = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
          gif: "image/gif",
          svg: "image/svg+xml",
          pdf: "application/pdf",
          txt: "text/plain",
        };

        if (ext && mimeTypes[ext]) {
          res.setHeader("Content-Type", mimeTypes[ext]);
        }

        // ⚠️ SUPPRIMÉ: Les en-têtes CORS sont gérés par la configuration globale
        // Ne pas ajouter manuellement Access-Control-Allow-Origin ici
      },
    }),
  );

  // 🔒 PORT depuis les variables d'environnement
  const port = process.env.PORT || 10000;

  await app.listen(port);

  console.log(`🚀 Application démarrée sur le port ${port}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || "production"}`);
  console.log(`🌐 URL: https://panameconsulting.up.railway.app`);
  console.log(`🔗 API: https://panameconsulting.up.railway.app/api`);
  console.log(`🔒 CORS activé pour: ${allowedOrigins.join(", ")}`);
  console.log(`📁 Dossier uploads: ${uploadsDir}`);
}

bootstrap().catch((error) => {
  console.error("❌ Erreur lors du démarrage:", error);
  process.exit(1);
});
