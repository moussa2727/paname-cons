import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      message: 'Paname Consulting API is running',
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('api')
  @ApiOperation({ summary: 'API information' })
  getApiInfo(@Res() res: Response) {
    res.json({
      name: 'Paname Consulting API',
      version: '1.0.0',
      status: 'OK',
      endpoints: {
        destinations: '/api/destinations',
        auth: '/api/auth',
        users: '/api/users',
        contact: '/api/contact',
        procedures: '/api/procedures',
        rendezvous: '/api/rendezvous',
        documentation: '/api/docs',
        uploads: '/api/uploads',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
