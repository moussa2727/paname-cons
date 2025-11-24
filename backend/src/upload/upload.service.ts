import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

  getFileUrl(filename: string): string {
    const baseUrl = this.configService.get("BASE_URL");

    // Validation critique
    if (!baseUrl) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    // Nettoyage de l'URL
    const cleanedBaseUrl = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;

    return `${cleanedBaseUrl}/uploads/${filename}`;
  }
}
