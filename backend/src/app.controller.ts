import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor() {}

  @Public()
  @Get()
  getRoot() {
    return {
      message: "Bienvenue sur l'API Paname Consulting",
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('api')
  getApiInfo() {
    return {
      name: 'Paname Consulting API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        procedures: '/api/procedures',
        rendezvous: '/api/rendezvous',
        contacts: '/api/contacts',
        destinations: '/api/destinations',
        uploads: '/api/uploads',
      },
      documentation: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      version: process.version,
    };
  }
}
