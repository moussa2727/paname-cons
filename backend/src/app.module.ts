import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import configuration from "./config/configuration";
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

@Module({
  imports: [
    // 1. Configuration globale
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),

    // 2. Base de données
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),

    // 3. Fichiers statiques
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),

    // 4. Modules fonctionnels
    AuthModule, // Module d'authentification (doit être avant les modules protégés)
    UsersModule, // Gestion des utilisateurs
    DestinationModule, // Destinations phares
    ContactModule, // Formulaire de contact
    MailModule, // Envoi d'emails
    ProcedureModule, // Gestion des procédures
    RendezvousModule, // Gestion des rendez-vous
    NotificationModule, // Notifications
  ],
  controllers: [AppController],
})
export class AppModule {}
