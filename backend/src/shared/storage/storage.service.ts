import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly isVercel: boolean;
  private readonly uploadDir: string;

  constructor() {
    this.isVercel = process.env.VERCEL === '1';
    this.uploadDir = this.isVercel ? '/tmp/uploads' : join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`[StorageService] Répertoire ${this.uploadDir} prêt`);
    } catch (error) {
      console.error(`[StorageService] Erreur création répertoire:`, error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    const filename = customName || `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, filename);
    
    console.log(`[StorageService] Upload du fichier: ${filename}`);
    console.log(`[StorageService] Chemin: ${filePath}`);
    console.log(`[StorageService] Taille: ${file.size} bytes`);
    
    try {
      if (this.isVercel) {
        // Sur Vercel, écrire dans /tmp
        await fs.writeFile(filePath, file.buffer);
        console.log(`[StorageService] Fichier écrit dans /tmp: ${filename}`);
      } else {
        // En local, créer le dossier et stocker sur disque
        await fs.writeFile(filePath, file.buffer);
        console.log(`[StorageService] Fichier stocké sur disque: ${filePath}`);
      }
      
      return filename;
    } catch (error) {
      console.error(`[StorageService] Erreur upload:`, error);
      throw new Error(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  async getFileBuffer(filename: string): Promise<Buffer | null> {
    const filePath = join(this.uploadDir, filename);
    
    console.log(`[StorageService] Demande du fichier: ${filename}`);
    console.log(`[StorageService] Chemin complet: ${filePath}`);
    
    try {
      if (this.isVercel) {
        // Sur Vercel, lire depuis /tmp
        const buffer = await fs.readFile(filePath);
        console.log(`[StorageService] Fichier trouvé dans /tmp: ${filename} (${buffer.length} bytes)`);
        return buffer;
      } else {
        // En local, les fichiers sont servis par Express static
        console.log(`[StorageService] Fichier local (servi par Express): ${filename}`);
        return null;
      }
    } catch (error) {
      console.log(`[StorageService] Fichier NON trouvé: ${filename}`);
      console.log(`[StorageService] Erreur:`, error.message);
      return null;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    // Supprime le préfixe 'uploads/' s'il existe
    const cleanFilename = filename.replace(/^uploads\//, "");

    const filePath = join(this.uploadDir, cleanFilename);
    
    console.log(`[StorageService] Suppression du fichier: ${filename}`);
    
    try {
      if (this.isVercel) {
        await fs.unlink(filePath);
        console.log(`[StorageService] Fichier supprimé de /tmp: ${filename}`);
      } else {
        await fs.unlink(filePath);
        console.log(`[StorageService] Fichier supprimé du disque: ${filename}`);
      }
    } catch (error) {
      console.log(`[StorageService] Erreur suppression (fichier peut ne pas exister):`, error.message);
    }
  }
}
