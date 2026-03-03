// destination.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DestinationService } from './destination.service';
import { StorageService } from '../shared/storage/storage.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { multerConfig } from '../upload/multer.config';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationController {
  constructor(
    private readonly destinationService: DestinationService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateDestinationDto,
  })
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Si pas de fichier uploadé, utiliser l'image par défaut
    if (!file && !createDestinationDto.imagePath) {
      throw new BadRequestException('Une image est requise');
    }

    const destination = await this.destinationService.create(
      createDestinationDto,
      file,
    );

    return {
      ...destination.toObject(),
      imageUrl: this.storageService.getFileUrl(destination.imagePath),
    };
  }



  @Get('all')
  async findAllWithoutPagination() {
    const destinations = await this.destinationService.findAll();
    
    return destinations.map(dest => ({
      ...dest.toObject(),
      imageUrl: this.storageService.getFileUrl(dest.imagePath),
    }));
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche' })
  async search(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    
    const destinations = await this.destinationService.searchByCountry(query);
    return destinations.map(dest => ({
      ...dest.toObject(),
      imageUrl: this.storageService.getFileUrl(dest.imagePath),
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const destination = await this.destinationService.findOne(id);
    
    return {
      ...destination.toObject(),
      imageUrl: this.storageService.getFileUrl(destination.imagePath),
    };
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id') id: string,
    @Body() updateDestinationDto: UpdateDestinationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updated = await this.destinationService.update(
      id,
      updateDestinationDto,
      file,
    );

    return {
      ...updated.toObject(),
      imageUrl: this.storageService.getFileUrl(updated.imagePath),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.destinationService.remove(id);
    return { message: 'Destination supprimée avec succès' };
  }

  @Post('cleanup-images')
  async cleanupImages() {
    const deletedFiles = await this.destinationService.cleanupOrphanedImages();
    return {
      message: `${deletedFiles.length} fichiers orphelins supprimés`,
      deletedFiles,
    };
  }
}