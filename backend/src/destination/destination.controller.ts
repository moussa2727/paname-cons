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
  FileTypeValidator,
  MaxFileSizeValidator,
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

@ApiTags("Destinations")
@Controller("destinations")
export class DestinationController {
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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: "image/*" }),
        ],
      }),
    )
    imageFile: Express.Multer.File,
  ) {
    return this.destinationService.create(createDestinationDto, imageFile);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer la liste des destinations" })
  @ApiResponse({ status: 200, description: "Liste des destinations" })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
  ) {
    return this.destinationService.findAll(page, limit, search);
  }

  @Get("all")
  @ApiOperation({
    summary: "Récupérer toutes les destinations (sans pagination)",
  })
  async findAllWithoutPagination() {
    return this.destinationService.findAllWithoutPagination();
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une destination par ID" })
  @ApiResponse({ status: 200, description: "Destination trouvée" })
  @ApiResponse({ status: 404, description: "Destination non trouvée" })
  async findOne(@Param("id") id: string) {
    return this.destinationService.findOne(id);
  }

  @Put(":id")
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
          new FileTypeValidator({ fileType: "image/*" }),
        ],
        fileIsRequired: false,
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    // Vérifier qu'au moins un champ est fourni
    if (Object.keys(updateDestinationDto).length === 0 && !imageFile) {
      throw new BadRequestException("Aucune donnée à mettre à jour fournie");
    }

    return this.destinationService.update(id, updateDestinationDto, imageFile);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Supprimer une destination" })
  @ApiResponse({ status: 200, description: "Destination supprimée" })
  @ApiResponse({ status: 404, description: "Destination non trouvée" })
  async remove(@Param("id") id: string) {
    await this.destinationService.remove(id);
    return { message: "Destination supprimée avec succès" };
  }
}
