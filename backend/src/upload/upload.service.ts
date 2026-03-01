import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import { StorageService } from "../shared/storage/storage.service";

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return this.storageService.uploadFile(file);
  }

  async deleteFile(filename: string): Promise<void> {
    return this.storageService.deleteFile(filename);
  }

  getFileUrl(filename: string): string {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.logger.log(`[${requestId}] Génération d'URL pour le fichier: ${this.maskFilename(filename)}`);

      const baseUrl = this.configService.get("BASE_URL");

      if (!baseUrl) {
        this.logger.error(`[${requestId}] BASE_URL non définie dans les variables d'environnement`);
        throw new Error("BASE_URL is not defined in environment variables");
      }

      const cleanedBaseUrl = baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl;

      const fileUrl = `${cleanedBaseUrl}/uploads/${filename}`;
      
      this.logger.log(`[${requestId}] URL générée avec succès (domaine: ${this.maskDomain(cleanedBaseUrl)})`);
      
      return fileUrl;
    } catch (error) {
      this.logger.error(`[${requestId}] Erreur lors de la génération de l'URL: ${error.message}`);
      throw error;
    }
  }

  private maskFilename(filename: string): string {
    if (!filename) return 'fichier_inconnu';
    
    const ext = path.extname(filename);
    const nameWithoutExt = filename.replace(ext, '');
    
    if (nameWithoutExt.length <= 2) {
      return nameWithoutExt + '***' + ext;
    }
    
    const maskedName = nameWithoutExt.charAt(0) + 
                      '***' + 
                      nameWithoutExt.charAt(nameWithoutExt.length - 1);
    
    return maskedName + ext;
  }

  private maskDomain(url: string): string {
    if (!url) return 'url_inconnue';
    
    try {
      const domain = new URL(url).hostname;
      const parts = domain.split('.');
      
      if (parts.length >= 2) {
        if (parts.length > 2) {
          parts[0] = '***';
        }
        return parts.join('.');
      }
      
      return domain;
    } catch {
      return url.length <= 10 ? url : url.substring(0, 5) + '***' + url.substring(url.length - 5);
    }
  }
}