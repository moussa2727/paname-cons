import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { MailModule } from '../mail/mail.module';
import { LoggerModule } from '../common/logger/logger.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, MailModule, LoggerModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
