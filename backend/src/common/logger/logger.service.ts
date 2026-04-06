import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import * as winston from 'winston';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const DailyRotateFile = require('winston-daily-rotate-file');
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const logPath = this.configService.get<string>(
      'LOG_FILE_PATH',
      '/app/backend/logs',
    );

    // Ajouter les couleurs à winston
    winston.format.colorize({ level: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const fileTransport = new DailyRotateFile({
      filename: `${logPath}/application-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: this.configService.get<string>('LOG_MAX_SIZE', '10m'),
      maxFiles: this.configService.get<string>('LOG_MAX_FILES', '30'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.printf(
          ({
            timestamp,
            message,
            context,
            ...meta
          }: {
            timestamp: string;
            level: string;
            message: string;
            context?: string;
            [key: string]: unknown;
          }) => {
            const contextStr = context ? `[${context}] ` : '';
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : '';
            return `${timestamp} ${contextStr}${message}${metaStr}`;
          },
        ),
      ),
    });

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
      ),
      defaultMeta: {
        service: 'ambassade-mali-maroc',
      } as Record<string, unknown>,
      transports: [
        fileTransport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.ms(),
            winston.format.colorize({ level: true }),
            winston.format.printf(
              ({
                timestamp,
                level,
                message,
                context,
                ms,
              }: {
                timestamp: string;
                level: string;
                message: string;
                context?: string;
                ms?: string;
              }) => {
                const pid = process.pid;
                const contextStr = context ? `[${context}] ` : '';
                const upperLevel = level.toUpperCase();

                return `[Nest] ${pid}  - ${timestamp}   ${upperLevel} ${contextStr}${message} ${ms || ''}`;
              },
            ),
          ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string) {
    // NestJS error method peut recevoir un trace optionnel
    if (trace) {
      this.logger.error(`${message}\n${trace}`, {
        context: context || this.context,
      });
    } else {
      this.logger.error(message, { context: context || this.context });
    }
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }
}
