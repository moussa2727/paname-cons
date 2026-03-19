import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';
import { MailModule } from '../mail/mail.module';
import { LoggerModule } from '../common/logger/logger.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { JwtModuleOptions } from '@nestjs/jwt';

@Module({
  imports: [
    UsersModule,
    TokensModule,
    MailModule,
    LoggerModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        const secret =
          configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        const expiresIn =
          configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';

        return await Promise.resolve({
          secret,
          signOptions: {
            expiresIn: parseInt(expiresIn),
          },
        });
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, RefreshTokenStrategy],
  exports: [AuthService],
})
export class AuthModule {}
