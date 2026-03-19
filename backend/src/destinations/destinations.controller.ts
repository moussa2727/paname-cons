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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DestinationService } from './destinations.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { multerConfig } from '../upload/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Logger } from '@nestjs/common';

@ApiTags('destinations')
@Controller('')
export class DestinationController {
  private readonly logger = new Logger(DestinationController.name);

  constructor(
    private readonly destinationService: DestinationService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── ROUTES PUBLIQUES ────────────────────────────────────────────────────────

  @Get('destinations/all')
  @Public()
  async findAllWithoutPagination() {
    this.logger.log('Recherche destinations');
    const destinations = await this.destinationService.findAll();
    return destinations.map((dest) => ({
      ...dest,
      imageUrl: this.cloudinaryService.getFileUrl(dest.imagePath),
    }));
  }

  @Get('destinations/search')
  @Public()
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche' })
  async search(@Query('q') query: string) {
    if (!query) return [];
    const destinations = await this.destinationService.searchByCountry(query);
    return destinations.map((dest) => ({
      ...dest,
      imageUrl: this.cloudinaryService.getFileUrl(dest.imagePath),
    }));
  }

  // ── ROUTES ADMIN ────────────────────────────────────────────────────────────

  @Post('admin/destinations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateDestinationDto })
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file && !createDestinationDto.imagePath) {
      throw new BadRequestException('Une image est requise');
    }
    const destination = await this.destinationService.create(
      createDestinationDto,
      file,
    );
    this.logger.log('Destination créée');
    return {
      ...destination,
      imageUrl: this.cloudinaryService.getFileUrl(destination.imagePath),
    };
  }

  @Get('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    const destination = await this.destinationService.findOne(id);
    this.logger.log('Destination trouvée');
    return {
      ...destination,
      imageUrl: this.cloudinaryService.getFileUrl(destination.imagePath),
    };
  }

  @Put('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
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
    this.logger.log('Destination mise à jour');
    return {
      ...updated,
      imageUrl: this.cloudinaryService.getFileUrl(updated.imagePath),
    };
  }

  @Delete('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    await this.destinationService.remove(id);
    this.logger.log('Destination supprimée');
    return { message: 'Destination supprimée avec succès' };
  }

  @Post('admin/destinations/cleanup-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async cleanupImages() {
    const deletedFiles = await this.destinationService.cleanupOrphanedImages();
    this.logger.log('Fichiers orphelins supprimés');
    this.logger.log('Fichiers orphelins supprimés');
    return {
      message: `${deletedFiles.length} fichiers orphelins supprimés`,
      deletedFiles,
    };
  }
}
