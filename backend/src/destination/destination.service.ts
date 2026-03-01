import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { StorageService } from "../shared/storage/storage.service";
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";
import { Destination } from "../schemas/destination.schema";

const defaultDestinations = [
  {
    country: "Russie",
    imagePath: "/images/russie.png",
    text: "La Russie propose un enseignement supérieur d'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel.",
  },
  {
    country: "Chine",
    imagePath: "/images/chine.jpg",
    text: "La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales.",
  },
  {
    country: "Maroc",
    imagePath: "/images/maroc.webp",
    text: "Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d'échange avec l'Europe.",
  },
  {
    country: "Algérie",
    imagePath: "/images/algerie.png",
    text: "L'Algérie dispose d'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes.",
  },
  {
    country: "Turquie",
    imagePath: "/images/turquie.webp",
    text: "La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie.",
  },
  {
    country: "France",
    imagePath: "/images/france.svg",
    text: "La France maintient sa tradition d'excellence académique avec des universités historiques et grandes écoles renommées. Système éducatif diversifié offrant des formations pointues.",
  },
];

@Injectable()
export class DestinationService {
  private readonly logger = new Logger(DestinationService.name);

  constructor(
    @InjectModel(Destination.name)
    private readonly destinationModel: Model<Destination>,
    private readonly storageService: StorageService,
  ) {
    this.initializeDefaultDestinations();
  }

  /**
   * Initialise les destinations par défaut si la base est vide
   */
  private async initializeDefaultDestinations(): Promise<void> {
    try {
      const count = await this.destinationModel.countDocuments();
      if (count === 0) {
        this.logger.log("Initialisation des destinations par défaut");
        await this.destinationModel.insertMany(defaultDestinations);
        this.logger.log(`${defaultDestinations.length} destinations par défaut créées`);
      }
    } catch (error) {
      this.logger.error("Erreur lors de l'initialisation des destinations par défaut", error);
    }
  }

  /**
   * Créer une nouvelle destination (Admin seulement)
   */
  async create(
    createDestinationDto: CreateDestinationDto,
    imageFile: Express.Multer.File,
  ): Promise<Destination> {
    try {
      this.logger.log(`Création d'une nouvelle destination: ${createDestinationDto.country}`);

      // Validation des données
      if (!createDestinationDto.country?.trim()) {
        throw new BadRequestException("Le pays est obligatoire");
      }

      if (!createDestinationDto.text?.trim()) {
        throw new BadRequestException("La description est obligatoire");
      }

      if (createDestinationDto.text.length < 10 || createDestinationDto.text.length > 2000) {
        throw new BadRequestException(
          "La description doit contenir entre 10 et 2000 caractères"
        );
      }

      // Vérifier si la destination existe déjà
      const existingDestination = await this.destinationModel.findOne({
        country: createDestinationDto.country.trim(),
      });

      if (existingDestination) {
        this.logger.warn(`Destination déjà existante: ${createDestinationDto.country}`);
        throw new ConflictException("Cette destination existe déjà");
      }

      // Gestion de l'image
      let imagePath: string;
      
      if (imageFile) {
        const fileName = await this.storageService.uploadFile(imageFile);
        imagePath = `uploads/${fileName}`;
        this.logger.log(`Image uploadée utilisée pour ${createDestinationDto.country}: ${imagePath}`);
      } else {
        throw new BadRequestException("L'image est obligatoire pour créer une destination");
      }

      // Création de la destination
      const createdDestination = new this.destinationModel({
        country: createDestinationDto.country.trim(),
        text: createDestinationDto.text.trim(),
        imagePath,
      });

      const savedDestination = await createdDestination.save();

      this.logger.log(`Destination créée: ${savedDestination.country} (ID: ${savedDestination._id})`);
      return savedDestination;
    } catch (error) {
      this.logger.error(`Erreur création destination ${createDestinationDto.country}: ${error.message}`, error.stack);

      // Nettoyage en cas d'erreur - pas de nettoyage complexe nécessaire
      this.logger.log("Nettoyage en cas d'erreur de création");

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Erreur lors de la création de la destination",
      );
    }
  }

  /**
   * Mettre à jour une destination (Admin seulement)
   */
  async update(
    id: string,
    updateDestinationDto: UpdateDestinationDto,
    imageFile?: Express.Multer.File,
  ): Promise<Destination> {
    this.logger.log(`Tentative mise à jour destination: ${id}`);

    try {
      // Validation de l'ID
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      // Vérifier que la destination existe
      const existingDestination = await this.destinationModel.findById(id);
      if (!existingDestination) {
        this.logger.warn(`Destination non trouvée pour mise à jour: ${id}`);
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      // Vérifier s'il y a des données à mettre à jour
      const hasUpdateData =
        Object.keys(updateDestinationDto).length > 0 || imageFile;
      if (!hasUpdateData) {
        throw new BadRequestException("Aucune donnée à mettre à jour fournie");
      }

      // Vérifier la collision de nom si le pays est modifié
      if (
        updateDestinationDto.country &&
        updateDestinationDto.country.trim() !== existingDestination.country
      ) {
        const countryConflict = await this.destinationModel.findOne({
          country: updateDestinationDto.country.trim(),
          _id: { $ne: id },
        });

        if (countryConflict) {
          this.logger.warn(`Conflit de nom pour la destination: ${updateDestinationDto.country}`);
          throw new ConflictException(
            "Une destination avec ce nom existe déjà",
          );
        }
      }

      let imagePath = existingDestination.imagePath;
      let oldImagePath: string | null = null;

      // Gestion de la nouvelle image
      if (imageFile) {
        const fileName = await this.storageService.uploadFile(imageFile);
        imagePath = `uploads/${fileName}`;
        this.logger.log(`Image uploadée utilisée pour mise à jour: ${imagePath}`);

        // Marquer l'ancienne image pour suppression
        oldImagePath = existingDestination.imagePath;
      }

      // Préparation des données de mise à jour
      const updateData: any = {};

      if (updateDestinationDto.country) {
        updateData.country = updateDestinationDto.country.trim();
      }

      if (updateDestinationDto.text) {
        updateData.text = updateDestinationDto.text.trim();
      }

      if (imageFile) {
        updateData.imagePath = imagePath;
      }

      // Mise à jour de la destination
      const updatedDestination = await this.destinationModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedDestination) {
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      // Supprimer l'ancienne image si une nouvelle a été uploadée
      if (oldImagePath && oldImagePath.startsWith('uploads/')) {
        try {
          await this.storageService.deleteFile(oldImagePath);
          this.logger.log(`Ancienne image supprimée: ${oldImagePath}`);
        } catch (cleanupError) {
          this.logger.error("Erreur suppression ancienne image:", cleanupError.stack);
        }
      }

      this.logger.log(
        `Destination mise à jour: ${updatedDestination.country} (ID: ${id})`,
      );
      return updatedDestination;
    } catch (error) {
      this.logger.error(
        `Erreur mise à jour destination ${id}: ${error.message}`,
        error.stack,
      );

      // Nettoyage en cas d'erreur - pas de nettoyage complexe nécessaire
      this.logger.log("Nettoyage en cas d'erreur de mise à jour");

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Erreur lors de la mise à jour de la destination",
      );
    }
  }

  /**
   * Supprimer une destination (Admin seulement)
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`Tentative suppression destination: ${id}`);

    try {
      // Validation de l'ID
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      const destination = await this.destinationModel.findById(id);
      if (!destination) {
        this.logger.warn(`Destination non trouvée pour suppression: ${id}`);
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      // Supprimer l'image associée si elle existe
      if (destination.imagePath && destination.imagePath.startsWith('uploads/')) {
        try {
          await this.storageService.deleteFile(destination.imagePath);
          this.logger.log(`Image supprimée: ${destination.imagePath}`);
        } catch (cleanupError) {
          this.logger.error("Erreur suppression image:", cleanupError.stack);
        }
      }

      // Supprimer la destination
      await this.destinationModel.findByIdAndDelete(id);

      this.logger.log(`Destination supprimée: ${destination.country} (ID: ${id})`);
    } catch (error) {
      this.logger.error(`Erreur suppression destination ${id}: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Erreur lors de la suppression de la destination",
      );
    }
  }

  /**
   * Récupérer toutes les destinations avec pagination (Public)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    destinations: Destination[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Construire le filtre de recherche
      let filter: any = {};
      if (search) {
        filter = {
          $or: [
            { country: { $regex: search, $options: 'i' } },
            { text: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const [destinations, total] = await Promise.all([
        this.destinationModel
          .find(filter)
          .sort({ country: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.destinationModel.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Récupération de ${destinations.length} destinations (page ${page}/${totalPages})`);

      return {
        destinations,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Erreur récupération destinations: ${error.message}`, error.stack);
      throw new InternalServerErrorException("Erreur lors de la récupération des destinations");
    }
  }

  /**
   * Récupérer toutes les destinations sans pagination (Public)
   */
  async findAllWithoutPagination(): Promise<Destination[]> {
    try {
      this.logger.log(`Récupération de toutes les destinations sans pagination`);
      
      const destinations = await this.destinationModel
        .find()
        .sort({ country: 1 })
        .lean();
      
      this.logger.log(`Récupération réussie: ${destinations.length} destinations total`);
      
      return destinations;
    } catch (error) {
      this.logger.error(`Erreur récupération toutes destinations: ${error.message}`, error.stack);
      throw new InternalServerErrorException("Erreur lors de la récupération des destinations");
    }
  }

  /**
   * Récupérer une destination par ID (Public)
   */
  async findOne(id: string): Promise<Destination> {
    try {
      // Validation de l'ID
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      const destination = await this.destinationModel.findById(id).lean();
      
      if (!destination) {
        this.logger.warn(`Destination non trouvée: ${id}`);
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      this.logger.log(`Destination trouvée: ${destination.country} (ID: ${id})`);
      return destination;
    } catch (error) {
      this.logger.error(`Erreur recherche destination ${id}: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Erreur lors de la recherche de la destination");
    }
  }
}
