import { Module, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisConfig } from './config/redis.config';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProceduresModule } from './procedures/procedures.module';
import { RendezvousModule } from './rendezvous/rendezvous.module';
import { DestinationsModule } from './destinations/destinations.module';
import { ContactsModule } from './contacts/contacts.module';
import { UploadModule } from './upload/upload.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { CronModule } from './cron/cron.module';
import { LoggerModule } from './common/logger/logger.module';
import { TokensModule } from './tokens/tokens.module';
import { CacheModule } from './cache/cache.module';
import { HolidaysModule } from './holidays/holidays.module';
import { QueueModule } from './queue/queue.module';
import { SessionModule } from './common/middlewares/session.module';

// Common
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Interceptors & Filters
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// Configuration
import configuration from './config/configuration';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';

// ==================== VALIDATION GLOBALE EMAIL ====================

const EmailEnvValidatorProvider = {
  provide: 'EMAIL_ENV_VALIDATOR',
  inject: [ConfigService],
  useFactory: (config: ConfigService): void => {
    const logger = new Logger('EmailEnvValidator');
    const user = config.get<string>('EMAIL_USER');
    const pass = config.get<string>('EMAIL_PASS');

    if (!user || !pass) {
      logger.error(
        ' EMAIL_USER ou EMAIL_PASS manquant — les emails ne fonctionneront pas',
      );
      logger.error(
        '   → Définissez EMAIL_USER et EMAIL_PASS dans votre fichier .env',
      );
    } else {
      logger.log(
        ` SMTP configuré — ${user.substring(0, 3)}***@${user.split('@')[1]}`,
      );
    }
  },
};

@Module({
  imports: [
    // ==================== CONFIGURATION ====================
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ==================== RATE LIMITING ====================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL', 60),
            limit: config.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // ==================== SCHEDULER (CRON) ====================
    ScheduleModule.forRoot(),

    // ==================== REDIS QUEUE (BULL) ====================
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisConfig = config.get<RedisConfig>('redis');
        if (!redisConfig.enabled) {
          return {
            redis: undefined,
            disableProcessManagement: true,
          };
        }
        return {
          redis: redisConfig.url,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        };
      },
    }),

    // ==================== MODULES MÉTIER ====================
    PrismaModule,
    LoggerModule,
    TokensModule,
    ContactsModule,
    QueueModule,
    MailModule,
    CronModule,
    CacheModule,
    HolidaysModule,
    SessionModule,

    // Modules fonctionnels
    AuthModule,
    UsersModule,
    ProceduresModule,
    RendezvousModule,
    DestinationsModule,
    UploadModule,
  ],

  controllers: [AppController],

  providers: [
    // ==================== VALIDATION EMAIL AU BOOT ====================
    EmailEnvValidatorProvider,

    // ==================== GUARDS GLOBAUX (ordre important) ====================
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 1️⃣ Rate limiting d'abord
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 2️⃣ Authentification JWT
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // 3️⃣ Vérification des rôles
    },

    // ==================== PIPE GLOBAL ====================
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          disableErrorMessages: process.env.NODE_ENV === 'production',
        }),
    },

    // ==================== INTERCEPTEURS GLOBAUX ====================
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // ==================== FILTRES GLOBAUX ====================
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],

  exports: [ConfigModule],
})
export class AppModule {
  // exporting appmodule
}
