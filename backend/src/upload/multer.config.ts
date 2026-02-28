import { diskStorage, memoryStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

// Détection environnement Vercel
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

// Configuration pour développement local
let uploadDir: string;
if (!isVercel && !isProduction) {
  uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export const multerConfig = {
  storage: isVercel || isProduction 
    ? memoryStorage() // Stockage en mémoire pour Vercel
    : diskStorage({ // Stockage disque pour développement
        destination: (_req, _file, cb) => {
          cb(null, uploadDir!);
        },
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
  fileFilter: (
    _req: any,
    file: { originalname: string; mimetype?: string },
    cb: (arg0: Error | null, arg1: boolean) => void,
  ) => {
    // Vérification par extension ET par MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype?.toLowerCase() || '';
    
    const allowedExts = [".webp", ".png", ".jpg", ".jpeg", ".avif"];
    const allowedMimes = ["image/webp", "image/png", "image/jpeg", "image/jpg", "image/avif"];

    const isValidExt = allowedExts.includes(ext);
    const isValidMime = allowedMimes.includes(mimetype);

    if (isValidExt && isValidMime) {
      cb(null, true);
    } else {
      const error = new Error(`Type de fichier non supporté: ${ext} (${mimetype})`);
      cb(error, false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};