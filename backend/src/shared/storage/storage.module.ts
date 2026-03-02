import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageService } from "./storage.service";
import { UrlService } from "../utils/url.service";

@Module({
  imports: [ConfigModule], // ConfigModule est nécessaire pour utiliser ConfigService
  providers: [
    StorageService,
    ConfigService, // On fournit ConfigService pour l'injection dans StorageService
    UrlService, // Ajouter UrlService pour l'injection dans StorageService
  ],
  exports: [StorageService, UrlService], // On exporte les services pour pouvoir les utiliser dans d'autres modules
})
export class StorageModule {}
