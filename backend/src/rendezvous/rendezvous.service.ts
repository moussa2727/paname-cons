// src/rendezvous/rendezvous.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  RendezvousStatus,
  UserRole,
  ProcedureStatus,
  AdminOpinion,
  TimeSlot,
  Rendezvous,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RendezvousRepository } from './rendezvous.repository';
import { CreateRendezvousDto } from './dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto';
import { CurrentUser } from '../interfaces/current-user.interface';
import { MailService } from '../mail/mail.service';
import {
  HolidaysService,
  RENDEZVOUS_CONSTANTS,
} from '../holidays/holidays.service';

@Injectable()
export class RendezvousService {
  private readonly logger = new Logger(RendezvousService.name);

  private convertTimeStringToTimeSlot(timeString: string): TimeSlot {
    const timeMap: Record<string, TimeSlot> = {
      '09:00': TimeSlot.SLOT_0900,
      '09:30': TimeSlot.SLOT_0930,
      '10:00': TimeSlot.SLOT_1000,
      '10:30': TimeSlot.SLOT_1030,
      '11:00': TimeSlot.SLOT_1100,
      '11:30': TimeSlot.SLOT_1130,
      '14:00': TimeSlot.SLOT_1400,
      '14:30': TimeSlot.SLOT_1430,
      '15:00': TimeSlot.SLOT_1500,
      '15:30': TimeSlot.SLOT_1530,
      '16:00': TimeSlot.SLOT_1600,
      '16:30': TimeSlot.SLOT_1630,
    };

    if (timeString === '12:00') {
      return '12:00' as TimeSlot;
    }

    const timeSlot = timeMap[timeString];
    if (!timeSlot) {
      throw new BadRequestException(
        RENDEZVOUS_CONSTANTS.VALIDATION_MESSAGES.INVALID_TIME,
      );
    }

    return timeSlot;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly rendezvousRepository: RendezvousRepository,
    private readonly mailService: MailService,
    private readonly holidaysService: HolidaysService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createRendezvousDto: CreateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    await this.validateUserAccount(currentUser);

    const rendezvousDate = new Date(createRendezvousDto.date);

    if (!this.holidaysService.isDateAvailable(rendezvousDate)) {
      throw new BadRequestException(
        "La date sélectionnée n'est pas disponible (week-end ou jour férié)",
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(createRendezvousDto.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException(
        'Vous ne pouvez pas réserver une date passée',
      );
    }

    this.validateOtherFields(createRendezvousDto);

    await this.checkUserRendezvousLimit(
      currentUser.email,
      createRendezvousDto.date,
    );

    const existingRendezvous = await this.rendezvousRepository.findAll({
      where: {
        date: createRendezvousDto.date,
        status: RendezvousStatus.CONFIRMED,
      },
    });

    const availableTimeSlots = await this.holidaysService.getAvailableTimeSlots(
      rendezvousDate,
      existingRendezvous,
    );

    if (!availableTimeSlots.includes(createRendezvousDto.time)) {
      throw new BadRequestException(
        RENDEZVOUS_CONSTANTS.VALIDATION_MESSAGES.INVALID_TIME,
      );
    }

    const data: Prisma.RendezvousCreateInput = {
      firstName: createRendezvousDto.firstName,
      lastName: createRendezvousDto.lastName,
      email: createRendezvousDto.email,
      telephone: createRendezvousDto.telephone,
      destination:
        createRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.destinationAutre?.trim() || ''
          : createRendezvousDto.destination?.trim() || '',
      destinationAutre:
        createRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.destinationAutre?.trim()
          : null,
      niveauEtude:
        createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.niveauEtudeAutre?.trim() || ''
          : createRendezvousDto.niveauEtude?.trim() || '',
      niveauEtudeAutre:
        createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.niveauEtudeAutre?.trim()
          : null,
      filiere:
        createRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.filiereAutre?.trim() || ''
          : createRendezvousDto.filiere?.trim() || '',
      filiereAutre:
        createRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.filiereAutre?.trim()
          : null,
      date: createRendezvousDto.date,
      time: this.convertTimeStringToTimeSlot(createRendezvousDto.time),
      status: RendezvousStatus.CONFIRMED,
      user: {
        connect: { id: currentUser.id },
      },
    };

    const isAvailable = await this.rendezvousRepository.checkAvailability(
      createRendezvousDto.date,
      this.convertTimeStringToTimeSlot(createRendezvousDto.time),
    );

    if (!isAvailable) {
      throw new BadRequestException("Ce créneau n'est plus disponible");
    }

    try {
      const rendezvous = await this.rendezvousRepository.create(data);

      // Send confirmation email using MailService
      await this.mailService.sendRendezvousConfirmationEmail(
        rendezvous.email,
        rendezvous.firstName,
        {
          id: rendezvous.id,
          date: new Date(rendezvous.date),
          time: rendezvous.time,
          destination: rendezvous.destination,
          destinationAutre: rendezvous.destinationAutre,
        },
      );

      return rendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur création rendez-vous: ${errorMessage}`);
      throw error;
    }
  }

  private validateOtherFields(createRendezvousDto: CreateRendezvousDto): void {
    if (createRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.destinationAutre ||
        createRendezvousDto.destinationAutre.trim() === ''
      ) {
        throw new BadRequestException(
          'La destination "Autre" nécessite une précision',
        );
      }

      const trimmedDest = createRendezvousDto.destinationAutre.trim();
      if (trimmedDest.length < 2) {
        throw new BadRequestException(
          'La destination personnalisée doit contenir au moins 2 caractères',
        );
      }
      if (trimmedDest.length > 100) {
        throw new BadRequestException(
          'La destination personnalisée ne peut pas dépasser 100 caractères',
        );
      }
    }

    if (createRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.filiereAutre ||
        createRendezvousDto.filiereAutre.trim() === ''
      ) {
        throw new BadRequestException(
          'La filière "Autre" nécessite une précision',
        );
      }

      const trimmedFiliere = createRendezvousDto.filiereAutre.trim();
      if (trimmedFiliere.length < 2) {
        throw new BadRequestException(
          'La filière personnalisée doit contenir au moins 2 caractères',
        );
      }
      if (trimmedFiliere.length > 100) {
        throw new BadRequestException(
          'La filière personnalisée ne peut pas dépasser 100 caractères',
        );
      }
    }

    if (createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.niveauEtudeAutre ||
        createRendezvousDto.niveauEtudeAutre.trim() === ''
      ) {
        throw new BadRequestException(
          'Le niveau d\'étude "Autre" nécessite une précision',
        );
      }

      const trimmedNiveau = createRendezvousDto.niveauEtudeAutre.trim();
      if (trimmedNiveau.length < 2) {
        throw new BadRequestException(
          "Le niveau d'étude personnalisé doit contenir au moins 2 caractères",
        );
      }
      if (trimmedNiveau.length > 100) {
        throw new BadRequestException(
          "Le niveau d'étude personnalisé ne peut pas dépasser 100 caractères",
        );
      }
    }
  }

  private async validateUserAccount(currentUser: CurrentUser): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      throw new BadRequestException('Compte utilisateur non trouvé');
    }

    if (!user.isActive) {
      throw new BadRequestException(
        "Votre compte est désactivé. Veuillez contacter l'administration",
      );
    }

    if (user.isDeleted) {
      throw new BadRequestException('Ce compte a été supprimé');
    }
  }

  private async checkUserRendezvousLimit(
    userEmail: string,
    date: string,
  ): Promise<void> {
    const existingCount = await this.prisma.rendezvous.count({
      where: {
        email: userEmail,
        date: date,
        status: {
          in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
        },
      },
    });

    if (existingCount >= 1) {
      throw new BadRequestException(
        'Vous avez déjà un rendez-vous confirmé pour cette date. La limite est de 1 rendez-vous par jour.',
      );
    }
  }

  async findAll(
    currentUser: CurrentUser,
    filters?: {
      status?: RendezvousStatus;
      date?: Date;
      email?: string;
      destination?: string;
      filiere?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      hasAvis?: boolean;
      hasProcedure?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
    }

    // Filtre de statut : explicite si fourni, sinon défaut PENDING + CONFIRMED
    where.status = filters?.status
      ? filters.status
      : { in: [RendezvousStatus.PENDING, RendezvousStatus.CONFIRMED] };

    if (filters?.email && currentUser.role === UserRole.ADMIN) {
      where.email = filters.email;
    }
    if (filters?.destination) where.destination = filters.destination;
    if (filters?.filiere) where.filiere = filters.filiere;

    // startDate/endDate prend la priorité sur date simple ; les deux sont mutuellement exclusifs
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) {
        (where.date as Prisma.StringFilter).gte = filters.startDate
          .toISOString()
          .split('T')[0];
      }
      if (filters?.endDate) {
        (where.date as Prisma.StringFilter).lte = filters.endDate
          .toISOString()
          .split('T')[0];
      }
    } else if (filters?.date) {
      where.date = filters.date.toISOString().split('T')[0];
    }

    if (filters?.search) {
      const normalizedSearch = filters.search.replace(/[\s.-]/g, '');

      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { telephone: { contains: normalizedSearch } },
        { telephone: { contains: filters.search } },
      ];
    }

    if (filters?.hasAvis !== undefined) {
      where.avisAdmin = filters.hasAvis ? { not: null } : null;
    }

    if (filters?.hasProcedure !== undefined) {
      where.procedures = filters.hasProcedure ? { some: {} } : { none: {} };
    }

    const orderBy: Prisma.RendezvousOrderByWithRelationInput = {};
    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'desc';

    if (sortBy === 'date') {
      orderBy.date = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'destination') {
      orderBy.destination = sortOrder;
    } else {
      orderBy.date = sortOrder;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const total = await this.rendezvousRepository.count(where);
    const data = await this.rendezvousRepository.findAll({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const enrichedData = data.map((rdv) => this.addEffectiveFields(rdv));

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  addEffectiveFields(rendezvous: Rendezvous) {
    const result = {
      ...rendezvous,
      effectiveDestination:
        rendezvous.destinationAutre || rendezvous.destination,
      effectiveNiveauEtude:
        rendezvous.niveauEtudeAutre || rendezvous.niveauEtude,
      effectiveFiliere: rendezvous.filiereAutre || rendezvous.filiere,
    };
    return result;
  }

  async findById(id: string, currentUser: CurrentUser) {
    const rendezvous = await this.rendezvousRepository.findById(id);

    if (!rendezvous) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      rendezvous.email !== currentUser.email
    ) {
      throw new ForbiddenException('Accès non autorisé à ce rendez-vous');
    }

    return this.addEffectiveFields(rendezvous);
  }

  async update(
    id: string,
    updateRendezvousDto: UpdateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    const existing = await this.findById(id, currentUser);

    if (
      existing.status === RendezvousStatus.CANCELLED ||
      existing.status === RendezvousStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Impossible de modifier un rendez-vous ${
          existing.status === RendezvousStatus.CANCELLED ? 'annulé' : 'terminé'
        }`,
      );
    }

    if (updateRendezvousDto.destination) {
      if (updateRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.destinationAutre?.trim()) {
          throw new BadRequestException(
            'La destination "Autre" nécessite une précision',
          );
        }
      }
    }

    if (updateRendezvousDto.filiere) {
      if (updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.filiereAutre?.trim()) {
          throw new BadRequestException(
            'La filière "Autre" nécessite une précision',
          );
        }
      }
    }

    if (updateRendezvousDto.niveauEtude) {
      if (updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.niveauEtudeAutre?.trim()) {
          throw new BadRequestException(
            'Le niveau d\'étude "Autre" nécessite une précision',
          );
        }
      }
    }

    const updateData: Prisma.RendezvousUpdateInput = {};

    if (updateRendezvousDto.firstName)
      updateData.firstName = updateRendezvousDto.firstName;
    if (updateRendezvousDto.lastName)
      updateData.lastName = updateRendezvousDto.lastName;
    if (updateRendezvousDto.email) updateData.email = updateRendezvousDto.email;
    if (updateRendezvousDto.telephone)
      updateData.telephone = updateRendezvousDto.telephone;

    if (updateRendezvousDto.destination) {
      const destinationValue =
        updateRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.destinationAutre?.trim()
          : updateRendezvousDto.destination.trim();
      updateData.destination = destinationValue;

      if (updateRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
        updateData.destinationAutre =
          updateRendezvousDto.destinationAutre?.trim();
      } else {
        updateData.destinationAutre = null;
      }
    }

    if (updateRendezvousDto.niveauEtude) {
      const niveauEtudeValue =
        updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.niveauEtudeAutre?.trim()
          : updateRendezvousDto.niveauEtude.trim();
      updateData.niveauEtude = niveauEtudeValue;

      if (updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
        updateData.niveauEtudeAutre =
          updateRendezvousDto.niveauEtudeAutre?.trim();
      } else {
        updateData.niveauEtudeAutre = null;
      }
    }

    if (updateRendezvousDto.filiere) {
      const filiereValue =
        updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.filiereAutre?.trim()
          : updateRendezvousDto.filiere.trim();
      updateData.filiere = filiereValue;

      if (updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
        updateData.filiereAutre =
          updateRendezvousDto.filiereAutre?.trim() || '';
      } else {
        updateData.filiereAutre = null;
      }
    }

    if (updateRendezvousDto.date) updateData.date = updateRendezvousDto.date;
    if (updateRendezvousDto.time)
      updateData.time = this.convertTimeStringToTimeSlot(
        updateRendezvousDto.time,
      );

    if (updateRendezvousDto.status) {
      this.validateStatusTransition(
        existing.status,
        updateRendezvousDto.status,
      );

      if (
        updateRendezvousDto.status === RendezvousStatus.COMPLETED &&
        !updateRendezvousDto.avisAdmin
      ) {
        throw new BadRequestException(
          'Un avis administrateur (Favorable/Défavorable) est obligatoire pour terminer un rendez-vous',
        );
      }
      updateData.status = updateRendezvousDto.status;
    }

    if (updateRendezvousDto.avisAdmin) {
      updateData.avisAdmin = updateRendezvousDto.avisAdmin;
    }

    try {
      const updatedRendezvous = await this.rendezvousRepository.update(
        id,
        updateData,
      );

      // Notification de changement de statut (hors COMPLETED+FAVORABLE qui est géré par complete())
      if (updateData.status && updateData.status !== existing.status) {
        const isCompletedFavorable =
          updateData.status === RendezvousStatus.COMPLETED &&
          updateRendezvousDto.avisAdmin === AdminOpinion.FAVORABLE;

        if (!isCompletedFavorable) {
          await this.mailService.sendRendezvousStatusUpdatedEmail(
            updatedRendezvous.email,
            updatedRendezvous.firstName,
            {
              id: updatedRendezvous.id,
              date: new Date(updatedRendezvous.date),
              time: updatedRendezvous.time,
              destination: updatedRendezvous.destination,
              destinationAutre: updatedRendezvous.destinationAutre,
            },
            existing.status,
            updateData.status as RendezvousStatus,
          );
        }
      }

      // La création de procédure est intentionnellement absente ici.
      // Elle est déclenchée UNIQUEMENT via complete() pour éviter tout double appel.

      return updatedRendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur mise à jour rendez-vous: ${errorMessage}`);
      throw error;
    }
  }

  private validateStatusTransition(
    currentStatus: RendezvousStatus,
    newStatus: RendezvousStatus,
  ): void {
    const allowedTransitions: Record<RendezvousStatus, RendezvousStatus[]> = {
      [RendezvousStatus.PENDING]: [
        RendezvousStatus.CONFIRMED,
        RendezvousStatus.CANCELLED,
      ],
      [RendezvousStatus.CONFIRMED]: [
        RendezvousStatus.COMPLETED,
        RendezvousStatus.CANCELLED,
        RendezvousStatus.PENDING,
      ],
      [RendezvousStatus.COMPLETED]: [],
      [RendezvousStatus.CANCELLED]: [],
    };

    const validTransitions = allowedTransitions[currentStatus];

    if (!validTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide: ${currentStatus} → ${newStatus}`,
      );
    }
  }

  private async createProcedureFromRendezvous(rendezvous: Rendezvous) {
    try {
      const procedureData: Prisma.ProcedureCreateInput = {
        rendezVousId: rendezvous.id,
        prenom: rendezvous.firstName,
        nom: rendezvous.lastName,
        email: rendezvous.email,
        telephone: rendezvous.telephone,
        destination: rendezvous.destination,
        destinationAutre: rendezvous.destinationAutre,
        niveauEtude: rendezvous.niveauEtude,
        niveauEtudeAutre: rendezvous.niveauEtudeAutre,
        filiere: rendezvous.filiere,
        filiereAutre: rendezvous.filiereAutre,
        statut: ProcedureStatus.IN_PROGRESS,
        dateDerniereModification: new Date(),
        user: { connect: { id: rendezvous.userId } },
        steps: {
          create: [
            {
              nom: 'DEMANDE_ADMISSION',
              statut: 'IN_PROGRESS',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
            {
              nom: 'DEMANDE_VISA',
              statut: 'PENDING',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
            {
              nom: 'PREPARATIF_VOYAGE',
              statut: 'PENDING',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
          ],
        },
      };

      const procedure = await this.prisma.procedure.create({
        data: procedureData,
        include: { steps: true },
      });

      // Send procedure creation email using MailService
      await this.mailService.sendProcedureCreatedEmail(
        procedure.email,
        procedure.prenom,
        {
          id: procedure.id,
          destination: procedure.destination,
          filiere: procedure.filiere,
          statut: procedure.statut,
        },
      );

      return procedure;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur création procédure: ${errorMessage}`);
    }
  }

  async getAvailableSlots(date: Date | string) {
    const rendezvousDate = typeof date === 'string' ? new Date(date) : date;

    if (!this.holidaysService.isDateAvailable(rendezvousDate)) {
      return {
        date: rendezvousDate,
        available: false,
        reason: 'Week-end ou jour férié',
        availableSlots: [],
      };
    }

    const existingRendezvous = await this.rendezvousRepository.findAll({
      where: {
        date: rendezvousDate.toISOString().split('T')[0],
        status: RendezvousStatus.CONFIRMED,
      },
    });

    const allTimeSlots = RENDEZVOUS_CONSTANTS.TIME_SLOTS.ALL;
    const takenTimeSlots = existingRendezvous.map((rdv) => rdv.time as string);
    const isToday = this.isToday(rendezvousDate);

    const availableSlots = allTimeSlots.filter((slot) => {
      const isTaken = takenTimeSlots.includes(slot);
      const isPast =
        isToday &&
        this.holidaysService.isPastTimeSlot(
          rendezvousDate.toISOString().split('T')[0],
          slot,
        );
      return !isTaken && !isPast;
    });

    return {
      date: rendezvousDate,
      available: availableSlots.length > 0,
      availableSlots,
      totalSlots: allTimeSlots.length,
      occupiedSlots: takenTimeSlots.length,
    };
  }

  private isToday(date: Date): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0] === today;
  }

  async getAvailableDates(startDate: Date, endDate: Date) {
    const availableDates = await this.holidaysService.getAvailableDates(
      startDate,
      endDate,
    );

    if (availableDates.length === 0) return [];

    // Une seule requête groupée pour récupérer le nombre de créneaux pris sur toutes les dates
    const startDateStr = availableDates[0];
    const endDateStr = availableDates[availableDates.length - 1];

    const bookedByDate = await this.prisma.rendezvous.groupBy({
      by: ['date'],
      where: {
        date: { gte: startDateStr, lte: endDateStr },
        status: { in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING] },
      },
      _count: { date: true },
    });

    const bookedCountMap = new Map<string, number>(
      bookedByDate.map((row) => [row.date, row._count.date]),
    );

    const allSlots = this.holidaysService.generateAllTimeSlots();
    const totalSlotsPerDay = allSlots.length;

    return availableDates
      .map((dateStr) => {
        const booked = bookedCountMap.get(dateStr) ?? 0;
        const available = totalSlotsPerDay - booked;
        return {
          date: dateStr,
          availableSlots: available,
          hasSlots: available > 0,
        };
      })
      .filter((d) => d.hasSlots);
  }

  async checkAvailability(date: string, time: string) {
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(time)) {
        throw new BadRequestException(
          "Format d'heure invalide. Utilisez HH:MM",
        );
      }

      if (this.holidaysService.isPastTimeSlot(date, time)) {
        return {
          available: false,
          date,
          time,
          message: 'Ce créneau est déjà passé',
        };
      }

      const existingRendezvous = await this.rendezvousRepository.findAll({
        where: {
          date,
          status: RendezvousStatus.CONFIRMED,
        },
      });

      const isTaken = existingRendezvous.some((rdv) => rdv.time === time);

      const availableSlots = await this.holidaysService.getAvailableTimeSlots(
        new Date(date),
        existingRendezvous,
      );

      const alternativeSlots = availableSlots.filter((slot) => slot !== time);

      return {
        available: !isTaken,
        date,
        time,
        alternativeSlots: alternativeSlots.slice(0, 5),
        nextAvailableSlot:
          alternativeSlots.length > 0
            ? { date, time: alternativeSlots[0] }
            : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la vérification de disponibilité',
      );
    }
  }

  async getStatistics(currentUser: CurrentUser) {
    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
    }

    const [total, confirmed, completed, cancelled, pending] = await Promise.all(
      [
        this.prisma.rendezvous.count({
          where: {
            ...where,
            status: {
              in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
            },
          },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.CONFIRMED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.COMPLETED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.CANCELLED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.PENDING },
        }),
      ],
    );

    const destinationStats = await this.getDestinationStatistics(where);
    const upcomingStats = await this.getUpcomingStatistics(where);

    return {
      total,
      byStatus: {
        confirmed,
        completed,
        cancelled,
        pending,
      },
      upcoming: upcomingStats,
      topDestinations: destinationStats,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
    };
  }

  private async getDestinationStatistics(where: Prisma.RendezvousWhereInput) {
    const rendezvousByDestination = await this.prisma.rendezvous.groupBy({
      by: ['destination'],
      where,
      _count: {
        id: true,
      },
    });

    return rendezvousByDestination
      .map((stat) => ({
        destination: stat.destination,
        count: stat._count.id,
        percentage: 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async getUpcomingStatistics(where: Prisma.RendezvousWhereInput) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    const daysUntilSunday = 6 - today.getDay();
    endOfWeek.setDate(today.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const [todayCount, tomorrowCount, thisWeekCount, thisMonthCount] =
      await Promise.all([
        this.prisma.rendezvous.count({
          where: {
            ...where,
            date: today.toISOString().split('T')[0],
            status: {
              in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
            },
          },
        }),
        this.prisma.rendezvous.count({
          where: {
            ...where,
            date: tomorrow.toISOString().split('T')[0],
            status: {
              in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
            },
          },
        }),
        this.prisma.rendezvous.count({
          where: {
            ...where,
            date: {
              gte: today.toISOString().split('T')[0],
              lte: endOfWeek.toISOString().split('T')[0],
            },
            status: {
              in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
            },
          },
        }),
        this.prisma.rendezvous.count({
          where: {
            ...where,
            date: {
              gte: today.toISOString().split('T')[0],
              lte: endOfMonth.toISOString().split('T')[0],
            },
            status: {
              in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
            },
          },
        }),
      ]);

    return {
      today: todayCount,
      tomorrow: tomorrowCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
    };
  }

  async cancel(
    id: string,
    currentUser: CurrentUser,
    cancelDto?: { reason?: string },
  ) {
    const existing = await this.findById(id, currentUser);

    if (existing.status === RendezvousStatus.CANCELLED) {
      throw new BadRequestException('Ce rendez-vous est déjà annulé');
    }

    if (existing.status === RendezvousStatus.COMPLETED) {
      throw new BadRequestException(
        "Impossible d'annuler un rendez-vous terminé",
      );
    }

    if (currentUser.role !== UserRole.ADMIN) {
      if (existing.email !== currentUser.email) {
        throw new ForbiddenException(
          'Vous ne pouvez annuler que vos propres rendez-vous',
        );
      }

      if (
        existing.status !== RendezvousStatus.PENDING &&
        existing.status !== RendezvousStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Seuls les rendez-vous en attente ou confirmés peuvent être annulés',
        );
      }
    }

    // Le créneau est libéré explicitement par le passage du statut à CANCELLED :
    // toutes les requêtes de disponibilité excluent les statuts CANCELLED (cf. checkAvailability, getOccupiedSlotsFromDB).
    const cancelled = await this.rendezvousRepository.update(id, {
      status: RendezvousStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: currentUser.role === UserRole.ADMIN ? 'ADMIN' : 'USER',
      cancellationReason: cancelDto?.reason ?? null,
    });

    // Send cancellation email using MailService
    await this.mailService.sendRendezvousCancelledEmail(
      cancelled.email,
      cancelled.firstName,
      {
        id: cancelled.id,
        date: new Date(cancelled.date),
        time: cancelled.time,
        destination: cancelled.destination,
        destinationAutre: cancelled.destinationAutre,
      },
      currentUser.role === UserRole.ADMIN ? 'ADMIN' : 'USER',
    );

    return cancelled;
  }

  async complete(
    id: string,
    updateRendezvousDto: UpdateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    const existing = await this.findById(id, currentUser);

    if (existing.status === RendezvousStatus.COMPLETED) {
      throw new BadRequestException('Ce rendez-vous est déjà terminé');
    }

    if (existing.status !== RendezvousStatus.CONFIRMED) {
      throw new BadRequestException(
        'Seuls les rendez-vous confirmés peuvent être terminés',
      );
    }

    if (!updateRendezvousDto.avisAdmin) {
      throw new BadRequestException(
        'Un avis administrateur (Favorable/Défavorable) est obligatoire pour terminer un rendez-vous',
      );
    }

    const updatedRendezvous = await this.rendezvousRepository.update(id, {
      status: RendezvousStatus.COMPLETED,
      avisAdmin: updateRendezvousDto.avisAdmin,
    });

    if (updateRendezvousDto.avisAdmin === AdminOpinion.FAVORABLE) {
      // Crée la procédure en premier ; l'email est envoyé à l'intérieur de createProcedureFromRendezvous
      // avec l'id réel de la procédure créée.
      await this.createProcedureFromRendezvous(updatedRendezvous);
    } else {
      // Avis UNFAVORABLE : on notifie uniquement la fin du rendez-vous, sans procédure.
      await this.mailService.sendRendezvousStatusUpdatedEmail(
        updatedRendezvous.email,
        updatedRendezvous.firstName,
        {
          id: updatedRendezvous.id,
          date: new Date(updatedRendezvous.date),
          time: updatedRendezvous.time,
          destination: updatedRendezvous.destination,
          destinationAutre: updatedRendezvous.destinationAutre,
        },
        RendezvousStatus.CONFIRMED,
        RendezvousStatus.COMPLETED,
      );
    }

    return updatedRendezvous;
  }

  async count(
    currentUser: CurrentUser,
    filters?: { status?: RendezvousStatus },
  ) {
    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
    }

    if (filters?.status) where.status = filters.status;

    return this.rendezvousRepository.count(where);
  }
}
