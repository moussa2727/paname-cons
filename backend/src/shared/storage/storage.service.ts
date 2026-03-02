import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly isVercel: boolean;
  private readonly uploadDir: string;

  constructor() {
    this.isVercel = process.env.VERCEL === '1';
    this.uploadDir = this.isVercel ? '/uploads' : join(process.cwd(), 'uploads');
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
    
    console.log(`[StorageService] Upload du fichier: ${filename}`);
    console.log(`[StorageService] Taille: ${file.size} bytes`);
    
    try {
      if (this.isVercel) {
        // Sur Vercel, stocker dans /tmp/uploads ET dans dist/uploads
        const tmpPath = join('/uploads', filename);
        const distPath = join(process.cwd(), 'dist', 'uploads', filename);
        
        // 1. Stocker dans /tmp (pour la durée de la fonction)
        await fs.mkdir('/uploads', { recursive: true });
        await fs.writeFile(tmpPath, file.buffer);
        console.log(`[StorageService] Fichier écrit dans /uploads: ${filename}`);
        
        // 2. Essayer de stocker dans dist/uploads (pour les prochains déploiements)
        try {
          await fs.mkdir(join(process.cwd(), 'dist', 'uploads'), { recursive: true });
          await fs.writeFile(distPath, file.buffer);
          console.log(`[StorageService] Fichier écrit dans /uploads: ${filename}`);
        } catch (distError) {
          console.log(`[StorageService] Impossible d'écrire dans /uploads: ${distError.message}`);
        }
      } else {
        // En local, créer le dossier et stocker sur disque
        await fs.mkdir(this.uploadDir, { recursive: true });
        const filePath = join(this.uploadDir, filename);
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
    console.log(`[StorageService] Demande du fichier: ${filename}`);
    
    // Essayer plusieurs emplacements sur Vercel
    if (this.isVercel) {
      // 1. Essayer /tmp/uploads (nouveau système)
      const tmpPath = join('/uploads', filename);
      console.log(`[StorageService] Essai /uploads: ${tmpPath}`);
      
      try {
        const buffer = await fs.readFile(tmpPath);
        console.log(`[StorageService] Fichier trouvé dans /uploads: ${filename} (${buffer.length} bytes)`);
        return buffer;
      } catch (tmpError) {
        console.log(`[StorageService] Non trouvé dans /uploads: ${filename}`);
      }
      
      // 2. Essayer uploads dans dist (ancien système)
      const distPath = join(process.cwd(), 'dist', 'uploads', filename);
      console.log(`[StorageService] Essai /uploads: ${distPath}`);
      
      try {
        const buffer = await fs.readFile(distPath);
        console.log(`[StorageService] Fichier trouvé dans /uploads: ${filename} (${buffer.length} bytes)`);
        return buffer;
      } catch (distError) {
        console.log(`[StorageService] Non trouvé dans /uploads: ${filename}`);
      }
      
      console.log(`[StorageService] Fichier NON trouvé dans tous les emplacements: ${filename}`);
      return null;
    } else {
      // En local, les fichiers sont servis par Express static
      console.log(`[StorageService] Fichier local (servi par Express): ${filename}`);
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
        console.log(`[StorageService] Fichier supprimé de /uploads: ${filename}`);
      } else {
        await fs.unlink(filePath);
        console.log(`[StorageService] Fichier supprimé du disque: ${filename}`);
      }
    } catch (error) {
      console.log(`[StorageService] Erreur suppression (fichier peut ne pas exister):`, error.message);
    }
  }
}
