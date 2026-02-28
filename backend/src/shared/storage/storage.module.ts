import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageService } from "./storage.service";

@Module({
  imports: [ConfigModule], // ConfigModule est nécessaire pour utiliser ConfigService
  providers: [
    StorageService,
    ConfigService,
  ],
  exports: [StorageService], // On exporte le service pour pouvoir l'utiliser dans d'autres modules
})
export class StorageModule {}
