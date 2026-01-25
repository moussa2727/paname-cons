import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Détecter si on est sur Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION || false;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async uploadFile(
    file: Express.Multer.File,
    customName?: string
  ): Promise<string> {
    // Sur Vercel, on simule l'upload et on retourne un nom de fichier par défaut
    if (isVercel) {
      this.logger.warn(
        'Upload de fichier désactivé sur Vercel - utilisation de fichiers par défaut'
      );
      // Retourner un nom de fichier existant dans le dossier uploads
      const existingFiles = [
        'algerie.png',
        'chine.jpg',
        'france.svg',
        'maroc.webp',
        'russie.png',
        'turquie.webp',
      ];
      return existingFiles[Math.floor(Math.random() * existingFiles.length)];
    }

    // Mode local normal
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const filename = customName || `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, filename);

    await writeFile(filePath, file.buffer);
    return filename; // Retourne seulement le nom du fichier
  }

  async deleteFile(filename: string): Promise<void> {
    // Sur Vercel, on ne fait rien (pas de suppression de fichiers)
    if (isVercel) {
      this.logger.warn('Suppression de fichier désactivée sur Vercel');
      return;
    }

    // Mode local normal
    // Supprime le préfixe 'uploads/' s'il existe
    const cleanFilename = filename.replace(/^uploads\//, '');
    const filePath = path.join(this.uploadDir, cleanFilename);

    if (fs.existsSync(filePath)) {
      await unlink(filePath);
    }
  }
}
