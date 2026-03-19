import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

  getFileUrl(filename: string, subDir?: string): string {
    const baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:10000',
    );
    const cleanedBaseUrl = baseUrl?.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;

    if (subDir) {
      return `${cleanedBaseUrl}/uploads/${subDir}/${filename}`;
    }
    return `${cleanedBaseUrl}/uploads/${filename}`;
  }

  getFilePath(filename: string, subDir?: string): string {
    const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    const basePath = path.resolve(process.cwd(), uploadDir);

    if (subDir) {
      return path.join(basePath, subDir, filename);
    }
    return path.join(basePath, filename);
  }

  async deleteFile(filename: string, subDir?: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename, subDir);
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async fileExists(filename: string, subDir?: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename, subDir);
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOrphanedFiles(
    validFilenames: string[],
    subDir?: string,
  ): Promise<string[]> {
    try {
      const uploadDir = this.getFilePath('', subDir);
      const files = await fs.promises.readdir(uploadDir);
      const orphanedFiles = files.filter(
        (file) => !validFilenames.includes(file) && file !== '.gitkeep',
      );

      for (const file of orphanedFiles) {
        await this.deleteFile(file, subDir);
      }

      return orphanedFiles;
    } catch {
      return [];
    }
  }
}
