import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailService } from "./mail.service";
import { SmtpService } from "../config/smtp.service";
import { LoggerService } from "../config/logger.service";

@Global()
@Module({
  imports: [
      ConfigModule.forRoot({
      isGlobal: true,
    })],
  providers: [MailService, SmtpService, LoggerService],
  exports: [MailService, SmtpService, LoggerService],
})
export class MailModule {}