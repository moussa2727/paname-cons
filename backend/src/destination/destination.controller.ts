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
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";

// Fonction de validation personnalisée
const validateImageFile = (file: Express.Multer.File): Express.Multer.File => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png', 
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/avif'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Type de fichier non supporté: ${file.mimetype}. Types autorisés: ${allowedTypes.join(', ')}`
    );
  }
  
  return file;
};

@ApiTags("Destinations")
@Controller("destinations")
export class DestinationController {
  private readonly logger = new Logger(DestinationController.name);

  constructor(private readonly destinationService: DestinationService) {}

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
    @UploadedFile() imageFile: Express.Multer.File,
  ) {
    // Validation manuelle du fichier
    validateImageFile(imageFile);
    
    // Validation de la taille
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new BadRequestException('L\'image ne doit pas dépasser 5MB');
    }
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
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    // Validation manuelle du fichier si présent
    if (imageFile) {
      validateImageFile(imageFile);
      
      // Validation de la taille
      if (imageFile.size > 5 * 1024 * 1024) {
        throw new BadRequestException('L\'image ne doit pas dépasser 5MB');
      }
    }
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
    
    return { message: "Destination supprimée avec succès" };
  }
}