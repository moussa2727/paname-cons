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
  FileTypeValidator,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
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
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";
import { StorageService } from "../shared/storage/storage.service";

@ApiTags("Destinations")
@Controller("destinations")
export class DestinationController {
  private readonly logger = new Logger(DestinationController.name);

  constructor(
    private readonly destinationService: DestinationService,
    private readonly storageService: StorageService,
  ) {}

  private validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non supporté: ${file.mimetype}. Types acceptés: ${allowedMimeTypes.join(', ')}`
      );
    }
  }

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
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    imageFile: Express.Multer.File,
  ) {
    this.validateImageFile(imageFile);
    this.logger.log(`Création d'une nouvelle destination: ${createDestinationDto.country}`);
    
    const filename = await this.storageService.uploadFile(imageFile);
    
    const destination = await this.destinationService.create(
      createDestinationDto, 
      filename
    );
    
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
  @ApiOperation({ summary: "Mettre à jour une destination" })
  async update(
    @Param("id") id: string,
    @Body() updateDestinationDto: any,
  ) {
    this.logger.log(`Début mise à jour destination ID: ${id}`);
    this.logger.log(`Données reçues: ${JSON.stringify(updateDestinationDto)}`);
    
    try {
      // Convertir les données si nécessaire
      const cleanDto: UpdateDestinationDto = {};
      if (updateDestinationDto.country) {
        cleanDto.country = updateDestinationDto.country;
      }
      if (updateDestinationDto.text) {
        cleanDto.text = updateDestinationDto.text;
      }
      
      this.logger.log(`Données nettoyées: ${JSON.stringify(cleanDto)}`);
      this.logger.log(`Appel du service update...`);
      
      const destination = await this.destinationService.update(
        id,
        cleanDto,
        undefined, // Pas de fichier pour l'instant
      );
      this.logger.log(`Destination mise à jour avec succès: ${destination.country}`);
      
      return destination;
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour: ${error.message}`, error.stack);
      throw error;
    }
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
    
    return { message: "Destination supprimée avec succès" };
  }
}