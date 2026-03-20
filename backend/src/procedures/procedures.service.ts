import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ProceduresRepository } from './procedures.repository';
import {
  CreateProcedureDto,
  UpdateProcedureDto,
  UpdateStepDto,
  ProcedureResponseDto,
  ProcedureQueryDto,
} from './dto';
import {
  StepStatus,
  StepName,
  ProcedureStatus,
  UserRole,
  RendezvousStatus,
  Prisma,
  Procedure,
  User,
  Rendezvous,
  Step,
} from '@prisma/client';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../interfaces/current-user.interface';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import * as PDFKit from 'pdfkit';

@Injectable()
export class ProceduresService {
  private readonly logger = new Logger(ProceduresService.name);

  constructor(
    private proceduresRepository: ProceduresRepository,
    private queueService: QueueService,
    private prisma: PrismaService,
  ) {}

  async create(
    createProcedureDto: CreateProcedureDto,
    currentUserId?: string,
  ): Promise<ProcedureResponseDto> {
    // Vérifier si le rendez-vous existe
    const rendezvous = await this.prisma.rendezvous.findUnique({
      where: { id: createProcedureDto.rendezVousId },
    });
    if (!rendezvous) {
      throw new NotFoundException(
        `Rendez-vous avec l'ID ${createProcedureDto.rendezVousId} non trouvé`,
      );
    }

    // Vérifier si une procédure existe déjà pour ce rendez-vous
    const existingProcedure =
      await this.proceduresRepository.findByRendezvousId(
        createProcedureDto.rendezVousId,
      );
    if (existingProcedure) {
      throw new ConflictException(
        'Une procédure existe déjà pour ce rendez-vous',
      );
    }

    // Vérifier la cohérence des données avec le rendez-vous
    if (rendezvous.email !== createProcedureDto.email) {
      throw new BadRequestException(
        "L'email doit correspondre à celui du rendez-vous",
      );
    }

    // Vérifier les conditions obligatoires pour créer une procédure
    if (rendezvous.status !== RendezvousStatus.COMPLETED) {
      throw new BadRequestException(
        'Une procédure ne peut être créée que si le rendez-vous est terminé',
      );
    }

    if (rendezvous.avisAdmin !== 'FAVORABLE') {
      throw new BadRequestException(
        "Une procédure ne peut être créée que si l'avis administrateur est favorable",
      );
    }

    // Valider la destination si ce n'est pas "Autre"
    if (createProcedureDto.destination !== 'Autre') {
      const destinationExists = await this.prisma.destination.findUnique({
        where: { country: createProcedureDto.destination },
      });
      if (!destinationExists) {
        throw new BadRequestException(
          `La destination "${createProcedureDto.destination}" n'existe pas`,
        );
      }
    }

    // Créer la procédure avec les étapes obligatoires
    const procedure = await this.proceduresRepository.create({
      ...createProcedureDto,
      user: currentUserId ? { connect: { id: currentUserId } } : undefined,
      steps: [
        {
          nom: StepName.DEMANDE_ADMISSION,
          statut: StepStatus.IN_PROGRESS,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
        {
          nom: StepName.DEMANDE_VISA,
          statut: StepStatus.PENDING,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
        {
          nom: StepName.PREPARATIF_VOYAGE,
          statut: StepStatus.PENDING,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
      ],
    });

    // S'assurer que toutes les étapes requises sont présentes
    await this.ensureRequiredSteps(procedure.id);

    // Envoyer un email de confirmation via queue
    await this.queueService.addEmailJob({
      to: procedure.email,
      subject: 'Confirmation de procédure - Paname Consulting',
      html: this.generateProcedureCreatedContent(procedure),
      priority: 'high',
    });

    // Récupérer la procédure complète avec ses relations
    const procedureWithRelations = await this.proceduresRepository.findById(
      procedure.id,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedureWithRelations) {
      throw new NotFoundException('Procédure créée non trouvée');
    }

    this.logger.log(`Procédure ${procedure.id} créée avec succès`);
    return this.toResponseDto(procedureWithRelations);
  }

  async findAll(
    query: ProcedureQueryDto,
    currentUser: CurrentUser,
  ): Promise<{
    data: ProcedureResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      email,
      destination,
      includeDeleted = false,
      includeCompleted = false,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.ProcedureWhereInput = { isDeleted: !includeDeleted };

    // Filtres pour admin
    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email; // Les utilisateurs normaux voient seulement leurs procédures
    } else {
      // Par défaut, l'admin ne voit que les procédures en cours et en attente
      // Sauf si includeCompleted est true pour voir toutes les procédures
      if (!status && !includeCompleted) {
        where.statut = {
          in: [ProcedureStatus.PENDING, ProcedureStatus.IN_PROGRESS],
        };
      }
    }

    // Filtres optionnels
    if (status) where.statut = status;
    if (email && currentUser.role === UserRole.ADMIN) where.email = email;
    if (destination) where.destination = destination;
    if (search) {
      // Normaliser la recherche pour le téléphone
      const normalizedSearch = search.replace(/[\s.-]/g, '');

      where.OR = [
        { prenom: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: normalizedSearch } },
        { telephone: { contains: search } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [procedures, total] = await Promise.all([
      this.proceduresRepository.findAll({
        skip,
        take: limit,
        where: where,
        orderBy: { [sortBy]: sortOrder },
        include: { steps: true, rendezVouses: true, user: true },
      }),
      this.proceduresRepository.count(where),
    ]);

    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      data: procedures.map((proc) => this.toResponseDto(proc)),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrevious,
    };
  }

  async findById(
    id: string,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findById(id, {
      steps: true,
      rendezVouses: true,
      user: true,
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Vérifier les permissions
    if (
      currentUser.role !== UserRole.ADMIN &&
      procedure.email !== currentUser.email
    ) {
      throw new ForbiddenException("Vous n'avez pas accès à cette procédure");
    }

    return this.toResponseDto(procedure);
  }

  async findByRendezvousId(
    rendezVousId: string,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findByRendezvousId(
      rendezVousId,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedure) {
      throw new NotFoundException(
        `Aucune procédure trouvée pour ce rendez-vous`,
      );
    }

    // Vérifier les permissions
    if (
      currentUser.role !== UserRole.ADMIN &&
      procedure.email !== currentUser.email
    ) {
      throw new ForbiddenException("Vous n'avez pas accès à cette procédure");
    }

    return this.toResponseDto(procedure);
  }

  async findByUserEmail(
    email: string,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto[]> {
    // Vérifier les permissions
    if (currentUser.role !== UserRole.ADMIN && email !== currentUser.email) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres procédures',
      );
    }

    const procedures = await this.proceduresRepository.findByUserEmail(email, {
      steps: true,
      rendezVouses: true,
      user: true,
    });

    return procedures.map((proc) => this.toResponseDto(proc));
  }

  async update(
    id: string,
    updateProcedureDto: UpdateProcedureDto,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findById(id, {
      steps: true,
      rendezVouses: true,
      user: true,
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Vérifier les permissions
    if (
      currentUser.role !== UserRole.ADMIN &&
      procedure.email !== currentUser.email
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres procédures',
      );
    }

    // Traitement des champs "Autre"
    if (
      updateProcedureDto.destination === 'Autre' &&
      updateProcedureDto.destinationAutre
    ) {
      updateProcedureDto.destination = updateProcedureDto.destinationAutre;
      updateProcedureDto.destinationAutre = undefined;
    }

    if (
      updateProcedureDto.filiere === 'Autre' &&
      updateProcedureDto.filiereAutre
    ) {
      updateProcedureDto.filiere = updateProcedureDto.filiereAutre;
      updateProcedureDto.filiereAutre = undefined;
    }

    if (
      updateProcedureDto.niveauEtude === 'Autre' &&
      updateProcedureDto.niveauEtudeAutre
    ) {
      updateProcedureDto.niveauEtude = updateProcedureDto.niveauEtudeAutre;
      updateProcedureDto.niveauEtudeAutre = undefined;
    }

    await this.proceduresRepository.update(id, updateProcedureDto);

    // Récupérer la procédure complète avec ses relations
    const procedureWithRelations = await this.proceduresRepository.findById(
      id,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedureWithRelations) {
      throw new NotFoundException(
        `Procédure avec l'ID ${id} non trouvée après mise à jour`,
      );
    }

    this.logger.log(`Procédure ${id} mise à jour`);
    return this.toResponseDto(procedureWithRelations);
  }

  async updateStep(
    id: string,
    stepName: StepName,
    updateStepDto: UpdateStepDto,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findById(id, {
      steps: true,
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Seul un admin peut mettre à jour les étapes
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut mettre à jour les étapes',
      );
    }

    const step = procedure.steps?.find((s) => s.nom === stepName);
    if (!step) {
      throw new NotFoundException(`Étape ${stepName} non trouvée`);
    }

    // Règle métier: Si DEMANDE_ADMISSION est rejetée, toutes les autres étapes sont automatiquement rejetées
    if (
      stepName === StepName.DEMANDE_ADMISSION &&
      updateStepDto.statut === StepStatus.REJECTED
    ) {
      // Rejeter automatiquement toutes les autres étapes
      const otherSteps =
        procedure.steps?.filter((s) => s.nom !== StepName.DEMANDE_ADMISSION) ||
        [];
      for (const step of otherSteps) {
        await this.proceduresRepository.updateStep(step.id, {
          statut: StepStatus.REJECTED,
          raisonRefus: updateStepDto.raisonRefus,
          dateCompletion: new Date(),
          dateMaj: new Date(),
        });
      }
    }

    // Mettre à jour l'étape spécifique
    await this.proceduresRepository.updateStep(step.id, {
      ...updateStepDto,
      dateMaj: new Date(),
      dateCompletion:
        updateStepDto.statut === StepStatus.COMPLETED ||
        updateStepDto.statut === StepStatus.REJECTED
          ? new Date()
          : undefined,
    });

    // Mettre à jour le statut global de la procédure
    const updatedProcedure =
      await this.proceduresRepository.updateGlobalStatus(id);

    // Récupérer la procédure complète avec ses relations
    const procedureWithRelations = await this.proceduresRepository.findById(
      id,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedureWithRelations) {
      throw new NotFoundException(
        `Procédure avec l'ID ${id} non trouvée après mise à jour`,
      );
    }

    // Envoyer une notification si le statut a changé
    if (updatedProcedure.statut !== procedure.statut) {
      await this.queueService.addEmailJob({
        to: updatedProcedure.email,
        subject: 'Mise à jour de votre procédure - Paname Consulting',
        html: this.generateProcedureStatusUpdatedContent(updatedProcedure),
        priority: 'normal',
      });
    }

    this.logger.log(`Étape ${stepName} mise à jour pour procédure ${id}`);
    return this.toResponseDto(procedureWithRelations);
  }

  /**
   * S'assurer que toutes les étapes requises sont présentes
   */
  async ensureRequiredSteps(procedureId: string): Promise<void> {
    const requiredSteps = [
      StepName.DEMANDE_ADMISSION,
      StepName.DEMANDE_VISA,
      StepName.PREPARATIF_VOYAGE,
    ];

    const procedure = await this.proceduresRepository.findById(procedureId, {
      steps: true,
    });

    if (!procedure) return;

    const existingStepNames = procedure.steps?.map((s) => s.nom) || [];

    for (const stepName of requiredSteps) {
      if (!existingStepNames.includes(stepName)) {
        // Créer l'étape avec la relation procedure via le repository
        // Le repository s'occupe de connecter la procédure
        await this.proceduresRepository.addStep(procedureId, {
          nom: stepName,
          statut:
            stepName === StepName.DEMANDE_ADMISSION
              ? StepStatus.IN_PROGRESS
              : StepStatus.PENDING,
          dateCreation: new Date(),
          dateMaj: new Date(),
          procedure: {
            connect: {
              id: procedureId,
            },
          },
        });
      }
    }
  }

  async addStep(
    id: string,
    stepName: StepName,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findById(id, {
      steps: true,
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Seul un admin peut ajouter des étapes
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut ajouter des étapes',
      );
    }

    // Vérifier si l'étape existe déjà
    if (procedure.steps && procedure.steps.some((s) => s.nom === stepName)) {
      throw new ConflictException(`L'étape ${stepName} existe déjà`);
    }

    // Créer l'étape via le repository (qui gère la relation)
    await this.proceduresRepository.addStep(id, {
      nom: stepName,
      statut: StepStatus.PENDING,
      dateCreation: new Date(),
      dateMaj: new Date(),
      procedure: {
        connect: {
          id,
        },
      },
    });

    // Mettre à jour le statut global
    await this.proceduresRepository.updateGlobalStatus(id);

    // Récupérer la procédure complète avec ses relations
    const procedureWithRelations = await this.proceduresRepository.findById(
      id,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedureWithRelations) {
      throw new NotFoundException(
        `Procédure avec l'ID ${id} non trouvée après ajout d'étape`,
      );
    }

    this.logger.log(`Étape ${stepName} ajoutée à procédure ${id}`);
    return this.toResponseDto(procedureWithRelations);
  }

  async softDelete(
    id: string,
    reason: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    const procedure = await this.proceduresRepository.findById(id);

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Seul un admin peut supprimer une procédure
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut supprimer une procédure',
      );
    }

    await this.proceduresRepository.softDelete(id, reason);

    // Cascade: annuler toutes les étapes en cours ou en attente
    await this.prisma.step.updateMany({
      where: {
        procedureId: id,
        statut: {
          in: [StepStatus.PENDING, StepStatus.IN_PROGRESS],
        },
      },
      data: {
        statut: StepStatus.CANCELLED,
        dateMaj: new Date(),
        dateCompletion: new Date(),
      },
    });

    // Notifier l'utilisateur
    await this.queueService.addEmailJob({
      to: procedure.email,
      subject: 'Suppression de votre procédure - Paname Consulting',
      html: this.generateProcedureDeletedContent(procedure, reason),
      priority: 'high',
    });

    this.logger.log(`Procédure ${id} supprimée (soft delete)`);
  }

  async cancel(
    id: string,
    reason: string,
    currentUser: CurrentUser,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.proceduresRepository.findById(id, {
      steps: true,
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure avec l'ID ${id} non trouvée`);
    }

    // Vérifier que l'utilisateur peut annuler sa propre procédure
    if (
      currentUser.role !== UserRole.ADMIN &&
      procedure.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez annuler que vos propres procédures',
      );
    }

    // Vérifier que la procédure peut être annulée
    if (procedure.statut !== ProcedureStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Seules les procédures en cours peuvent être annulées',
      );
    }

    // Mettre à jour la procédure avec les champs d'annulation
    await this.proceduresRepository.update(id, {
      statut: ProcedureStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: reason,
      cancelledBy: currentUser.id,
    });

    // Cascade: annuler toutes les étapes en cours ou en attente
    await this.prisma.step.updateMany({
      where: {
        procedureId: id,
        statut: {
          in: [StepStatus.PENDING, StepStatus.IN_PROGRESS],
        },
      },
      data: {
        statut: StepStatus.CANCELLED,
        dateMaj: new Date(),
        dateCompletion: new Date(),
      },
    });

    this.logger.log(
      `Procédure ${id} annulée par l'utilisateur ${currentUser.id}`,
    );

    // Récupérer la procédure complète avec ses relations pour le DTO
    const procedureWithRelations = await this.proceduresRepository.findById(
      id,
      {
        steps: true,
        rendezVouses: true,
        user: true,
      },
    );

    if (!procedureWithRelations) {
      throw new NotFoundException(
        `Procédure avec l'ID ${id} non trouvée après mise à jour`,
      );
    }

    // Notifier l'administrateur
    await this.queueService.addEmailJob({
      to: process.env.EMAIL_USER || 'admin@panameconsulting.com',
      subject: 'Annulation de procédure - Paname Consulting',
      html: this.generateProcedureCancelledContent(
        this.toResponseDto(procedureWithRelations),
        reason,
        currentUser,
      ),
      priority: 'normal',
    });

    return this.toResponseDto(procedureWithRelations);
  }

  async getStatistics(currentUser: CurrentUser): Promise<any> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut voir les statistiques',
      );
    }

    const [
      totalProcedures,
      pending,
      inProgress,
      completed,
      rejected,
      cancelled,
      proceduresToday,
      proceduresThisWeek,
      proceduresThisMonth,
    ] = await Promise.all([
      this.proceduresRepository.count({ isDeleted: false }),
      this.proceduresRepository.count({
        statut: ProcedureStatus.PENDING,
        isDeleted: false,
      }),
      this.proceduresRepository.count({
        statut: ProcedureStatus.IN_PROGRESS,
        isDeleted: false,
      }),
      this.proceduresRepository.count({
        statut: ProcedureStatus.COMPLETED,
        isDeleted: false,
      }),
      this.proceduresRepository.count({
        statut: ProcedureStatus.REJECTED,
        isDeleted: false,
      }),
      this.proceduresRepository.count({
        statut: ProcedureStatus.CANCELLED,
        isDeleted: false,
      }),
      this.proceduresRepository.countCreatedSince(
        new Date(new Date().setHours(0, 0, 0, 0)),
      ),
      this.proceduresRepository.countCreatedSince(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      ),
      this.proceduresRepository.countCreatedSince(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      ),
    ]);

    // Statistiques par destination
    const topDestinations =
      await this.proceduresRepository.getTopDestinations(5);

    // Statistiques par filière
    const topFilieres = await this.proceduresRepository.getTopFilieres(5);

    // Calculer le temps moyen de complétion (en jours)
    const averageCompletionTime =
      await this.proceduresRepository.getAverageCompletionTime();

    return {
      total: totalProcedures,
      byStatus: {
        PENDING: pending,
        IN_PROGRESS: inProgress,
        COMPLETED: completed,
        REJECTED: rejected,
        CANCELLED: cancelled,
      },
      completionRate:
        totalProcedures > 0 ? (completed / totalProcedures) * 100 : 0,
      rejectionRate:
        totalProcedures > 0 ? (rejected / totalProcedures) * 100 : 0,
      averageCompletionTime,
      newProcedures: {
        today: proceduresToday,
        thisWeek: proceduresThisWeek,
        thisMonth: proceduresThisMonth,
      },
      topDestinations,
      topFilieres,
    };
  }

  /**
   * Convertir l'entité Procedure en DTO de réponse avec virtuals calculés
   */
  private toResponseDto(
    procedure: Procedure & {
      steps?: Step[];
      rendezVouses?: Rendezvous | Rendezvous[] | null;
      user?: User | null;
    },
  ): ProcedureResponseDto {
    // Gérer le cas où rendezVouses pourrait être un tableau (selon votre schéma Prisma)
    const rendezvous = Array.isArray(procedure.rendezVouses)
      ? procedure.rendezVouses[0]
      : procedure.rendezVouses;

    // Mapper les étapes avec leurs virtuals
    const stepsWithVirtuals =
      procedure.steps?.map((step) => ({
        id: step.id,
        nom: step.nom,
        statut: step.statut,
        raisonRefus: step.raisonRefus || undefined,
        dateCreation: step.dateCreation,
        dateMaj: step.dateMaj,
        dateCompletion: step.dateCompletion || undefined,
        // Virtuals pour Step
        canBeModified: ![
          StepStatus.COMPLETED as StepStatus,
          StepStatus.REJECTED as StepStatus,
          StepStatus.CANCELLED as StepStatus,
        ].includes(step.statut),
        duration: step.dateCompletion
          ? (new Date(step.dateCompletion).getTime() -
              new Date(step.dateCreation).getTime()) /
            (1000 * 60 * 60 * 24)
          : undefined,
        isOverdue:
          step.statut === StepStatus.IN_PROGRESS &&
          (Date.now() - new Date(step.dateCreation).getTime()) /
            (1000 * 60 * 60 * 24) >
            7,
        statusLabel: this.getStepStatusLabel(step.statut),
        statusColor: this.getStepStatusColor(step.statut),
      })) || [];

    const totalSteps = procedure.steps?.length || 0;
    const completedSteps =
      procedure.steps?.filter((s) => s.statut === StepStatus.COMPLETED)
        .length || 0;

    const activeStep = procedure.steps?.find(
      (s) => s.statut === StepStatus.IN_PROGRESS,
    );

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(procedure.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const isOverdue = this.calculateIsOverdue(procedure);

    return {
      id: procedure.id,
      rendezVousId: procedure.rendezVousId || undefined,
      prenom: procedure.prenom,
      nom: procedure.nom,
      fullName: `${procedure.prenom} ${procedure.nom}`,
      email: procedure.email,
      telephone: procedure.telephone,
      destination: procedure.destination,
      destinationAutre: procedure.destinationAutre || undefined,
      effectiveDestination: this.getRealDestination(
        procedure.destination,
        procedure.destinationAutre || undefined,
      ),
      filiere: procedure.filiere,
      filiereAutre: procedure.filiereAutre || undefined,
      effectiveFiliere: this.getRealFiliere(
        procedure.filiere,
        procedure.filiereAutre || undefined,
      ),
      niveauEtude: procedure.niveauEtude,
      niveauEtudeAutre: procedure.niveauEtudeAutre ?? undefined,
      effectiveNiveauEtude: this.getRealNiveauEtude(
        procedure.niveauEtude,
        procedure.niveauEtudeAutre ?? undefined,
      ),
      statut: procedure.statut,
      raisonRejet: procedure.raisonRejet || undefined,
      isDeleted: procedure.isDeleted,
      deletedAt: procedure.deletedAt || undefined,
      deletionReason: procedure.deletionReason || undefined,
      dateCompletion: procedure.dateCompletion || undefined,
      dateDerniereModification: procedure.dateDerniereModification || undefined,
      createdAt: procedure.createdAt,
      updatedAt: procedure.updatedAt,
      userId: procedure.userId,
      steps: stepsWithVirtuals,
      progress: this.calculateProgress(procedure.steps),
      completedSteps,
      totalSteps,
      activeStep: activeStep?.nom,
      canBeModified: this.canProcedureBeModified(procedure.statut),
      daysSinceCreation,
      estimatedCompletionDate: this.estimateCompletionDate(procedure.steps),
      statusLabel: this.getProcedureStatusLabel(procedure.statut),
      statusColor: this.getProcedureStatusColor(procedure.statut),
      isOverdue,
      nextStep: this.getNextStep(procedure.steps),
      rendezvousStatus: rendezvous?.status,
      rendezvousDate: rendezvous?.date,
    };
  }

  private calculateProgress(steps?: Step[]): number {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter(
      (s) => s.statut === StepStatus.COMPLETED,
    ).length;
    return Math.round((completed / steps.length) * 100);
  }

  private canProcedureBeModified(status: ProcedureStatus): boolean {
    const finalStatuses: ProcedureStatus[] = [
      ProcedureStatus.COMPLETED,
      ProcedureStatus.CANCELLED,
      ProcedureStatus.REJECTED,
    ];
    return !finalStatuses.includes(status);
  }

  private calculateIsOverdue(
    procedure: Procedure & { steps?: Step[] },
  ): boolean {
    if (procedure.statut === ProcedureStatus.COMPLETED) return false;
    const activeStep = procedure.steps?.find(
      (s) => s.statut === StepStatus.IN_PROGRESS,
    );
    if (!activeStep) return false;
    const stepDuration =
      (Date.now() - new Date(activeStep.dateCreation).getTime()) /
      (1000 * 60 * 60 * 24);
    return stepDuration > 14;
  }

  private getStepStatusLabel(status: StepStatus): string {
    const labels: Record<StepStatus, string> = {
      [StepStatus.PENDING]: 'En attente',
      [StepStatus.IN_PROGRESS]: 'En cours',
      [StepStatus.COMPLETED]: 'Terminée',
      [StepStatus.REJECTED]: 'Refusée',
      [StepStatus.CANCELLED]: 'Annulée',
    };
    return labels[status] || status;
  }

  private getStepStatusColor(status: StepStatus): string {
    const colors: Record<StepStatus, string> = {
      [StepStatus.PENDING]: 'gray',
      [StepStatus.IN_PROGRESS]: 'blue',
      [StepStatus.COMPLETED]: 'green',
      [StepStatus.REJECTED]: 'red',
      [StepStatus.CANCELLED]: 'orange',
    };
    return colors[status] || 'gray';
  }

  private getProcedureStatusLabel(status: ProcedureStatus): string {
    const labels: Record<ProcedureStatus, string> = {
      [ProcedureStatus.PENDING]: 'En attente',
      [ProcedureStatus.IN_PROGRESS]: 'En cours',
      [ProcedureStatus.COMPLETED]: 'Terminée',
      [ProcedureStatus.REJECTED]: 'Refusée',
      [ProcedureStatus.CANCELLED]: 'Annulée',
    };
    return labels[status] || status;
  }

  private getProcedureStatusColor(status: ProcedureStatus): string {
    const colors: Record<ProcedureStatus, string> = {
      [ProcedureStatus.PENDING]: 'yellow',
      [ProcedureStatus.IN_PROGRESS]: 'blue',
      [ProcedureStatus.COMPLETED]: 'green',
      [ProcedureStatus.REJECTED]: 'red',
      [ProcedureStatus.CANCELLED]: 'gray',
    };
    return colors[status] || 'blue';
  }

  private getNextStep(steps?: Step[]): StepName | undefined {
    if (!steps) return undefined;
    const sortedSteps = [...steps].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
    for (const step of sortedSteps) {
      if (step.statut === StepStatus.PENDING) {
        return step.nom;
      }
    }
    return undefined;
  }

  /**
   * Obtenir la destination réelle (gère le cas "Autre")
   */
  private getRealDestination(
    destination: string,
    destinationAutre?: string,
  ): string {
    return destination?.toLowerCase() === 'autre' && destinationAutre
      ? destinationAutre
      : destination;
  }

  /**
   * Obtenir le niveau d'étude réel (gère le cas "Autre")
   */
  private getRealNiveauEtude(
    niveauEtude: string,
    niveauEtudeAutre?: string,
  ): string {
    return niveauEtude?.toLowerCase() === 'autre' && niveauEtudeAutre
      ? niveauEtudeAutre
      : niveauEtude;
  }

  /**
   * Obtenir la filière réelle (gère le cas "Autre")
   */
  private getRealFiliere(filiere: string, filiereAutre?: string): string {
    return filiere?.toLowerCase() === 'autre' && filiereAutre
      ? filiereAutre
      : filiere;
  }

  /**
   * Estimer la date de complétion basée sur les étapes complétées
   */
  private estimateCompletionDate(steps?: Step[]): Date | undefined {
    if (!steps || steps.length === 0) return undefined;

    const completedSteps = steps.filter(
      (s) => s.statut === StepStatus.COMPLETED,
    );
    if (completedSteps.length === 0) return undefined;

    // Calculer la durée moyenne des étapes complétées
    const avgDuration =
      completedSteps.reduce((sum, step) => {
        if (!step.dateCompletion) return sum;
        const duration =
          (new Date(step.dateCompletion).getTime() -
            new Date(step.dateCreation).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + duration;
      }, 0) / completedSteps.length;

    // Estimer pour les étapes restantes
    const remainingSteps = steps.length - completedSteps.length;
    const estimatedDays = avgDuration * remainingSteps;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
    return estimatedDate;
  }

  // ==================== UTILITAIRES ====================

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT - CSV, Excel, PDF
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Génère un CSV à partir des procédures
   */
  private generateCSV(procedures: ProcedureResponseDto[]): string {
    const headers = [
      'ID',
      'Prénom',
      'Nom',
      'Nom complet',
      'Email',
      'Téléphone',
      'Destination',
      'Filière',
      "Niveau d'étude",
      'Statut',
      'Progression',
      'Étapes complétées',
      "Total d'étapes",
      'Date création',
      'Date modification',
      'Date complétion',
      'Raison rejet',
      'Supprimé',
      'Date suppression',
      'Raison suppression',
      'Date annulation',
      'Raison annulation',
    ];

    const rows = procedures.map((p) => [
      p.id,
      p.prenom,
      p.nom,
      p.fullName,
      p.email,
      p.telephone,
      p.effectiveDestination,
      p.effectiveFiliere,
      p.effectiveNiveauEtude,
      p.statusLabel,
      p.progress.toString(),
      p.completedSteps.toString(),
      p.totalSteps.toString(),
      new Date(p.createdAt).toLocaleDateString('fr-FR'),
      p.dateDerniereModification
        ? new Date(p.dateDerniereModification).toLocaleDateString('fr-FR')
        : '',
      p.dateCompletion
        ? new Date(p.dateCompletion).toLocaleDateString('fr-FR')
        : '',
      p.raisonRejet || '',
      p.isDeleted ? 'Oui' : 'Non',
      p.deletedAt ? new Date(p.deletedAt).toLocaleDateString('fr-FR') : '',
      p.deletionReason || '',
      p.cancelledAt ? new Date(p.cancelledAt).toLocaleDateString('fr-FR') : '',
      p.cancelledReason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Génère un fichier Excel à partir des procédures
   */
  private async generateExcel(
    procedures: ProcedureResponseDto[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Procédures');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Prénom', key: 'prenom', width: 15 },
      { header: 'Nom', key: 'nom', width: 15 },
      { header: 'Nom complet', key: 'fullName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'telephone', width: 15 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Filière', key: 'filiere', width: 20 },
      { header: "Niveau d'étude", key: 'niveauEtude', width: 15 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Progression', key: 'progress', width: 10 },
      { header: 'Étapes complétées', key: 'completedSteps', width: 15 },
      { header: "Total d'étapes", key: 'totalSteps', width: 15 },
      { header: 'Date création', key: 'createdAt', width: 15 },
      { header: 'Date modification', key: 'updatedAt', width: 15 },
      { header: 'Date complétion', key: 'dateCompletion', width: 15 },
      { header: 'Raison rejet', key: 'raisonRejet', width: 30 },
      { header: 'Supprimé', key: 'isDeleted', width: 10 },
      { header: 'Date suppression', key: 'deletedAt', width: 15 },
      { header: 'Raison suppression', key: 'deletionReason', width: 30 },
      { header: 'Date annulation', key: 'cancelledAt', width: 15 },
      { header: 'Raison annulation', key: 'cancelledReason', width: 30 },
    ];

    // Ajouter les données
    procedures.forEach((p) => {
      worksheet.addRow({
        id: p.id,
        prenom: p.prenom,
        nom: p.nom,
        fullName: p.fullName,
        email: p.email,
        telephone: p.telephone,
        destination: p.effectiveDestination,
        filiere: p.effectiveFiliere,
        niveauEtude: p.effectiveNiveauEtude,
        statut: p.statusLabel,
        progress: p.progress,
        completedSteps: p.completedSteps,
        totalSteps: p.totalSteps,
        createdAt: p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('fr-FR')
          : '',
        updatedAt: p.dateDerniereModification
          ? new Date(p.dateDerniereModification).toLocaleDateString('fr-FR')
          : '',
        dateCompletion: p.dateCompletion
          ? new Date(p.dateCompletion).toLocaleDateString('fr-FR')
          : '',
        raisonRejet: p.raisonRejet || '',
        isDeleted: p.isDeleted ? 'Oui' : 'Non',
        deletedAt: p.deletedAt
          ? new Date(p.deletedAt).toLocaleDateString('fr-FR')
          : '',
        deletionReason: p.deletionReason || '',
        cancelledAt: p.cancelledAt
          ? new Date(p.cancelledAt).toLocaleDateString('fr-FR')
          : '',
        cancelledReason: p.cancelledReason || '',
      });
    });

    // Styliser l'en-tête
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Génère un fichier PDF à partir des procédures
   */
  private async generatePDF(
    procedures: ProcedureResponseDto[],
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFKit({ margin: 50, size: 'A4', layout: 'landscape' });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Titre
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Liste des procédures', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, {
          align: 'center',
        });
      doc.moveDown(2);

      // Tableau
      const tableTop = 150;
      const rowHeight = 25;
      const colWidths = [80, 100, 80, 80, 60, 80, 80];

      // En-têtes
      const headers = [
        'Nom',
        'Email',
        'Destination',
        'Filière',
        'Statut',
        'Progression',
        'Date création',
      ];

      let y = tableTop;
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(header, x, y, { width: colWidths[i] - 5, align: 'left' });
      });

      // Lignes
      doc.font('Helvetica').fontSize(8);
      y += rowHeight;

      procedures.slice(0, 30).forEach((p, index) => {
        const row = [
          p.fullName,
          p.email,
          p.effectiveDestination,
          p.effectiveFiliere,
          p.statusLabel,
          `${p.progress}%`,
          new Date(p.createdAt).toLocaleDateString('fr-FR'),
        ];

        row.forEach((cell, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(cell, x, y, { width: colWidths[i] - 5, align: 'left' });
        });

        y += rowHeight;

        // Nouvelle page si nécessaire
        if (y > 550 && index < procedures.length - 1) {
          doc.addPage();
          y = 50;

          // Réafficher les en-têtes
          doc.font('Helvetica-Bold').fontSize(9);
          headers.forEach((header, i) => {
            const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.text(header, x, y, { width: colWidths[i] - 5, align: 'left' });
          });
          doc.font('Helvetica').fontSize(8);
          y += rowHeight;
        }
      });

      doc.end();
    });
  }

  /**
   * Export des procédures au format demandé
   */
  async exportProcedures(
    format: 'csv' | 'excel' | 'pdf',
    query: ProcedureQueryDto,
    currentUser: CurrentUser,
    res: Response,
  ): Promise<void> {
    // Vérifier les permissions (admin uniquement)
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut exporter les procédures',
      );
    }

    // Récupérer toutes les procédures (sans pagination)
    const { data: procedures } = await this.findAll(
      { ...query, limit: 1000 }, // Limite raisonnable
      currentUser,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `procedures-${timestamp}`;

    switch (format) {
      case 'csv': {
        const csv = this.generateCSV(procedures);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}.csv"`,
        );
        res.send(csv);
        break;
      }

      case 'excel': {
        const buffer = await this.generateExcel(procedures);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}.xlsx"`,
        );
        res.send(buffer);
        break;
      }

      case 'pdf': {
        const buffer = await this.generatePDF(procedures);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}.pdf"`,
        );
        res.send(buffer);
        break;
      }

      default:
        throw new BadRequestException(
          `Format non supporté: ${format as string}`,
        );
    }

    this.logger.log(
      `Export ${format as string} des procédures effectué par ${currentUser.email}`,
    );
  }

  private generateProcedureCreatedContent(procedure: {
    id: string;
    prenom: string;
    destination: string;
    filiere: string;
    statut: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nous avons le plaisir de vous informer que votre procédure d'admission a été créée avec succès.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
          <h3 style="margin-top:0;color:#10b981;">Détails de votre procédure</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Filière :</span> ${procedure.filiere}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#10b981;font-weight:600;">${procedure.statut}</span></div>
        </div>
        <p>Notre équipe va désormais vous accompagner pas à pas dans votre projet d'études.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="https://panameconsulting.com/dashboard" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Suivre ma procédure</a>
        </div>
      </div>`;
  }

  private generateProcedureStatusUpdatedContent(procedure: {
    id: string;
    prenom: string;
    destination: string;
    statut: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre procédure d'admission a été mise à jour.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Mise à jour de procédure</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Nouveau statut :</span> <span style="color:#0ea5e9;font-weight:600;">${procedure.statut}</span></div>
        </div>
        <p>Suivez votre dossier depuis votre espace personnel.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="https://panameconsulting.com/dashboard" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir ma procédure</a>
        </div>
      </div>`;
  }

  private generateProcedureDeletedContent(
    procedure: {
      id: string;
      prenom: string;
      destination: string;
    },
    reason: string,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre procédure d'admission a été supprimée.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
          <h3 style="margin-top:0;color:#ef4444;">Procédure supprimée</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          ${reason ? `<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${reason}</div>` : ''}
        </div>
        <p>Nous restons à votre disposition pour toute question ou pour créer une nouvelle procédure.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="https://panameconsulting.com/contact" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Nous contacter</a>
        </div>
      </div>`;
  }

  private generateProcedureCancelledContent(
    procedure: ProcedureResponseDto,
    reason: string,
    currentUser: CurrentUser,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Une procédure a été annulée par l'utilisateur.</p>
        <div style="background:#fef3c7;padding:25px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
          <h3 style="margin-top:0;color:#d97706;">Procédure annulée</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Étudiant :</span> ${procedure.prenom} ${procedure.nom}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Email :</span> ${procedure.email}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${reason}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Annulé par :</span> ${currentUser.email}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date d'annulation :</span> ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        <p>Veuillez contacter l'utilisateur si nécessaire pour plus d'informations.</p>
      </div>`;
  }
}
