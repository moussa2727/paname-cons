import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisConfig } from '../config/redis.config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ProcedureProcessor } from './processors/procedure.processor';
import { RendezvousProcessor } from './processors/rendezvous.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        if (!redisConfig.enabled) {
          throw new Error(
            'Redis est désactivé. Impossible de configurer BullMQ.',
          );
        }
        return {
          redis: redisConfig.url,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500,
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
