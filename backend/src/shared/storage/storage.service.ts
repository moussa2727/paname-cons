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
  private readonly isVercel = process.env.VERCEL === '1';
  private readonly isProduction = process.env.NODE_ENV === 'production';

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    // Pour Vercel/Production : retourner une URL temporaire ou base64
    if (this.isVercel || this.isProduction) {
      // Solution temporaire : encoder en base64
      const base64 = file.buffer.toString('base64');
      const filename = customName || `${Date.now()}-${file.originalname}`;
      
      // Pour l'instant, on retourne un nom de fichier simulé
      // En production, vous devriez utiliser un service comme AWS S3, Cloudinary, etc.
      this.logger.warn(`Upload sur Vercel: fichier ${filename} (${file.size} bytes)`);
      return filename;
    }

    // Pour développement local : système de fichiers normal
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const filename = customName || `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, filename);

    await writeFile(filePath, file.buffer);
    return filename;
  }

  async deleteFile(filename: string): Promise<void> {
    // Pour Vercel/Production : pas de suppression physique
    if (this.isVercel || this.isProduction) {
      this.logger.warn(`Suppression sur Vercel: fichier ${filename} (simulé)`);
      return;
    }

    // Pour développement local : suppression normale
    const cleanFilename = filename.replace(/^uploads\//, "");
    const filePath = path.join(this.uploadDir, cleanFilename);

    try {
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        this.logger.log(`Fichier supprimé: ${cleanFilename}`);
      }
    } catch (error) {
      this.logger.error(`Erreur suppression fichier ${cleanFilename}:`, error);
      throw error;
    }
  }
}
