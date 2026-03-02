import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  MaxFileSizeValidator,
  Logger,
  NotFoundException,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { UserRole } from "../schemas/user.schema";
import { Roles } from "../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../shared/guards/roles.guard";
import { DestinationService } from "./destination.service";
import { StorageService } from "../shared/storage/storage.service";
import { UrlService } from "../shared/utils/url.service";
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";

import { FileValidator } from '@nestjs/common';

// Validation personnalisée pour les types d'images
class ImageFileTypeValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file: Express.Multer.File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      'image/avif'
    ];
    return allowedTypes.includes(file.mimetype);
  }
  
  buildErrorMessage(): string {
    return 'Le fichier doit être une image valide (JPEG, PNG, JPG, SVG, WEBP, GIF, AVIF)';
  }
}

@ApiTags("Destinations")
@Controller("destinations")
export class DestinationController {
  private readonly logger = new Logger(DestinationController.name);

  constructor(
    private readonly destinationService: DestinationService,
    private readonly storageService: StorageService,
    private readonly urlService: UrlService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Créer une nouvelle destination" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateDestinationDto })
  @ApiResponse({ status: 201, description: "Destination créée avec succès" })
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new ImageFileTypeValidator(),
        ],
      }),
    )
    imageFile: Express.Multer.File,
  ) {
    this.logger.log(`Création d'une nouvelle destination: ${createDestinationDto.country}`);
    
    const destination = await this.destinationService.create(createDestinationDto, imageFile);
    
    this.logger.log(`Destination créée avec succès: ${destination.country} (ID: ${destination._id})`);
    
    return destination;
  }

  @Get()
  @ApiOperation({ summary: "Récupérer la liste des destinations" })
  @ApiResponse({ status: 200, description: "Liste des destinations" })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
  ) {
    this.logger.log(`Récupération des destinations - Page: ${page}, Limit: ${limit}, Search: ${search || 'aucun'}`);
    
    const result = await this.destinationService.findAll(page, limit, search);
    
    this.logger.log(`Récupération réussie: ${result.data.length} destinations sur ${result.total} total`);
    
    return result;
  }

  @Get("all")
  @ApiOperation({
    summary: "Récupérer toutes les destinations (sans pagination)",
  })
  async findAllWithoutPagination() {
    this.logger.log(`Récupération de toutes les destinations sans pagination`);
    
    const destinations = await this.destinationService.findAllWithoutPagination();
    
    this.logger.log(`Récupération réussie: ${destinations.length} destinations total`);
    
    return destinations;
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une destination par ID" })
  @ApiResponse({ status: 200, description: "Destination trouvée" })
  @ApiResponse({ status: 404, description: "Destination non trouvée" })
  async findOne(@Param("id") id: string) {
    this.logger.log(`Recherche de la destination avec ID: ${id}`);
    
    const destination = await this.destinationService.findOne(id);
    
    this.logger.log(`Destination trouvée: ${destination.country} (ID: ${id})`);
    
    return destination;
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Mettre à jour une destination" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateDestinationDto })
  async update(
    @Param("id") id: string,
    @Body() updateDestinationDto: UpdateDestinationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new ImageFileTypeValidator(),
        ],
        fileIsRequired: false,
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    this.logger.log(`Mise à jour de la destination ID: ${id}`);
    
    // Vérifier qu'au moins un champ est fourni
    if (Object.keys(updateDestinationDto).length === 0 && !imageFile) {
      this.logger.warn(`Tentative de mise à jour sans données pour la destination ID: ${id}`);
      throw new BadRequestException("Aucune donnée à mettre à jour fournie");
    }

    const destination = await this.destinationService.update(id, updateDestinationDto, imageFile);
    
    this.logger.log(`Destination mise à jour avec succès: ${destination.country} (ID: ${id})`);
    
    return destination;
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Supprimer une destination" })
  @ApiResponse({ status: 200, description: "Destination supprimée" })
  @ApiResponse({ status: 404, description: "Destination non trouvée" })
  async remove(@Param("id") id: string) {
    this.logger.log(`Suppression de la destination ID: ${id}`);
    
    const result = await this.destinationService.remove(id);
    
    this.logger.log(`Destination supprimée avec succès: ${result.deletedDestination.country} (ID: ${id})`);
    
    return result;
  }

  @Get("uploads/:filename")
  @ApiOperation({ summary: "Servir les fichiers uploadés" })
  @ApiResponse({ status: 200, description: "Fichier retourné" })
  @ApiResponse({ status: 404, description: "Fichier non trouvé" })
  async serveUpload(@Param("filename") filename: string, @Res({ passthrough: true }) res: any) {
    try {
      // Nettoyer le filename pour enlever uploads/ si présent
      const cleanFilename = this.urlService.normalizeFilePath(filename);
      this.logger.log(`[DestinationController] Demande du fichier: ${cleanFilename}`);
      
      // Toujours essayer le buffer local (que ce soit en local ou sur Vercel)
      const buffer = await this.storageService.getFileBuffer(cleanFilename);
      if (!buffer) {
        throw new NotFoundException('Fichier non trouvé');
      }
      
      // Déterminer le type MIME
      const ext = cleanFilename.split('.').pop()?.toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'gif': 'image/gif',
        'avif': 'image/avif'
      };
      
      const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
      
      res.set({
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000'
      });
      
      return buffer;
    } catch (error) {
      this.logger.error(`Erreur serving file ${filename}: ${error.message}`);
      throw error;
    }
  }
}