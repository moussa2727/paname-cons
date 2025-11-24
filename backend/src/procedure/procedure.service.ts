import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Procedure,
  ProcedureStatus,
  Step,
  StepName,
  StepStatus,
} from "../schemas/procedure.schema";
import { Rendezvous } from "../schemas/rendezvous.schema";
import { CreateProcedureDto } from "./dto/create-procedure.dto";
import { UpdateProcedureDto } from "./dto/update-procedure.dto";
import { UpdateStepDto } from "./dto/update-step.dto";
import { NotificationService } from "../notification/notification.service";
import { UserRole } from "../schemas/user.schema";

@Injectable()
export class ProcedureService {
  private readonly logger = new Logger(ProcedureService.name);

  constructor(
    @InjectModel(Procedure.name) private procedureModel: Model<Procedure>,
    @InjectModel(Rendezvous.name) private rendezvousModel: Model<Rendezvous>,
    private notificationService: NotificationService,
  ) {}

  // ==================== CORE METHODS ====================

  async createFromRendezvous(
    createDto: CreateProcedureDto,
  ): Promise<Procedure> {
    const rendezvous = await this.rendezvousModel.findById(
      createDto.rendezVousId,
    );
    if (!rendezvous) throw new BadRequestException("Rendez-vous non trouvé");

    // Validation stricte
    if (rendezvous.status !== "Terminé") {
      throw new BadRequestException("Le rendez-vous doit être terminé");
    }
    if (rendezvous.avisAdmin !== "Favorable") {
      throw new BadRequestException("L'avis administratif doit être favorable");
    }

    const existingProcedure = await this.procedureModel.findOne({
      rendezVousId: createDto.rendezVousId,
      isDeleted: false,
    });
    if (existingProcedure)
      throw new BadRequestException("Une procédure existe déjà");

    const procedureData = {
      rendezVousId: rendezvous._id,
      prenom: rendezvous.firstName,
      nom: rendezvous.lastName,
      email: rendezvous.email,
      telephone: rendezvous.telephone,
      destination: rendezvous.destination,
      niveauEtude: rendezvous.niveauEtude,
      filiere: rendezvous.filiere,
      statut: ProcedureStatus.IN_PROGRESS,
      steps: this.initializeSteps(), // ✅ TOUJOURS 3 ÉTAPES
      isDeleted: false,
    };

    const procedure = await this.procedureModel.create(procedureData);

    this.logger.log(`✅ Procédure créée pour ${procedure.nom}`);
    await this.notificationService.sendProcedureCreation(procedure, rendezvous);

    return procedure;
  }

  async getProcedureDetails(id: string, user: any): Promise<Procedure> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID de procédure invalide");
    }

    const procedure = await this.procedureModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .populate(
        "rendezVousId",
        "firstName lastName date time status avisAdmin",
      );

    if (!procedure) throw new NotFoundException("Procédure non trouvée");

    // Vérification d'accès
    if (procedure.email !== user.email && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Accès non autorisé");
    }

    return procedure;
  }

  async updateProcedure(
    id: string,
    updateDto: UpdateProcedureDto,
  ): Promise<Procedure> {
    const procedure = await this.procedureModel.findByIdAndUpdate(
      id,
      { ...updateDto, dateDerniereModification: new Date() },
      { new: true, runValidators: true },
    );

    if (!procedure) throw new NotFoundException("Procédure non trouvée");

    this.logger.log(`📝 Procédure ${id} mise à jour`);
    return procedure;
  }

  private validateStepOrder(
    procedure: Procedure,
    stepName: StepName,
    newStatus: StepStatus,
  ): void {
    const steps = procedure.steps;

    // ✅ Récupérer l'étape actuelle
    const currentStep = steps.find((s) => s.nom === stepName);
    if (!currentStep) {
      throw new BadRequestException("Étape non trouvée dans la procédure");
    }

    // ❌ IMPOSSIBLE DE MODIFIER UNE ÉTAPE DÉJÀ FINALISÉE
    if (
      [
        StepStatus.COMPLETED,
        StepStatus.CANCELLED,
        StepStatus.REJECTED,
      ].includes(currentStep.statut) &&
      currentStep.statut !== newStatus
    ) {
      throw new BadRequestException(
        `Impossible de modifier une étape ${currentStep.statut.toLowerCase()}`,
      );
    }

    // ✅ VALIDATION STRICTE DE L'ORDRE DES ÉTAPES

    // 1. DEMANDE VISA → VÉRIFIER QUE L'ADMISSION EST TERMINÉE
    if (stepName === StepName.DEMANDE_VISA) {
      const admissionStep = steps.find(
        (s) => s.nom === StepName.DEMANDE_ADMISSION,
      );

      if (!admissionStep) {
        throw new BadRequestException("Étape d'admission non trouvée");
      }

      if (admissionStep.statut !== StepStatus.COMPLETED) {
        throw new BadRequestException(
          "La demande d'admission doit être terminée avant de pouvoir modifier la demande de visa",
        );
      }

      // ✅ VÉRIFICATION SUPPLÉMENTAIRE : Si on veut passer Visa à "En cours", Admission doit être "Terminé"
      if (
        newStatus === StepStatus.IN_PROGRESS &&
        admissionStep.statut !== StepStatus.COMPLETED
      ) {
        throw new BadRequestException(
          "Impossible de démarrer la demande de visa tant que l'admission n'est pas terminée",
        );
      }
    }

    // 2. PRÉPARATIFS VOYAGE → VÉRIFIER QUE LE VISA EST TERMINÉ
    if (stepName === StepName.PREPARATIF_VOYAGE) {
      const visaStep = steps.find((s) => s.nom === StepName.DEMANDE_VISA);

      if (!visaStep) {
        throw new BadRequestException("Étape de demande de visa non trouvée");
      }

      if (visaStep.statut !== StepStatus.COMPLETED) {
        throw new BadRequestException(
          "La demande de visa doit être terminée avant de pouvoir modifier les préparatifs de voyage",
        );
      }

      // VÉRIFICATION SUPPLÉMENTAIRE : Si on veut passer Préparatifs à "En cours", Visa doit être "Terminé"
      if (
        newStatus === StepStatus.IN_PROGRESS &&
        visaStep.statut !== StepStatus.COMPLETED
      ) {
        throw new BadRequestException(
          "Impossible de démarrer les préparatifs de voyage tant que le visa n'est pas obtenu",
        );
      }
    }

    // VALIDATION : RAISON OBLIGATOIRE POUR LES REJETS
    if (newStatus === StepStatus.REJECTED) {
      // La raison sera validée dans la méthode appelante avec le DTO
    }

    // VALIDATION : IMPOSSIBLE DE REVENIR EN ARRIÈRE
    if (
      currentStep.statut === StepStatus.COMPLETED &&
      newStatus !== StepStatus.COMPLETED
    ) {
      throw new BadRequestException(
        "Impossible de modifier le statut d'une étape déjà terminée",
      );
    }

    // VALIDATION : IMPOSSIBLE DE REPRENDRE UNE ÉTAPE REJETÉE/ANNULÉE
    if (
      [StepStatus.REJECTED, StepStatus.CANCELLED].includes(
        currentStep.statut,
      ) &&
      [StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(newStatus)
    ) {
      throw new BadRequestException(
        `Impossible de reprendre une étape ${currentStep.statut.toLowerCase()}`,
      );
    }
  }

  async updateStep(
    id: string,
    stepName: string,
    updateDto: UpdateStepDto,
  ): Promise<Procedure> {
    try {
      this.logger.log(
        `🔄 Début mise à jour étape - ID: ${id}, Étape: ${stepName}`,
      );

      // DÉCODAGE SÉCURISÉ
      let decodedStepName: string;
      try {
        decodedStepName = decodeURIComponent(stepName);
        this.logger.log(`🔍 Étape décodée: "${decodedStepName}"`);
      } catch (decodeError) {
        throw new BadRequestException(`Nom d'étape mal formé: ${stepName}`);
      }

      // VALIDATION DU NOM D'ÉTAPE
      const validStepNames = Object.values(StepName);
      if (!validStepNames.includes(decodedStepName as StepName)) {
        this.logger.error(
          `❌ Nom d'étape invalide: "${decodedStepName}". Valides: ${validStepNames.join(", ")}`,
        );
        throw new BadRequestException(
          `Nom d'étape invalide: "${decodedStepName}". ` +
            `Étapes valides: ${validStepNames.join(", ")}`,
        );
      }

      // RECHERCHE DE LA PROCÉDURE
      const procedure = await this.procedureModel.findById(id).exec();
      if (!procedure) {
        this.logger.error(`❌ Procédure non trouvée: ${id}`);
        throw new NotFoundException("Procédure non trouvée");
      }

      // RECHERCHE DE L'ÉTAPE
      const stepIndex = procedure.steps.findIndex(
        (step: Step) => step.nom === decodedStepName,
      );
      if (stepIndex === -1) {
        this.logger.error(
          `❌ Étape non trouvée: "${decodedStepName}" dans la procédure ${id}`,
        );
        throw new NotFoundException(
          `Étape "${decodedStepName}" non trouvée dans cette procédure`,
        );
      }

      // ✅ CORRECTION : Validation améliorée des données
      if (
        updateDto.statut === StepStatus.REJECTED &&
        (!updateDto.raisonRefus || updateDto.raisonRefus.trim() === "")
      ) {
        throw new BadRequestException(
          'La raison du refus est obligatoire lorsque le statut est "Rejeté"',
        );
      }

      // ✅ VALIDATION DE L'ORDRE DES ÉTAPES
      if (updateDto.statut) {
        this.validateStepOrder(
          procedure,
          decodedStepName as StepName,
          updateDto.statut,
        );
      }

      const now = new Date();

      // ✅ CORRECTION : Construction robuste de l'étape mise à jour
      const existingStep = procedure.steps[stepIndex];

      // Créer un nouvel objet étape avec seulement les champs autorisés
      const updatedStep: Step = {
        nom: existingStep.nom, // ✅ GARDER le nom original
        statut:
          updateDto.statut !== undefined
            ? updateDto.statut
            : existingStep.statut,
        raisonRefus:
          updateDto.raisonRefus !== undefined
            ? updateDto.raisonRefus
            : existingStep.raisonRefus,
        dateCreation: existingStep.dateCreation, // ✅ PRÉSERVER la date de création
        dateMaj: now, // ✅ Mettre à jour la date de modification
      };

      // ✅ CORRECTION : Mise à jour propre de l'étape
      procedure.steps[stepIndex] = updatedStep;

      // ✅ MISE À JOUR DU STATUT GLOBAL
      this.updateProcedureGlobalStatus(procedure);

      // ✅ SAUVEGARDE
      const savedProcedure = await procedure.save();

      // ✅ GESTION AUTOMATIQUE DE L'ÉTAPE SUIVANTE
      if (
        updateDto.statut === StepStatus.COMPLETED &&
        stepIndex < procedure.steps.length - 1
      ) {
        const nextStep = procedure.steps[stepIndex + 1];
        if (nextStep.statut === StepStatus.PENDING) {
          this.logger.log(
            `🔄 Activation automatique backend de l'étape suivante: ${nextStep.nom}`,
          );
          nextStep.statut = StepStatus.IN_PROGRESS;
          nextStep.dateMaj = now;
          await procedure.save();
        }
      }

      // ✅ NOTIFICATION
      try {
        await this.notificationService.sendProcedureUpdate(savedProcedure);
      } catch (notificationError) {
        this.logger.warn(
          `⚠️ Erreur notification: ${notificationError.message}`,
        );
      }

      return savedProcedure;
    } catch (error) {
      this.logger.error(
        `❌ Erreur critique mise à jour étape "${stepName}" pour ${id}:`,
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ CORRECTION : Meilleur message d'erreur pour le frontend
      throw new InternalServerErrorException(
        `Erreur lors de la mise à jour de l'étape: ${error.message}`,
      );
    }
  }

  async findByEmail(email: string): Promise<Procedure[]> {
    if (!email) {
      throw new BadRequestException("Email est requis");
    }

    return this.procedureModel
      .find({
        email: email.toLowerCase(),
        isDeleted: false,
      })
      .populate(
        "rendezVousId",
        "firstName lastName date time status avisAdmin",
      );
  }

  private updateProcedureGlobalStatus(procedure: Procedure): void {
    if (!procedure.steps || procedure.steps.length === 0) {
      procedure.statut = ProcedureStatus.IN_PROGRESS;
      return;
    }

    const allCompleted = procedure.steps.every(
      (step: Step) => step.statut === StepStatus.COMPLETED,
    );
    const anyRejected = procedure.steps.some(
      (step: Step) => step.statut === StepStatus.REJECTED,
    );
    const anyCancelled = procedure.steps.some(
      (step: Step) => step.statut === StepStatus.CANCELLED,
    );

    if (anyRejected) {
      procedure.statut = ProcedureStatus.REJECTED;
      const rejectedStep = procedure.steps.find(
        (step: Step) => step.statut === StepStatus.REJECTED,
      );
      procedure.raisonRejet = rejectedStep?.raisonRefus;
    } else if (anyCancelled) {
      procedure.statut = ProcedureStatus.CANCELLED;
    } else if (allCompleted) {
      procedure.statut = ProcedureStatus.COMPLETED;
      procedure.dateCompletion = new Date();
    } else {
      procedure.statut = ProcedureStatus.IN_PROGRESS;
    }
  }

  // ==================== USER METHODS ====================

  async getUserProcedures(email: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const query = { email: email.toLowerCase(), isDeleted: false };

    const [data, total] = await Promise.all([
      this.procedureModel
        .find(query)
        .populate("rendezVousId", "firstName lastName date time status")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.procedureModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cancelProcedure(
    id: string,
    userEmail: string,
    reason?: string,
  ): Promise<Procedure> {
    const procedure = await this.procedureModel.findById(id);
    if (!procedure) throw new NotFoundException("Procédure non trouvée");

    if (procedure.email !== userEmail.toLowerCase()) {
      throw new ForbiddenException(
        "Vous ne pouvez annuler que vos propres procédures",
      );
    }

    if (
      [ProcedureStatus.COMPLETED, ProcedureStatus.CANCELLED].includes(
        procedure.statut,
      )
    ) {
      throw new BadRequestException("Procédure déjà finalisée");
    }

    procedure.isDeleted = true;
    procedure.deletedAt = new Date();
    procedure.deletionReason = reason || "Annulée par l'utilisateur";
    procedure.statut = ProcedureStatus.CANCELLED;
    procedure.steps.forEach((step) => {
      if ([StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(step.statut)) {
        step.statut = StepStatus.CANCELLED;
        step.dateMaj = new Date();
      }
    });

    const savedProcedure = await procedure.save();
    await this.notificationService.sendCancellationNotification(savedProcedure);

    this.logger.log(
      `❌ Procédure annulée par l'utilisateur: ${procedure.email}`,
    );
    return savedProcedure;
  }

  // ==================== ADMIN METHODS ====================

  async getActiveProcedures(
    page: number = 1,
    limit: number = 10,
    email?: string,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    if (email) query.email = email.toLowerCase();

    const [data, total] = await Promise.all([
      this.procedureModel
        .find(query)
        .select(
          "prenom nom email telephone destination filiere statut steps createdAt",
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.procedureModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string, reason?: string): Promise<Procedure> {
    const procedure = await this.procedureModel.findById(id);
    if (!procedure) throw new NotFoundException("Procédure non trouvée");

    procedure.isDeleted = true;
    procedure.deletedAt = new Date();
    procedure.deletionReason = reason || "Supprimée par l'administrateur";
    procedure.statut = ProcedureStatus.CANCELLED;

    procedure.steps.forEach((step) => {
      if ([StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(step.statut)) {
        step.statut = StepStatus.CANCELLED;
        step.dateMaj = new Date();
      }
    });

    const savedProcedure = await procedure.save();

    this.logger.log(
      `🗑️ Procédure marquée comme supprimée (soft delete): ${id}`,
    );
    return savedProcedure;
  }

  async getProceduresOverview() {
    const [byStatus, byDestination, total] = await Promise.all([
      this.procedureModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$statut", count: { $sum: 1 } } },
      ]),
      this.procedureModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$destination", count: { $sum: 1 } } },
      ]),
      this.procedureModel.countDocuments({ isDeleted: false }),
    ]);

    return { byStatus, byDestination, total };
  }

  // ==================== UTILITY METHODS ====================

  private initializeSteps(): Step[] {
    // ✅ TOUJOURS 3 ÉTAPES OBLIGATOIRES
    return [
      {
        nom: StepName.DEMANDE_ADMISSION,
        statut: StepStatus.IN_PROGRESS, // Première étape active
        dateCreation: new Date(),
        dateMaj: new Date(),
      },
      {
        nom: StepName.DEMANDE_VISA,
        statut: StepStatus.PENDING, // En attente de l'admission
        dateCreation: new Date(),
        dateMaj: new Date(),
      },
      {
        nom: StepName.PREPARATIF_VOYAGE,
        statut: StepStatus.PENDING, // En attente du visa
        dateCreation: new Date(),
        dateMaj: new Date(),
      },
    ];
  }

  async rejectProcedure(id: string, reason: string): Promise<Procedure> {
    const procedure = await this.procedureModel.findById(id);
    if (!procedure) throw new NotFoundException("Procédure non trouvée");

    procedure.statut = ProcedureStatus.REJECTED;
    procedure.raisonRejet = reason;

    // ✅ CORRECTION : TOUTES les étapes sont rejetées (même celles terminées)
    procedure.steps.forEach((step) => {
      // Peu importe le statut actuel, on rejette TOUT
      step.statut = StepStatus.REJECTED;
      step.raisonRefus = reason; // Même raison pour toutes les étapes
      step.dateMaj = new Date();

      // Si l'étape n'avait pas de date de completion, on la met à jour
      if (!step.dateCompletion) {
        step.dateCompletion = new Date();
      }
    });

    const saved = await procedure.save();
    await this.notificationService.sendProcedureUpdate(saved);

    this.logger.log(`❌ Procédure rejetée: ${id}`);
    return saved;
  }
}
