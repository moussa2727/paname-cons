import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly isVercel: boolean;
  private readonly memoryStorage: Map<string, Buffer> = new Map();

  constructor() {
    this.isVercel = process.env.VERCEL === '1';
    
    if (this.isVercel) {
      // Sur Vercel, utiliser /tmp/uploads
      this.uploadDir = '/tmp/uploads';
    } else {
      // En local, utiliser uploads à la racine
      this.uploadDir = path.join(process.cwd(), "uploads");
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    const filename = customName || `${Date.now()}-${file.originalname}`;

    if (this.isVercel) {
      // Sur Vercel, stocker en mémoire
      this.memoryStorage.set(filename, file.buffer);
      console.log(`Fichier ${filename} stocké en mémoire (Vercel)`);
      return filename;
    } else {
      // En local, créer le dossier et stocker sur disque
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }

      const filePath = path.join(this.uploadDir, filename);
      await writeFile(filePath, file.buffer);
      return filename;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    // Supprime le préfixe 'uploads/' s'il existe
    const cleanFilename = filename.replace(/^uploads\//, "");

    if (this.isVercel) {
      // Sur Vercel, supprimer de la mémoire
      this.memoryStorage.delete(cleanFilename);
      console.log(`Fichier ${cleanFilename} supprimé de la mémoire (Vercel)`);
    } else {
      // En local, supprimer du disque
      const filePath = path.join(this.uploadDir, cleanFilename);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    }
  }

  // Méthode pour servir les fichiers depuis Vercel
  getFileBuffer(filename: string): Buffer | null {
    if (this.isVercel) {
      return this.memoryStorage.get(filename) || null;
    }
    return null; // En local, les fichiers sont servis par Express static
  }
}
