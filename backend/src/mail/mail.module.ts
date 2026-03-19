import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailService } from './mail.service';
import { EmailConfig } from '../config/email.config';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  providers: [MailService, EmailConfig],
  exports: [MailService],
})
export class MailModule {}
