import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { put, del, head } from '@vercel/blob';
import { UrlService } from '../utils/url.service';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), "uploads");
  private readonly isVercel = process.env.VERCEL === '1';
  private readonly blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  private readonly hasValidBlobToken: boolean;

  constructor(private readonly urlService: UrlService) {
    // Vérifier si le token est valide au démarrage
    this.hasValidBlobToken = this.isVercel && 
      this.blobToken && 
      this.blobToken.length > 50 && // Token Vercel Blob est très long
      !this.blobToken.includes('votre_blob_token'); // Éviter les tokens de démo
    
    if (this.isVercel) {
      this.logger.log(`Vercel détecté: ${this.isVercel}`);
      this.logger.log(`Token Blob présent: ${!!this.blobToken}`);
      this.logger.log(`Token Blob valide: ${this.hasValidBlobToken}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    const filename = customName || `${Date.now()}-${file.originalname}`;

    if (this.isVercel && this.hasValidBlobToken) {
      // Utiliser Vercel Blob Storage en production
      try {
        const blob = await put(filename, file.buffer, {
          access: 'public',
          token: this.blobToken,
        });
        this.logger.log(`Fichier uploadé sur Vercel Blob: ${blob.url}`);
        return filename;
      } catch (error) {
        this.logger.error(`Erreur upload Vercel Blob: ${error.message}`);
        // Fallback: utiliser le système de fichiers local même sur Vercel
        this.logger.warn(`Fallback vers système de fichiers local pour: ${filename}`);
        return this.uploadFileLocal(file, filename);
      }
    } else {
      // Utiliser le système de fichiers local
      return this.uploadFileLocal(file, filename);
    }
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

    if (this.isVercel && this.hasValidBlobToken) {
      // Supprimer de Vercel Blob Storage
      try {
        await del(cleanFilename, { token: this.blobToken });
        this.logger.log(`Fichier supprimé de Vercel Blob: ${cleanFilename}`);
      } catch (error) {
        this.logger.error(`Erreur suppression Vercel Blob: ${error.message}`);
        // Continuer avec la suppression locale même si Vercel Blob échoue
      }
    }

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

    if (this.isVercel && this.hasValidBlobToken) {
      // Sur Vercel avec token valide, essayer Vercel Blob
      try {
        const blob = await head(cleanFilename, { token: this.blobToken });
        if (!blob) {
          // Fallback vers fichiers locaux
          return this.getFileBufferLocal(cleanFilename);
        }

        const response = await fetch(blob.url);
        if (!response.ok) {
          // Fallback vers fichiers locaux
          return this.getFileBufferLocal(cleanFilename);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        this.logger.error(`Erreur récupération Vercel Blob: ${error.message}`);
        // Fallback vers fichiers locaux
        return this.getFileBufferLocal(cleanFilename);
      }
    } else {
      // Toujours utiliser les fichiers locaux (que ce soit en local ou sur Vercel sans token)
      return this.getFileBufferLocal(cleanFilename);
    }
  }

  private async getFileBufferLocal(cleanFilename: string): Promise<Buffer | null> {
    // Chemin différent selon l'environnement
    const filePath = this.isVercel 
      ? path.join(process.cwd(), 'dist', 'uploads', cleanFilename)  // Sur Vercel, fichiers dans dist/
      : path.join(this.uploadDir, cleanFilename);                 // En local, fichiers dans uploads/
    
    if (fs.existsSync(filePath)) {
      return await readFile(filePath);
    }
    return null;
  }

  async getFileUrl(filename: string): Promise<string> {
    // Utiliser le UrlService pour générer l'URL complète de l'API
    // Ne pas essayer de récupérer l'URL blob directement
    return this.urlService.getImageUrl(filename);
  }

  /**
   * Obtenir l'URL complète pour une image (méthode utilitaire)
   */
  getFullImageUrl(filename: string): string {
    return this.urlService.getImageUrl(filename);
  }
}
