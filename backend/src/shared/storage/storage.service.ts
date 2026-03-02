import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { put, del, head } from '@vercel/blob';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), "uploads");
  private readonly isVercel = process.env.VERCEL === '1';
  private readonly blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  async uploadFile(
    file: Express.Multer.File,
    customName?: string,
  ): Promise<string> {
    const filename = customName || `${Date.now()}-${file.originalname}`;

    if (this.isVercel && this.blobToken) {
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
        throw error;
      }
    } else {
      // Utiliser le système de fichiers local en développement
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }

      const filePath = path.join(this.uploadDir, filename);
      await writeFile(filePath, file.buffer);
      this.logger.log(`Fichier uploadé localement: ${filename}`);
      return filename;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    const cleanFilename = filename.replace(/^uploads\//, "");

    if (this.isVercel && this.blobToken) {
      // Supprimer de Vercel Blob Storage
      try {
        await del(cleanFilename, { token: this.blobToken });
        this.logger.log(`Fichier supprimé de Vercel Blob: ${cleanFilename}`);
      } catch (error) {
        this.logger.error(`Erreur suppression Vercel Blob: ${error.message}`);
      }
    } else {
      // Supprimer du système de fichiers local
      const filePath = path.join(this.uploadDir, cleanFilename);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        this.logger.log(`Fichier supprimé localement: ${cleanFilename}`);
      }
    }
  }

  async getFileBuffer(filename: string): Promise<Buffer | null> {
    const cleanFilename = filename.replace(/^uploads\//, "");

    if (this.isVercel && this.blobToken) {
      // Récupérer depuis Vercel Blob Storage
      try {
        const blob = await head(cleanFilename, { token: this.blobToken });
        if (!blob) {
          return null;
        }

        const response = await fetch(blob.url);
        if (!response.ok) {
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        this.logger.error(`Erreur récupération Vercel Blob: ${error.message}`);
        return null;
      }
    } else {
      // Récupérer du système de fichiers local
      const filePath = path.join(this.uploadDir, cleanFilename);
      if (fs.existsSync(filePath)) {
        return await readFile(filePath);
      }
      return null;
    }
  }

  async getFileUrl(filename: string): Promise<string> {
    const cleanFilename = filename.replace(/^uploads\//, "");

    if (this.isVercel && this.blobToken) {
      // Retourner l'URL publique de Vercel Blob
      try {
        const blob = await head(cleanFilename, { token: this.blobToken });
        return blob?.url || null;
      } catch (error) {
        this.logger.error(`Erreur récupération URL Vercel Blob: ${error.message}`);
        return null;
      }
    } else {
      // Retourner l'URL locale
      const baseUrl = process.env.BASE_URL || 'http://localhost:10000';
      return `${baseUrl}/uploads/${cleanFilename}`;
    }
  }
}
