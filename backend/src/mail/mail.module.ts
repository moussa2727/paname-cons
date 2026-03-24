import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailConfig } from '../config/email.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService, EmailConfig],
  exports: [MailService, EmailConfig],
})
export class MailModule {}
