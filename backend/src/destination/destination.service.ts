// destination.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Destination } from '../schemas/destination.schema';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { StorageService } from '../shared/storage/storage.service';
import { DestinationGateway } from './destination.gateway';

const defaultDestinations = [
  {
    country: 'Russie',
    imagePath: '/images/russie.png',
    text: "La Russie propose un enseignement supérieur d'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel. Coûts de scolarité très compétitifs et bourses disponibles pour étudiants internationaux. Logements universitaires abordables et infrastructures modernes.",
  },
  {
    country: 'Chine',
    imagePath: '/images/chine.jpg',
    text: 'La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales. Environnement dynamique combinant technologie et culture millénaire. Cours en anglais disponibles avec des partenariats industriels solides pour des stages en entreprise.',
  },
  {
    country: 'Maroc',
    imagePath: '/images/maroc.webp',
    text: "Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d'échange avec l'Europe. Environnement sécurisé et cadre de vie agréable. Spécialisations en ingénierie, médecine et commerce avec des liens forts vers le marché africain des parcours axés sur le professionnelisme.",
  },
  {
    country: 'Algérie',
    imagePath: '/images/algerie.png',
    text: "L'Algérie dispose d'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes. Opportunités de recherche dans les énergies renouvelables et la pharmacologie. Vie étudiante riche et logements universitaires subventionnés / abordables.",
  },
  {
    country: 'Turquie',
    imagePath: '/images/turquie.webp',
    text: 'La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie. Programmes en anglais disponibles avec spécialisation en ingénierie et relations internationales. Cadre de vie moderne préservant un riche héritage culturel.',
  },
  {
    country: 'France',
    imagePath: '/images/france.svg',
    text: "La France maintient sa tradition d'excellence académique avec des universités historiques et grandes écoles renommées. Système éducatif diversifié offrant des formations pointues dans tous les domaines. Réseau d'anciens élèves influents et forte employabilité internationale. Vie culturelle riche et nombreuses bourses disponibles.",
  },
];

@Injectable()
export class DestinationService {
  private readonly logger = new Logger(DestinationService.name);

  constructor(
    @InjectModel(Destination.name)
    private readonly destinationModel: Model<Destination>,
    private readonly storageService: StorageService,
    private readonly destinationGateway: DestinationGateway,
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
        // Vérifier si les images par défaut existent
        for (const dest of defaultDestinations) {
          const imageExists = await this.storageService.fileExists(dest.imagePath.replace('/images/', ''));
          if (!imageExists) {
            this.logger.warn(`Image par défaut manquante: ${dest.imagePath}`);
          }
        }

        await this.destinationModel.insertMany(defaultDestinations);
        this.logger.log('Destinations par défaut insérées avec succès');
        
        // Notifier via WebSocket
        this.destinationGateway.emitNotification(
          'Destinations par défaut initialisées',
          'success',
        );
      }
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'initialisation des destinations:",
        error.stack,
      );
    }
  }

  /**
   * Crée une nouvelle destination
   */
  
  async create(
    createDestinationDto: CreateDestinationDto,
    file?: Express.Multer.File,
  ): Promise<Destination> {
    let imagePath = createDestinationDto.imagePath;

    if (file) {
      // Sauvegarder le fichier uploadé
      const filename = await this.storageService.saveFile(file);
      imagePath = `uploads/${filename}`; // Store with uploads/ prefix
    } else if (!imagePath) {
      // Utiliser une image par défaut
      imagePath = '/images/paname-consulting.jpg';
    }

    const created = new this.destinationModel({
      country: createDestinationDto.country,
      text: createDestinationDto.text,
      imagePath,
    });

    const saved = await created.save();
    this.destinationGateway.emitDestinationCreated(saved);
    
    return saved;
  }


  /**
   * Récupère toutes les destinations
   */
  async findAll(): Promise<Destination[]> {
    return this.destinationModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Récupère une destination par son ID
   */
  async findOne(id: string): Promise<Destination> {
    const destination = await this.destinationModel.findById(id).exec();
    if (!destination) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }
    return destination;
  }

  /**
   * Met à jour une destination
   */
  async update(
    id: string,
    updateDestinationDto: UpdateDestinationDto,
    file?: Express.Multer.File,
  ): Promise<Destination> {
    const existingDestination = await this.findOne(id);

    // Gérer la mise à jour de l'image
    if (file) {
      // Supprimer l'ancienne image si elle existe et n'est pas une image par défaut
      if (existingDestination.imagePath && !existingDestination.imagePath.includes('/images/')) {
        await this.storageService.deleteFile(existingDestination.imagePath);
      }
      
      // Sauvegarder la nouvelle image
      updateDestinationDto.imagePath = await this.storageService.saveFile(file);
    }

    const updated = await this.destinationModel
      .findByIdAndUpdate(id, updateDestinationDto, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    // Émettre l'événement WebSocket
    this.destinationGateway.emitDestinationUpdated(updated);
    this.destinationGateway.emitNotification(
      `Destination ${updated.country} mise à jour avec succès`,
      'success',
    );

    return updated;
  }

  /**
   * Supprime une destination
   */
  async remove(id: string): Promise<Destination> {
    const destination = await this.findOne(id);

    // Supprimer l'image associée si ce n'est pas une image par défaut
    if (destination.imagePath && !destination.imagePath.includes('/images/')) {
      await this.storageService.deleteFile(destination.imagePath);
    }

    const deleted = await this.destinationModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    // Émettre l'événement WebSocket
    this.destinationGateway.emitDestinationDeleted(id);
    this.destinationGateway.emitNotification(
      `Destination ${deleted.country} supprimée avec succès`,
      'info',
    );

    return deleted;
  }

  /**
   * Recherche des destinations par pays
   */
  async searchByCountry(query: string): Promise<Destination[]> {
    return this.destinationModel
      .find({ country: { $regex: query, $options: 'i' } })
      .limit(10)
      .exec();
  }

  /**
   * Nettoie les images orphelines
   */
  async cleanupOrphanedImages(): Promise<string[]> {
    const destinations = await this.findAll();
    const validImages = destinations
      .map(d => d.imagePath)
      .filter(path => !path.includes('/images/')); // Exclure les images par défaut

    return this.storageService.cleanupOrphanedFiles(validImages);
  }
}