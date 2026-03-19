import { Module } from '@nestjs/common';
import { RendezvousService } from './rendezvous.service';
import { RendezvousController } from './rendezvous.controller';
import { RendezvousRepository } from './rendezvous.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { HolidaysModule } from '../holidays/holidays.module';

@Module({
  imports: [PrismaModule, MailModule, UsersModule, HolidaysModule],
  controllers: [RendezvousController],
  providers: [RendezvousService, RendezvousRepository],
  exports: [RendezvousService],
})
export class RendezvousModule {}
