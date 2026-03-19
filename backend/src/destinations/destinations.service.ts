import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Destination } from '@prisma/client';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

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
    text: "Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d'échange avec l'Europe. Environnement sécurisé et cadre de vie agréable. Spécialisations en ingénierie, médecine et commerce avec des liens forts vers le marché africain des parcours axés sur le professionnalisme.",
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
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    void this.initializeDefaultDestinations();
  }

  /**
   * Initialise les destinations par défaut si la base est vide
   */
  private async initializeDefaultDestinations(): Promise<void> {
    try {
      const count = await this.prisma.destination.count();
      if (count === 0) {
        // Afficher les images par défaut qui seront utilisées
        for (const dest of defaultDestinations) {
          await this.prisma.destination.create({
            data: dest,
          });
        }
        this.logger.log('Images orphelins supprimés');
      }
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'initialisation des destinations",
        error,
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
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imagePath = uploadResult.publicId;
    } else if (!imagePath) {
      // Ne pas définir d'image par défaut - l'admin doit uploader une image
      throw new BadRequestException(
        'Une image est requise pour créer une destination',
      );
    }

    const destination = await this.prisma.destination.create({
      data: {
        country: createDestinationDto.country,
        text: createDestinationDto.text,
        imagePath,
      },
    });

    return destination;
  }

  /**
   * Récupère toutes les destinations
   */
  async findAll(): Promise<Destination[]> {
    return this.prisma.destination.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupère une destination par son ID
   */
  async findOne(id: string): Promise<Destination> {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
    });

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
      if (
        existingDestination.imagePath &&
        !existingDestination.imagePath.includes('/images/')
      ) {
        await this.cloudinaryService.deleteFile(existingDestination.imagePath);
      }

      // Sauvegarder la nouvelle image
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      updateDestinationDto.imagePath = uploadResult.publicId;
    }

    const updated = await this.prisma.destination.update({
      where: { id },
      data: updateDestinationDto,
    });

    return updated;
  }

  /**
   * Supprime une destination
   */
  async remove(id: string): Promise<Destination> {
    const destination = await this.findOne(id);

    // Supprimer l'image associée si ce n'est pas une image par défaut
    if (destination.imagePath && !destination.imagePath.includes('/images/')) {
      await this.cloudinaryService.deleteFile(destination.imagePath);
    }

    const deleted = await this.prisma.destination.delete({
      where: { id },
    });

    return deleted;
  }

  /**
   * Recherche des destinations par pays
   */
  async searchByCountry(query: string): Promise<Destination[]> {
    return this.prisma.destination.findMany({
      where: {
        country: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 10,
    });
  }

  /**
   * Nettoie les images orphelines
   */
  async cleanupOrphanedImages(): Promise<string[]> {
    const destinations = await this.findAll();
    const validImages = destinations
      .map((d) => d.imagePath)
      .filter((path) => !path.includes('/images/'));

    return this.cloudinaryService.cleanupOrphanedFiles(validImages);
  }
}
