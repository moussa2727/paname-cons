// Ce fichier est l'entry point pour Vercel
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import * as express from 'express';

let cachedHandler: any = null;

async function createHandler() {
  if (!cachedHandler) {
    // Create Express app
    const server = express();
    
    // CORS middleware
    server.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin) {
        const allowedOrigins = [
          "https://panameconsulting.com",
          "https://www.panameconsulting.com", 
          "https://panameconsulting.vercel.app",
          "https://paname-consulting.vercel.app",
          "https://vercel.live",
        ];
        
        if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
      
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      
      next();
    });
    
    // Body parsers
    server.use(express.json({ limit: '10mb' }));
    server.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Create NestJS app
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { logger: false }
    );
    
    app.enableCors({
      origin: true,
      credentials: true
    });
    
    app.setGlobalPrefix("api");
    
    await app.init();
    
    cachedHandler = server;
  }
  
  return cachedHandler;
}

export default async function handler(req: any, res: any) {
  try {
    const server = await createHandler();
    server(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error);
    
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'La fonction sans serveur a échoué',
        timestamp: new Date().toISOString(),
        details: error.message
      });
    }
  }
}