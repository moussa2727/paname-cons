// Ce fichier est l'entry point pour Vercel
import { bootstrap } from '../src/main';
import { LoggerService } from '../src/config/logger.service';

const logger = new LoggerService();
let cachedHandler: any = null;

export default async function handler(req: any, res: any) {
  try {
    // Log pour débogage
    logger.log(`${req.method} ${req.url}`, 'Vercel-Handler');
    
    if (!cachedHandler) {
      // Initialiser l'application une seule fois
      const app = await bootstrap();
      cachedHandler = app;
    }
    
    // Gérer les CORS headers
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = [
        "https://panameconsulting.vercel.app",
        "https://paname-consulting.vercel.app",
        "https://vercel.live",
      ];
      
      if (allowedOrigins.some(allowed => origin.includes(allowed))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Autoriser localhost en développement
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Gérer les préflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    // Appeler le handler NestJS
    await cachedHandler(req, res);
    
  } catch (error) {
    logger.error(`Handler error: ${error.message}`, error.stack, 'Vercel-Handler');
    
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'La fonction sans serveur a échoué',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
  }
}