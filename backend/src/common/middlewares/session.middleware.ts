import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionRepository } from '../../tokens/session.repository';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private sessionRepository: SessionRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);

    if (token) {
      try {
        const session = await this.sessionRepository.findActiveSession(token);
        if (session) {
          req['session'] = session;
          req['user'] = { id: session.userId };
        }
      } catch {
        // Ignorer les erreurs de session, continuer sans session
      }
    }

    next();
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    const cookies = req.cookies as { session_token?: string } | undefined;
    return cookies?.session_token || null;
  }
}
