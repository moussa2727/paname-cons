import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { multerConfig } from "./multer.config";
import { UploadService } from "./upload.service";

@Controller("/upload")
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image", multerConfig))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      // Validation renforcée
      if (!file) {
        throw new HttpException(
          "Aucun fichier téléchargé ou format invalide",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Log important pour le débogage
      this.logger.log(
        `Upload réussi: ${file.originalname} -> ${file.filename}`,
      );

      return {
        success: true,
        url: this.uploadService.getFileUrl(file.filename),
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      // Journalisation détaillée
      this.logger.error(`Échec de l'upload: ${error.message}`, error.stack);

      throw new HttpException(
        error.message || "Erreur lors du traitement du fichier",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
