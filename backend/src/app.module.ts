import { Module, Logger } from "@nestjs/common";
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
      envFilePath: ".env", // ← AJOUTÉ
    }),

    // 2. Base de données - CONFIGURATION AMÉLIORÉE
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("MongooseModule");
        const uri = configService.get<string>("MONGODB_URI");

        // Logs détaillés pour le débogage
        logger.log(`🔗 Configuration MongoDB...`);
        logger.log(`📊 MONGODB_URI: ${uri ? "Définie" : "NON DÉFINIE"}`);

        if (!uri) {
          logger.error(
            "❌ MONGODB_URI est non définie dans les variables d'environnement",
          );
          logger.error(
            "💡 Vérifiez les variables dans Railway: MONGODB_URI, NODE_ENV, PORT",
          );
          throw new Error(
            "MONGODB_URI is not defined in environment variables",
          );
        }

        logger.log(`🔐 Tentative de connexion à la base de données en ligne.`);

        return {
          uri,
          retryAttempts: 5, // ← AJOUTÉ
          retryDelay: 3000, // ← AJOUTÉ
          serverSelectionTimeoutMS: 30000, // ← AJOUTÉ
          socketTimeoutMS: 45000, // ← AJOUTÉ
          bufferCommands: false, // ← AJOUTÉ
          connectTimeoutMS: 30000, // ← AJOUTÉ
          // Options supplémentaires pour la stabilité
          maxPoolSize: 10,
          minPoolSize: 1,
          heartbeatFrequencyMS: 10000,
        };
      },
      inject: [ConfigService],
    }),

    // 3. Serveur de fichiers statiques
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: {
        index: false, // Désactive l'indexation
        dotfiles: "deny", // Bloque les fichiers cachés (.env, etc.)
        cacheControl: true,
        maxAge: 2592000000, // 30 jours en ms
      },
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
  providers: [
    {
      provide: "INITIALIZE_DATABASE",
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("DatabaseInit");
        const uri = configService.get<string>("MONGODB_URI");

        if (!uri) {
          logger.error("🚨 MONGODB_URI manquante au démarrage");
        } else {
          logger.log("✅ Configuration MongoDB chargée");
        }
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
