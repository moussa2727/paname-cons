import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface CloudinaryTransformation {
  quality?: string | number;
  fetch_format?: string;
  gravity?: string;
  crop?: string;
  width?: number;
  height?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformations?: CloudinaryTransformation[];
}

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  [key: string]: unknown;
}

export interface CloudinaryUploadResponse extends CloudinaryResource {
  [key: string]: unknown;
}

export interface CloudinaryDeleteResponse {
  result: string;
  [key: string]: unknown;
}

export interface CloudinaryResourcesResponse {
  resources: CloudinaryResource[];
  [key: string]: unknown;
}

export interface CloudinaryUsageResponse {
  credits?: {
    usage?: number;
    [key: string]: unknown;
  };
  objects?: {
    usage?: number;
    [key: string]: unknown;
  };
  bandwidth?: {
    usage?: number;
    [key: string]: unknown;
  };
  storage?: {
    usage?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CloudinaryStats {
  credits?: number;
  objects?: number;
  bandwidth?: number;
  storage?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      url: this.configService.get<string>('CLOUDINARY_URL'),
      secure: true,
    });
  }

  /**
   * Upload un fichier vers Cloudinary
   */
  async uploadFile(
    file: Express.Multer.File,
    options?: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult> {
    try {
      const folder = options?.folder || 'destinations';
      const publicId = `dest-${Date.now()}-${Math.round(Math.random() * 1000)}`;

      const result = await new Promise<CloudinaryUploadResponse>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              folder,
              public_id: publicId,
              transformation: options?.transformations || [
                { quality: 'auto' },
                { fetch_format: 'auto' },
                { gravity: 'face' },
                { crop: 'fill' },
              ],
            },
            (error, result) => {
              if (error) {
                reject(error as Error);
              } else if (result) {
                resolve(result as CloudinaryUploadResponse);
              } else {
                reject(new Error('No result from Cloudinary'));
              }
            },
          );

          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          readableStream.pipe(uploadStream);
        },
      );

      if (!result?.secure_url) {
        throw new Error("Échec de l'upload Cloudinary");
      }

      this.logger.log('Fichier uploadé');

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      this.logger.error('Erreur upload');
      throw error;
    }
  }

  /**
   * Résout intelligemment l'URL d'une image :
   * - URL complète (http/https)   → retournée telle quelle
   * - /images/...                 → chemin relatif (servi par frontend /public)
   * - /uploads/...                → préfixé BASE_URL (backend static)
   * - public_id Cloudinary        → URL Cloudinary (fetch_format évite le .auto)
   */
  getFileUrl(
    imagePath: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
    },
  ): string {
    if (!imagePath) return '';

    // Déjà une URL complète → tel quel
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Images statiques frontend (/images/...) → chemin relatif
    // Servies par Vite depuis /public — le backend n'est pas impliqué
    if (imagePath.startsWith('/images/')) {
      return imagePath;
    }

    // Fichiers uploadés locaux (/uploads/...) → préfixés BASE_URL backend
    if (imagePath.startsWith('/uploads/')) {
      const baseUrl = this.configService.get<string>(
        'BASE_URL',
        'http://localhost:10000',
      );
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBase}${imagePath}`;
    }

    // Public ID Cloudinary → URL Cloudinary
    // fetch_format au lieu de format pour éviter "algerie.png.auto"
    return cloudinary.url(imagePath, {
      secure: true,
      width: options?.width,
      height: options?.height,
      crop: options?.crop || 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = (await cloudinary.uploader.destroy(
        publicId,
      )) as CloudinaryDeleteResponse;
      const success = result.result === 'ok';
      if (success) {
        this.logger.log('Fichier supprimé');
      } else {
        this.logger.warn('Fichier non trouvé');
      }
      return success;
    } catch {
      this.logger.error('Erreur suppression');
      return false;
    }
  }

  async fileExists(publicId: string): Promise<boolean> {
    try {
      const result = (await cloudinary.api.resource(
        publicId,
      )) as CloudinaryResource;
      return !!result;
    } catch {
      return false;
    }
  }

  async cleanupOrphanedFiles(validPublicIds: string[]): Promise<string[]> {
    try {
      const response = (await cloudinary.api.resources({
        type: 'upload',
        prefix: 'dest-',
        max_results: 500,
      })) as CloudinaryResourcesResponse;

      const resources = response.resources || [];
      const allIds = resources.map((r: CloudinaryResource) => r.public_id);
      const orphanedIds = allIds.filter((id) => !validPublicIds.includes(id));

      for (const id of orphanedIds) {
        await this.deleteFile(id);
      }

      this.logger.log('Fichiers orphelins supprimés');
      return orphanedIds;
    } catch {
      this.logger.error('Erreur nettoyage');
      return [];
    }
  }

  async getStats(): Promise<CloudinaryStats | null> {
    try {
      const usage = (await cloudinary.api.usage()) as CloudinaryUsageResponse;
      return {
        credits: usage.credits?.usage,
        objects: usage.objects?.usage,
        bandwidth: usage.bandwidth?.usage,
        storage: usage.storage?.usage,
      };
    } catch {
      this.logger.error('Erreur stats');
      return null;
    }
  }
}
