import { Module } from '@nestjs/common';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import { ProceduresRepository } from './procedures.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, MailModule, UsersModule],
  controllers: [ProceduresController],
  providers: [ProceduresService, ProceduresRepository],
  exports: [ProceduresService, ProceduresRepository],
})
export class ProceduresModule {}
