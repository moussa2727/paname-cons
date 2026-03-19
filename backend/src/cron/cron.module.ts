import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupCron } from './session-cleanup.cron';
import { TokenCleanupCron } from './token-cleanup.cron';
import { RendezvousReminderCron } from './rendezvous-reminder.cron';
import { DatabaseBackupCron } from './database-backup.cron';
import { RendezvousCleanupCron } from './rendezvous-cleanup.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, MailModule, TokensModule],
  providers: [
    SessionCleanupCron,
    TokenCleanupCron,
    RendezvousReminderCron,
    DatabaseBackupCron,
    RendezvousCleanupCron,
  ],
  exports: [
    SessionCleanupCron,
    TokenCleanupCron,
    RendezvousReminderCron,
    DatabaseBackupCron,
    RendezvousCleanupCron,
  ],
})
export class CronModule {}
