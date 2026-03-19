import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from './multer.config';
import { ApiConsumes, ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@ApiTags('upload')
@Controller('uploads')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier uploadé');

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'documents',
    });

    return {
      message: 'Fichier uploadé avec succès',
      publicId: result.publicId,
      url: result.url,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('profile')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @UseInterceptors(FileInterceptor('profile', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profile: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadProfilePicture(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucune image uploadée');

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'profiles',
      transformations: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      message: 'Photo de profil uploadée avec succès',
      publicId: result.publicId,
      url: result.url,
    };
  }
}
