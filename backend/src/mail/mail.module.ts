import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailService } from "./mail.service";
import { SmtpService } from "../config/smtp.service";

@Global()
@Module({
  imports: [
      ConfigModule.forRoot({
      isGlobal: true,
    })],
  providers: [MailService, SmtpService],
  exports: [MailService, SmtpService],
})
export class MailModule {}