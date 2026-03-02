import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { UrlService } from '../utils/url.service';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  constructor(private readonly urlService: UrlService) {}

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    const filename = customName || `${Date.now()}-${file.originalname}`;
    
    // Toujours utiliser le système de fichiers local
    return this.uploadFileLocal(file, filename);
  }

  private async uploadFileLocal(file: Express.Multer.File, filename: string): Promise<string> {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const filePath = path.join(this.uploadDir, filename);
    await writeFile(filePath, file.buffer);
    this.logger.log(`Fichier uploadé localement: ${filename}`);
    return filename;
  }

  async deleteFile(filename: string): Promise<void> {
    // Utiliser UrlService pour normaliser le chemin (gère uploads/ et uploads\)
    const cleanFilename = this.urlService.normalizeFilePath(filename);

    // Supprimer du système de fichiers local
    const filePath = path.join(this.uploadDir, cleanFilename);
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      this.logger.log(`Fichier supprimé localement: ${cleanFilename}`);
    }
  }

  async getFileBuffer(filename: string): Promise<Buffer | null> {
    // Utiliser UrlService pour normaliser le chemin (gère uploads/ et uploads\)
    const cleanFilename = this.urlService.normalizeFilePath(filename);

    // Toujours utiliser les fichiers locaux
    return this.getFileBufferLocal(cleanFilename);
  }

  private async getFileBufferLocal(cleanFilename: string): Promise<Buffer | null> {
    // Chemin différent selon l'environnement
    const filePath = process.env.VERCEL === '1' 
      ? path.join(process.cwd(), 'dist', 'uploads', cleanFilename)  // Sur Vercel, fichiers dans dist/
      : path.join(this.uploadDir, cleanFilename);                 // En local, fichiers dans uploads/
    
    if (fs.existsSync(filePath)) {
      return await readFile(filePath);
    }
    return null;
  }

  async getFileUrl(filename: string): Promise<string> {
    // Utiliser le UrlService pour générer l'URL complète de l'API
    return this.urlService.getImageUrl(filename);
  }

  /**
   * Obtenir l'URL complète pour une image (méthode utilitaire)
   */
  getFullImageUrl(filename: string): string {
    return this.urlService.getImageUrl(filename);
  }
}
