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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const transport = new DailyRotateFile({
      filename: `${logPath}/application-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: this.configService.get<string>('LOG_MAX_SIZE', '10m'),
      maxFiles: this.configService.get<string>('LOG_MAX_FILES', '30'),
    });

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'panameconsulting' } as Record<string, unknown>,
      transports: [
        transport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
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

  error(message: string, context?: string) {
    this.logger.error(message, { context: context || this.context });
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
