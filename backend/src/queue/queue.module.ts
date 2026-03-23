import { BullModule } from '@nestjs/bull';
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ProcedureProcessor } from './processors/procedure.processor';
import { RendezvousProcessor } from './processors/rendezvous.processor';
import { RedisConfig } from '../config/redis.config';

// Configuration BullMQ
const BULL_QUEUE_ATTEMPTS = 5;
const BULL_BACKOFF_DELAY = 10000;
const BULL_REMOVE_ON_COMPLETE = 100;
const BULL_REMOVE_ON_FAIL = 500;
const BULL_STALLED_INTERVAL = 30000;
const BULL_MAX_STALLED_COUNT = 1;

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
            attempts: BULL_QUEUE_ATTEMPTS,
            backoff: {
              type: 'exponential',
              delay: BULL_BACKOFF_DELAY,
            },
            removeOnComplete: BULL_REMOVE_ON_COMPLETE,
            removeOnFail: BULL_REMOVE_ON_FAIL,
            jobId: undefined,
            delay: 0,
            priority: 0,
          },
          settings: {
            stalledInterval: BULL_STALLED_INTERVAL,
            maxStalledCount: BULL_MAX_STALLED_COUNT,
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
