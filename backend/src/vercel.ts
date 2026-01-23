import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';

let cachedServer: any = null;

async function createServer() {
  if (!cachedServer) {
    // Create Express app
    const server = express();
    
    // Add CORS middleware FIRST - before anything else
    server.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      
      // Set CORS headers for ALL requests
      const allowedOrigins = [
        "https://panameconsulting.com",
        "https://www.panameconsulting.com",
        "https://panameconsulting.vercel.app",
        "https://paname-consulting.vercel.app",
        "https://vercel.live",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:10000",
      ];
      
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (!origin || process.env.NODE_ENV !== 'production') {
        // En développement ou requêtes sans origin, autoriser
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24h en secondes
      
      // Handle preflight requests immediately
      if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.status(204).end(); // Utiliser 204 No Content pour OPTIONS
        return;
      }
      
      next();
    });
    
    // Basic middleware
    server.use(express.json({ limit: '10mb' }));
    server.use(express.urlencoded({ extended: true, limit: '10mb' }));

    try {
      // Create NestJS app
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
        { logger: false } // Désactiver le logger pour éviter les conflits
      );
      
      // Enable CORS in NestJS aussi (mais moins restrictif)
      app.enableCors({
        origin: function(origin, callback) {
          // Autoriser les requêtes sans origin
          if (!origin) return callback(null, true);
          
          const allowedOrigins = [
            "https://panameconsulting.com",
            "https://www.panameconsulting.com",
            "https://panameconsulting.vercel.app",
            "https://paname-consulting.vercel.app",
            "https://vercel.live",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:10000",
          ];
          
          if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Set-Cookie', 'Authorization']
      });
      
      // Global prefix
      app.setGlobalPrefix("api");
      
      // Health check endpoint
      server.get('/api', (_req, res) => {
        res.json({
          service: "paname-consulting-api",
          version: process.env.npm_package_version || "1.0.0",
          status: "online",
          timestamp: new Date().toISOString()
        });
      });
      
      // Initialize app
      await app.init();
      
      console.log('NestJS app initialized successfully');
      
    } catch (error) {
      console.error('Error initializing NestJS app:', error);
      // Ajouter un handler d'erreur de secours
      server.use((req, res) => {
        res.status(500).json({
          error: 'NestJS initialization failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      });
    }
    
    cachedServer = server;
  }
  
  return cachedServer;
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  try {
    console.log(`[${new Date().toISOString()}] HANDLER: ${req.method} ${req.url}`);
    
    const server = await createServer();
    
    // Handle the request
    server(req, res);
    
  } catch (error) {
    console.error('Vercel handler error:', error);
    
    if (!res.headersSent) {
      // Set CORS headers even in error
      res.setHeader('Access-Control-Allow-Origin', 'https://panameconsulting.vercel.app');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'La fonction sans serveur a échoué',
        timestamp: new Date().toISOString(),
        details: error.message
      });
    }
  }
}