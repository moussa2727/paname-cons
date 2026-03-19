import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [LoggerService, AuditService],
  exports: [LoggerService, AuditService],
})
export class LoggerModule {}
