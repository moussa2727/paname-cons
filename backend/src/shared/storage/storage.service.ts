import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    this.logger.log(`[DEBUG] StorageService.uploadFile() - file: ${file.originalname}, size: ${file.size}, uploadDir: ${this.uploadDir}`);
    
    try {
      // Créer le dossier uploads s'il n'existe pas
      if (!fs.existsSync(this.uploadDir)) {
        this.logger.log(`[DEBUG] Création dossier uploads: ${this.uploadDir}`);
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }

      const filename = customName || `${Date.now()}-${file.originalname}`;
      const filePath = path.join(this.uploadDir, filename);

      this.logger.log(`[DEBUG] Écriture fichier: ${filePath}`);
      await writeFile(filePath, file.buffer);
      
      console.log(`[StorageService] Fichier ${filename} stocké: ${filePath}`);
      return filename;
    } catch (error) {
      this.logger.error(`[ERROR] Erreur uploadFile: ${error.message}`, error);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    // Supprime le préfixe 'uploads/' s'il existe
    const cleanFilename = filename.replace(/^uploads\//, "");
    const filePath = path.join(this.uploadDir, cleanFilename);

    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      console.log(`[StorageService] Fichier ${cleanFilename} supprimé: ${filePath}`);
    }
  }
}
