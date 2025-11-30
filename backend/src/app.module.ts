import { Module, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ServeStaticModule } from "@nestjs/serve-static";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { join } from "path";
import { AppController } from "./app.controller";

// Modules métier
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ContactModule } from "./contact/contact.module";
import { DestinationModule } from "./destination/destination.module";
import { MailModule } from "./mail/mail.module";
import { RendezvousModule } from "./rendez-vous/rendez-vous.module";
import { NotificationModule } from "./notification/notification.module";
import { ProcedureModule } from "./procedure/procedure.module";

// Interceptors
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { TimeoutInterceptor } from "./shared/interceptors/timeout.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("MongooseModule");

        // ✅ VÉRIFICATION SÉCURISÉE DE L'URI
        const uri = configService?.get?.("MONGODB_URI");

        if (!uri) {
          logger.error("❌ MONGODB_URI non définie");
          throw new Error(
            "MONGODB_URI is not defined in environment variables",
          );
        }

        logger.log("✅ Connexion MongoDB configurée");

        return {
          uri,
          retryAttempts: 5,
          retryDelay: 3000,
          serverSelectionTimeoutMS: 30000,
        };
      },
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: {
        index: false,
        dotfiles: "deny",
      },
    }),

    // Modules métier
    AuthModule,
    UsersModule,
    DestinationModule,
    ContactModule,
    MailModule,
    ProcedureModule,
    RendezvousModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}