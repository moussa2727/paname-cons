import { BullModule } from '@nestjs/bull';
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_CONFIG } from '../config/email.config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ProcedureProcessor } from './processors/procedure.processor';
import { RendezvousProcessor } from './processors/rendezvous.processor';
import { RedisConfig } from '../config/redis.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        if (!redisConfig?.enabled) {
          throw new Error(
            'Redis est désactivé. Impossible de configurer BullMQ.',
          );
        }
        return {
          connection: {
            redis: redisConfig.url,
          },
          defaultJobOptions: {
            attempts: EMAIL_CONFIG.QUEUE.ATTEMPTS,
            backoff: {
              type: 'exponential',
              delay: EMAIL_CONFIG.QUEUE.BACKOFF_DELAY,
            },
            removeOnComplete: EMAIL_CONFIG.QUEUE.REMOVE_ON_COMPLETE,
            removeOnFail: EMAIL_CONFIG.QUEUE.REMOVE_ON_FAIL,
            jobId: undefined,
            delay: 0,
            priority: 0,
          },
          settings: {
            stalledInterval: EMAIL_CONFIG.QUEUE.STALLED_INTERVAL,
            maxStalledCount: EMAIL_CONFIG.QUEUE.MAX_STALLED_COUNT,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notification' },
      { name: 'procedure' },
      { name: 'backup' },
      { name: 'report' },
      { name: 'rendezvous' },
    ),
  ],
  providers: [
    QueueService,
    QueueController,
    EmailProcessor,
    NotificationProcessor,
    ProcedureProcessor,
    RendezvousProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
