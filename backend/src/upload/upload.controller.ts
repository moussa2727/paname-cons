// upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { multerConfig } from './multer.config';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('upload')
@Controller('uploads')
export class UploadController {
  constructor(
    private uploadService: UploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = this.uploadService.getFileUrl(file.filename);
    
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      originalName: file.originalname,
      path: fileUrl,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}