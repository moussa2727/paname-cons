import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Détecter si on est sur Vercel
const isVercel = process.env.VERCEL === '1';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = isVercel ? "/tmp/uploads" : "uploads";  // /tmp sur Vercel, uploads en local
  private readonly fileStorage = new Map<string, Buffer>();  // Stockage en mémoire pour Vercel

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    this.logger.log(`[DEBUG] StorageService.uploadFile() - file: ${file.originalname}, size: ${file.size}, uploadDir: ${this.uploadDir}`);
    
    try {
      const filename = customName || `${Date.now()}-${file.originalname}`;
      
      if (isVercel) {
        // Sur Vercel: stocker en mémoire uniquement
        this.fileStorage.set(filename, file.buffer);
        this.logger.log(`[DEBUG] Fichier stocké en mémoire Vercel: ${filename}`);
        return filename;
      } else {
        // En local: stocker sur disque
        if (!fs.existsSync(this.uploadDir)) {
          this.logger.log(`[DEBUG] Création dossier uploads: ${this.uploadDir}`);
          fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        const filePath = path.join(this.uploadDir, filename);
        this.logger.log(`[DEBUG] Écriture fichier: ${filePath}`);
        await writeFile(filePath, file.buffer);
        
        console.log(`[StorageService] Fichier ${filename} stocké: ${filePath}`);
        return filename;
      }
    } catch (error) {
      this.logger.error(`[ERROR] Erreur uploadFile: ${error.message}`, error);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    // Supprime le préfixe 'uploads/' s'il existe
    const cleanFilename = filename.replace(/^uploads\//, "");
    const filePath = path.join(this.uploadDir, cleanFilename);

    this.logger.log(`[DEBUG] Suppression fichier: ${filePath}`);

    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      console.log(`[StorageService] Fichier ${cleanFilename} supprimé: ${filePath}`);
    } else {
      this.logger.warn(`[WARN] Fichier non trouvé pour suppression: ${filePath}`);
    }
  }
}
