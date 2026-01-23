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
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
      
      // Handle preflight requests immediately
      if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.status(200).end();
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
      );
      
      // Global prefix
      app.setGlobalPrefix("api");
      
      // Initialize app
      await app.init();
      
      console.log('NestJS app initialized successfully');
      
    } catch (error) {
      console.error('Error initializing NestJS app:', error);
      // Continue without NestJS if there's an error
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
