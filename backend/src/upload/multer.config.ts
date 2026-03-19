import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
];

const maxFileSize = 5 * 1024 * 1024; // 5MB

/**
 * Config Multer avec memoryStorage pour Cloudinary.
 * file.buffer est disponible → CloudinaryService.uploadFile() peut streamer vers Cloudinary.
 * Aucun fichier n'est écrit sur le disque.
 */
export const multerConfig = {
  storage: memoryStorage(),
  fileFilter: (
    _req: any,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Type de fichier invalide. Types autorisés: JPEG, PNG, WEBP, AVIF, SVG, PDF`,
        ),
        false,
      );
    }
  },
  limits: { fileSize: maxFileSize },
};
