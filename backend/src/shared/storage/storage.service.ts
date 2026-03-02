// storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    // Créer le dossier de manière synchrone pour éviter les problèmes d'initialisation
    this.ensureUploadDirectorySync();
  }

  /**
   * Garantit que le dossier d'upload existe (synchrone)
   */
  private ensureUploadDirectorySync(): void {
    try {
      fs.accessSync(this.uploadDir);
    } catch {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Génère l'URL publique d'un fichier
   */
getFileUrl(filename: string): string {
  const cleanedBaseUrl = this.baseUrl.endsWith('/') 
    ? this.baseUrl.slice(0, -1) 
    : this.baseUrl;
  
  // Nettoyer le nom du fichier
  let cleanFilename = filename;
  
  // Supprimer les chemins existants
  if (cleanFilename.includes('/')) {
    cleanFilename = cleanFilename.split('/').pop() || cleanFilename;
  }
  
  return `${cleanedBaseUrl}/uploads/${cleanFilename}`;
}

  /**
   * Retourne le chemin absolu vers un fichier
   */
  getFilePath(filename: string): string {
    return path.resolve(process.cwd(), this.uploadDir, filename);
  }

  /**
   * Sauvegarde un fichier
   */
  async saveFile(
    file: Express.Multer.File,
    customFilename?: string,
  ): Promise<string> {
    const filename = customFilename || file.filename;
    const filePath = this.getFilePath(filename);
    
    // Si le fichier a déjà été sauvegardé par Multer, on retourne juste le nom
    if (file.path) {
      return filename;
    }

    // Sinon, on sauvegarde le buffer
    await fs.promises.writeFile(filePath, file.buffer);
    return filename;
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename);
      await unlinkAsync(filePath);
      this.logger.log(`Fichier supprimé: ${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de ${filename}:`, error);
      return false;
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename);
      await accessAsync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Nettoie les fichiers orphelins
   */
  async cleanupOrphanedFiles(validFilenames: string[]): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.uploadDir);
      const orphanedFiles = files.filter(
        file => !validFilenames.includes(file) && file !== '.gitkeep',
      );

      for (const file of orphanedFiles) {
        await this.deleteFile(file);
      }

      return orphanedFiles;
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des fichiers:', error);
      return [];
    }
  }
}