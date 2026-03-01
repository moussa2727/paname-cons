import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as crypto from "crypto";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Détecter si on est sur Vercel
const isVercel = process.env.VERCEL === '1';

@Injectable()
export class StorageService {
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    if (isVercel) {
      // Sur Vercel, on ne stocke pas les fichiers localement
      // On retourne un nom de fichier généré pour la cohérence
      const timestamp = Date.now();
      const random = crypto.randomBytes(4).toString('hex');
      const extension = file.originalname.split('.').pop() || 'png';
      const filename = customName || `${timestamp}-${random}.${extension}`;
      
      console.log(`[StorageService] Fichier ${filename} uploadé (non stocké sur Vercel)`);
      return filename;
    } else {
      // En local, on stocke physiquement les fichiers
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }

      const filename = customName || `${Date.now()}-${file.originalname}`;
      const filePath = path.join(this.uploadDir, filename);

      await writeFile(filePath, file.buffer);
      console.log(`[StorageService] Fichier ${filename} stocké localement: ${filePath}`);
      return filename;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    if (isVercel) {
      // Sur Vercel, pas de nettoyage nécessaire
      const cleanFilename = filename.replace(/^uploads\//, "");
      console.log(`[StorageService] Fichier ${cleanFilename} supprimé (non stocké sur Vercel)`);
    } else {
      // En local, supprimer physiquement le fichier
      const cleanFilename = filename.replace(/^uploads\//, "");
      const filePath = path.join(this.uploadDir, cleanFilename);

      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        console.log(`[StorageService] Fichier ${cleanFilename} supprimé localement: ${filePath}`);
      }
    }
  }
}
