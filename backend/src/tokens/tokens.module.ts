import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RefreshTokenRepository } from './refresh-token.repository';
import { SessionRepository } from './session.repository';
import { ResetTokenRepository } from './reset-token.repository';
import { RevokedTokenRepository } from './revoked-token.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    RefreshTokenRepository,
    SessionRepository,
    ResetTokenRepository,
    RevokedTokenRepository,
  ],
  exports: [
    RefreshTokenRepository,
    SessionRepository,
    ResetTokenRepository,
    RevokedTokenRepository,
  ],
})
export class TokensModule {}
