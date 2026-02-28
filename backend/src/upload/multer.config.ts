import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

// Vérifier et créer le dossier uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
export const multerConfig = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (
    _req: any,
    file: { mimetype: string; originalname: string },
    cb: (arg0: Error | null, arg1: boolean) => void,
  ) => {
    // Validation par extension
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExts = [".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg", ".gif", ".bmp", ".tiff", ".ico"];
    
    // Validation par MIME type (double sécurité)
    const validMimeTypes = [
      'image/webp', 'image/png', 'image/jpeg', 'image/jpg', 
      'image/avif', 'image/svg+xml', 'image/gif', 'image/bmp', 
      'image/tiff', 'image/x-icon', 'image/vnd.microsoft.icon'
    ];

    const isValidExt = imageExts.includes(ext);
    const isValidMime = validMimeTypes.includes(file.mimetype);

    if (isValidExt && isValidMime) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Type de fichier non supporté: ${ext} (${file.mimetype}). ` +
          `Formats acceptés: ${imageExts.join(', ')}`
        ), 
        false
      );
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};