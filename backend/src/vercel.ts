import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { LoggerService } from './config/logger.service';
import * as express from 'express';

let cachedServer: any = null;

async function createServer() {
  if (!cachedServer) {
    const loggerService = new LoggerService();
    
    // Create Express app
    const server = express();
    
    // Add CORS middleware BEFORE NestJS to handle OPTIONS
    server.use((req, res, next) => {
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
        res.status(200).end();
        return;
      }
      
      // Add CORS headers to all responses
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      
      next();
    });
    
    // Basic middleware
    server.use(express.json({ limit: '10mb' }));
    server.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Create NestJS app
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );
    
    app.useLogger(loggerService);
    
    // CORS for NestJS (backup)
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
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // Global prefix
    app.setGlobalPrefix("api");
    
    // Initialize app
    await app.init();
    
    cachedServer = server;
  }
  
  return cachedServer;
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  try {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    const server = await createServer();
    
    // Handle the request
    server(req, res);
    
  } catch (error) {
    console.error('Vercel handler error:', error);
    
    if (!res.headersSent) {
      // Ensure CORS headers are set even for errors
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'La fonction sans serveur a échoué',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}
