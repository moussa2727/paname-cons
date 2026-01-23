import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { LoggerService } from './config/logger.service';
import * as express from 'express';

let cachedApp: any;

async function bootstrapApp() {
  if (!cachedApp) {
    const loggerService = new LoggerService();
    
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    
    app.useLogger(loggerService);
    
    // Configuration CORS pour Vercel
    app.enableCors({
      origin: [
        "https://panameconsulting.com",
        "https://www.panameconsulting.com", 
        "https://paname-consulting.vercel.app",
        "https://vercel.live",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:10000",
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Cookie', 
        'Set-Cookie',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      exposedHeaders: ['Set-Cookie', 'Authorization'],
    });

    // Prefix global de l'API
    app.setGlobalPrefix("api");
    
    await app.init();
    cachedApp = expressApp;
  }
  
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrapApp();
    
    // Handle the request with the Express app
    app(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'La fonction sans serveur a échoué',
        timestamp: new Date().toISOString()
      });
    }
  }
}
