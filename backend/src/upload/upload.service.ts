// upload.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

  /**
   * Generate a public URL for an uploaded file
   */
  getFileUrl(filename: string): string {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:10000');
    const cleanedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanedBaseUrl}/uploads/${filename}`;
  }

  /**
   * Get the absolute path to the upload directory
   */
  getUploadPath(filename?: string): string {
    const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    const absolutePath = path.resolve(process.cwd(), uploadDir);
    
    if (filename) {
      return path.join(absolutePath, filename);
    }
    return absolutePath;
  }

  /**
   * Delete a file from the upload directory
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const filePath = this.getUploadPath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Check if upload directory exists, create if it doesn't
   */
  ensureUploadDirectory(): void {
    const uploadPath = this.getUploadPath();
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  }
}