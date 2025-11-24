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
import { Destination } from "./entities/destination.entity";

const defaultDestinations = [
  {
    country: "Russie",
    imagePath: "/russie.png",
    text: "La Russie propose un enseignement supérieur d'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel.",
  },
  {
    country: "Chine",
    imagePath: "/chine.jpg",
    text: "La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales.",
  },
  {
    country: "Maroc",
    imagePath: "/maroc.webp",
    text: "Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d'échange avec l'Europe.",
  },
  {
    country: "Algérie",
    imagePath: "/algerie.png",
    text: "L'Algérie dispose d'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes.",
  },
  {
    country: "Turquie",
    imagePath: "/turquie.webp",
    text: "La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie.",
  },
  {
    country: "France",
    imagePath: "/france.svg",
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
        await this.destinationModel.insertMany(defaultDestinations);
        this.logger.log("✅ Destinations par défaut insérées avec succès");
      }
    } catch (error) {
      this.logger.error(
        "❌ Erreur lors de l'initialisation des destinations:",
        error,
      );
    }
  }

  /**
   * Créer une nouvelle destination (Admin seulement)
   */
  async create(
    createDestinationDto: CreateDestinationDto,
    imageFile: Express.Multer.File,
  ): Promise<Destination> {
    this.logger.log(`🔄 Tentative création destination.`);

    try {
      // Validation des données d'entrée
      if (!createDestinationDto.country?.trim()) {
        throw new BadRequestException("Le nom du pays est obligatoire");
      }

      if (!createDestinationDto.text?.trim()) {
        throw new BadRequestException("La description est obligatoire");
      }

      if (!imageFile) {
        throw new BadRequestException("L'image est obligatoire");
      }

      // Vérifier si la destination existe déjà
      const existingDestination = await this.destinationModel.findOne({
        country: createDestinationDto.country.trim(),
      });

      if (existingDestination) {
        this.logger.warn(`🚨 Destination déjà existante.`);
        throw new ConflictException("Cette destination existe déjà");
      }

      // Upload de l'image - CORRECTION ICI
      const fileName = await this.storageService.uploadFile(imageFile);
      const imagePath = `uploads/${fileName}`; // ← Ajouter le préfixe 'uploads/'

      // Création de la destination
      const createdDestination = new this.destinationModel({
        country: createDestinationDto.country.trim(),
        text: createDestinationDto.text.trim(),
        imagePath, // ← Maintenant avec le bon format
      });

      const savedDestination = await createdDestination.save();

      this.logger.log(`✅ Destination créée.`);
      return savedDestination;
    } catch (error) {
      this.logger.error(`❌ Erreur création destination: ${error.message}`);

      // Nettoyage en cas d'erreur
      if (imageFile) {
        try {
          await this.storageService.deleteFile(`uploads/${imageFile.filename}`);
        } catch (cleanupError) {
          this.logger.error("Erreur nettoyage fichier:", cleanupError);
        }
      }

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
   * Récupérer toutes les destinations avec pagination (Public)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    data: Destination[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Construction des filtres de recherche
      const filters: any = {};
      if (search && search.trim()) {
        filters.country = {
          $regex: search.trim(),
          $options: "i",
        };
      }

      // Exécution parallèle des requêtes
      const [data, total] = await Promise.all([
        this.destinationModel
          .find(filters)
          .select("country imagePath text createdAt updatedAt")
          .skip(skip)
          .limit(limit)
          .sort({ country: 1 })
          .lean()
          .exec(),
        this.destinationModel.countDocuments(filters),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error(
        `❌ Erreur récupération destinations: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération des destinations",
      );
    }
  }

  /**
   * Récupérer toutes les destinations sans pagination (Public)
   */
  async findAllWithoutPagination(): Promise<Destination[]> {
    try {
      return await this.destinationModel
        .find()
        .select("country imagePath text createdAt updatedAt")
        .sort({ country: 1 })
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(
        `❌ Erreur récupération toutes destinations: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération des destinations",
      );
    }
  }

  /**
   * Récupérer une destination par ID (Public)
   */
  async findOne(id: string): Promise<Destination> {
    try {
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      const destination = await this.destinationModel
        .findById(id)
        .select("country imagePath text createdAt updatedAt")
        .lean()
        .exec();

      if (!destination) {
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      return destination;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `❌ Erreur récupération destination ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération de la destination",
      );
    }
  }

  /**
   * Trouver une destination par nom de pays
   */
  async findByCountry(country: string): Promise<Destination | null> {
    try {
      return await this.destinationModel
        .findOne({
          country: { $regex: `^${country.trim()}$`, $options: "i" },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `❌ Erreur recherche par pays ${country}: ${error.message}`,
      );
      throw error;
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
    this.logger.log(`🔄 Tentative mise à jour destination: ${id}`);

    try {
      // Validation de l'ID
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      // Vérifier que la destination existe
      const existingDestination = await this.destinationModel.findById(id);
      if (!existingDestination) {
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
          throw new ConflictException(
            "Une destination avec ce nom existe déjà",
          );
        }
      }

      let imagePath = existingDestination.imagePath;
      let oldImagePath: string | null = null;

      // Gestion de la nouvelle image
      if (imageFile) {
        // Upload de la nouvelle image
        const fileName = await this.storageService.uploadFile(imageFile);
        imagePath = `uploads/${fileName}`;

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

      // Mise à jour dans la base
      const updatedDestination = await this.destinationModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
          lean: true,
        })
        .select("country imagePath text createdAt updatedAt")
        .exec();

      if (!updatedDestination) {
        throw new NotFoundException(
          `Destination avec ID ${id} non trouvée après mise à jour`,
        );
      }

      // Nettoyage de l'ancienne image après mise à jour réussie
      if (oldImagePath) {
        try {
          await this.storageService.deleteFile(oldImagePath);
          this.logger.log(`🗑️ Ancienne image supprimée: ${oldImagePath}`);
        } catch (cleanupError) {
          this.logger.warn(
            `⚠️ Impossible de supprimer l'ancienne image: ${cleanupError.message}`,
          );
        }
      }

      this.logger.log(
        `✅ Destination mise à jour: ${updatedDestination.country}`,
      );
      return updatedDestination;
    } catch (error) {
      this.logger.error(
        `❌ Erreur mise à jour destination ${id}: ${error.message}`,
      );

      // Nettoyage en cas d'erreur
      if (imageFile) {
        try {
          await this.storageService.deleteFile(`uploads/${imageFile.filename}`);
        } catch (cleanupError) {
          this.logger.error("Erreur nettoyage fichier:", cleanupError);
        }
      }

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
  async remove(
    id: string,
  ): Promise<{ message: string; deletedDestination: Destination }> {
    this.logger.log(`🔄 Tentative suppression destination`);

    try {
      // Validation de l'ID
      if (!id || id.length !== 24) {
        throw new BadRequestException("ID de destination invalide");
      }

      // Récupérer la destination avec toutes les données
      const destination = await this.destinationModel.findById(id);
      if (!destination) {
        throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
      }

      // Supprimer l'image associée si elle existe
      if (destination.imagePath) {
        await this.storageService.deleteFile(destination.imagePath);
        this.logger.log(`🗑️ Image supprimée: ${destination.imagePath}`);
      }

      // Supprimer la destination de la base
      const deletedDestination = await this.destinationModel
        .findByIdAndDelete(id)
        .lean()
        .exec();

      if (!deletedDestination) {
        throw new NotFoundException(
          `Destination avec ID ${id} non trouvée lors de la suppression`,
        );
      }

      this.logger.log(
        `✅ Destination supprimée: ${destination.country} (ID: ${id})`,
      );

      return {
        message: "Destination supprimée avec succès",
        deletedDestination: deletedDestination as Destination,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur suppression destination: ${error.message}`);

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
   * Compter le nombre total de destinations
   */
  async count(filters: any = {}): Promise<number> {
    try {
      return await this.destinationModel.countDocuments(filters).exec();
    } catch (error) {
      this.logger.error(`❌ Erreur comptage destinations: ${error.message}`);
      throw new InternalServerErrorException(
        "Erreur lors du comptage des destinations",
      );
    }
  }

  /**
   * Vérifier l'existence d'une destination
   */
  async exists(id: string): Promise<boolean> {
    try {
      if (!id || id.length !== 24) return false;
      const count = await this.destinationModel.countDocuments({ _id: id });
      return count > 0;
    } catch (error) {
      this.logger.error(`❌ Erreur vérification existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Récupérer les statistiques des destinations
   */
  async getStatistics(): Promise<{
    total: number;
    countries: number;
    lastUpdated: Date | null;
  }> {
    try {
      const [total, lastDestination, allDestinations] = await Promise.all([
        this.count(),
        this.destinationModel
          .findOne()
          .sort({ updatedAt: -1 })
          .select("updatedAt")
          .lean()
          .exec(),
        this.destinationModel.find().select("country").lean().exec(),
      ]);

      const uniqueCountries = new Set(
        allDestinations.map((dest) => dest.country.toLowerCase().trim()),
      );

      return {
        total,
        countries: uniqueCountries.size,
        lastUpdated: lastDestination?.updatedAt || null,
      };
    } catch (error) {
      this.logger.error(
        `❌ Erreur récupération statistiques: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération des statistiques",
      );
    }
  }
}
