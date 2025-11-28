import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cron } from "@nestjs/schedule";
import { ProcedureService } from "../procedure/procedure.service";
import { NotificationService } from "../notification/notification.service";
import { Rendezvous } from "../schemas/rendezvous.schema";
import { CreateRendezvousDto } from "./dto/create-rendezvous.dto";
import { UpdateRendezvousDto } from "./dto/update-rendezvous.dto";
import { UserRole } from "@/schemas/user.schema";
import { CreateProcedureDto } from "@/procedure/dto/create-procedure.dto";

const HOLIDAYS_2025 = [
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-01",
  "2025-05-08",
  "2025-05-29",
  "2025-06-08",
  "2025-06-09",
  "2025-07-14",
  "2025-08-15",
  "2025-11-01",
  "2025-11-11",
  "2025-12-25",
];

@Injectable()
export class RendezvousService {
  private readonly logger = new Logger(RendezvousService.name);
  private readonly MAX_SLOTS_PER_DAY = 24;
  private readonly WORKING_HOURS = { start: 9, end: 16.5 };

  constructor(
    @InjectModel(Rendezvous.name) private rendezvousModel: Model<Rendezvous>,
    private procedureService: ProcedureService,
    private notificationService: NotificationService,
  ) {}

  // ==================== CORE METHODS ====================

  async create(createDto: CreateRendezvousDto): Promise<Rendezvous> {
    this.logger.log(`Création rendez-vous pour un utilisateur.`);

    // Vérifier s'il y a déjà un rendez-vous en cours
    const pendingCount = await this.rendezvousModel.countDocuments({
      email: createDto.email,
      status: { $in: ["En attente", "Confirmé"] },
    });

    if (pendingCount >= 1) {
      throw new BadRequestException("Vous avez déjà un rendez-vous en cours");
    }

    // Traitement des champs "Autre" et validation
    const processedData = this.processAndValidateRendezvousData(createDto);

    // Vérifier la disponibilité
    const isAvailable = await this.isSlotAvailable(
      processedData.date,
      processedData.time,
    );
    if (!isAvailable) {
      throw new BadRequestException("Ce créneau horaire n'est pas disponible");
    }

    // Vérifier le nombre maximum de créneaux par jour
    const dayCount = await this.rendezvousModel.countDocuments({
      date: processedData.date,
      status: { $ne: "Annulé" },
    });

    if (dayCount >= this.MAX_SLOTS_PER_DAY) {
      throw new BadRequestException(
        "Tous les créneaux sont complets pour cette date",
      );
    }

    // Créer le rendez-vous
    const created = new this.rendezvousModel({
      ...processedData,
      status: "En attente",
    });

    const saved = await created.save();
    this.logger.log(`Rendez-vous créé .`);

    // Notification
    await this.sendNotification(saved, "confirmation");

    return saved;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
    date?: string,
    search?: string,
  ): Promise<{ data: Rendezvous[]; total: number }> {
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (status) filters.status = status;
    if (date) filters.date = date;
    if (search) {
      filters.$or = [
        { email: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.rendezvousModel
        .find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ date: 1, time: 1 })
        .exec(),
      this.rendezvousModel.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findByUser(
    email: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{ data: Rendezvous[]; total: number }> {
    const skip = (page - 1) * limit;

    const filters: any = { email };
    if (status) filters.status = status;

    const [data, total] = await Promise.all([
      this.rendezvousModel
        .find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ date: -1, time: 1 })
        .exec(),
      this.rendezvousModel.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<Rendezvous | null> {
    return this.rendezvousModel.findById(id).exec();
  }

  async update(
    id: string,
    updateDto: UpdateRendezvousDto,
    user: any,
  ): Promise<Rendezvous> {
    const rdv = await this.rendezvousModel.findById(id);
    if (!rdv) {
      throw new NotFoundException("Rendez-vous non trouvé");
    }

    // Vérifier les permissions
    if (user.role !== UserRole.ADMIN && rdv.email !== user.email) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres rendez-vous",
      );
    }

    // Validation des données si nécessaire
    if (updateDto.date || updateDto.time) {
      const date = updateDto.date || rdv.date;
      const time = updateDto.time || rdv.time;
      this.validateDateConstraints(date);
      this.validateTimeSlot(time);

      if (updateDto.date || updateDto.time) {
        const isAvailable = await this.isSlotAvailable(date, time, id);
        if (!isAvailable) {
          throw new BadRequestException(
            "Ce créneau horaire n'est pas disponible",
          );
        }
      }
    }

    const updated = await this.rendezvousModel.findByIdAndUpdate(
      id,
      updateDto,
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException("Rendez-vous non trouvé après mise à jour");
    }

    this.logger.log(`Rendez-vous mis à jour.`);
    return updated;
  }

  async updateStatus(
    id: string,
    status: string,
    avisAdmin?: string,
    user?: any,
  ): Promise<Rendezvous> {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Accès réservé aux administrateurs");
    }

    const allowedStatuses = ["En attente", "Confirmé", "Terminé", "Annulé"];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException("Statut invalide");
    }

    if (status === "Terminé" && !avisAdmin) {
      throw new BadRequestException(
        "L'avis admin est obligatoire pour terminer un rendez-vous",
      );
    }

    const update: any = { status };
    if (avisAdmin !== undefined) {
      update.avisAdmin = avisAdmin;
    }

    const updated = await this.rendezvousModel.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException("Rendez-vous non trouvé");
    }

    this.logger.log(`Statut mis à jour: ${status}`);

    // Notification
    await this.sendNotification(updated, "status");

    // Création automatique de procédure si conditions remplies
    if (avisAdmin === "Favorable" && status === "Terminé") {
      await this.createProcedureIfEligible(updated);
    }

    return updated;
  }

  async removeWithPolicy(id: string, user: any): Promise<Rendezvous> {
    const rdv = await this.rendezvousModel.findById(id);
    if (!rdv) {
      throw new NotFoundException("Rendez-vous non trouvé");
    }

    const isAdmin = user.role === UserRole.ADMIN;

    // Vérifier les permissions
    if (!isAdmin && rdv.email !== user.email) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que vos propres rendez-vous",
      );
    }

    // Restriction horaire pour les utilisateurs
    if (!isAdmin) {
      const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
      const now = new Date();
      const diffMs = rdvDateTime.getTime() - now.getTime();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (diffMs <= twoHoursMs) {
        throw new BadRequestException(
          "Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l'heure prévue",
        );
      }
    }

    // ⚠️ CORRECTION : SOFT DELETE au lieu de suppression définitive changement de statut en Annulé
    const updated = await this.rendezvousModel.findByIdAndUpdate(
      id,
      {
        status: "Annulé",
        cancelledAt: new Date(),
        cancelledBy: user.role === UserRole.ADMIN ? "admin" : "user",
        cancellationReason:
          user.role === UserRole.ADMIN
            ? "Annulé par l'administrateur"
            : "Annulé par l'utilisateur",
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException("Rendez-vous non trouvé après annulation");
    }

    this.logger.log(`Rendez-vous annulé (soft delete).`);

    // Notification d'annulation
    await this.sendNotification(updated, "status");

    return updated;
  }

  async confirmByUser(id: string, user: any): Promise<Rendezvous> {
    const rdv = await this.rendezvousModel.findById(id);
    if (!rdv) {
      throw new NotFoundException("Rendez-vous non trouvé");
    }

    // Vérifier les permissions
    if (rdv.email !== user.email) {
      throw new ForbiddenException(
        "Vous ne pouvez confirmer que vos propres rendez-vous",
      );
    }

    if (rdv.status !== "En attente") {
      throw new BadRequestException(
        "Seuls les rendez-vous en attente peuvent être confirmés",
      );
    }

    // Vérifier que le rendez-vous n'est pas passé
    const now = new Date();
    const rdvDateTime = new Date(`${rdv.date}T${rdv.time}`);
    if (rdvDateTime < now) {
      throw new BadRequestException(
        "Impossible de confirmer un rendez-vous passé",
      );
    }

    const updated = await this.rendezvousModel.findByIdAndUpdate(
      id,
      { status: "Confirmé" },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException("Rendez-vous non trouvé après confirmation");
    }

    this.logger.log(`Rendez-vous confirmé.`);
    await this.sendNotification(updated, "status");

    return updated;
  }

  // ==================== AVAILABILITY METHODS ====================

  async getAvailableSlots(date: string): Promise<string[]> {
    if (this.isWeekend(date) || this.isHoliday(date)) {
      return [];
    }

    const occupiedSlots = await this.getOccupiedSlots(date);
    const allSlots = this.generateTimeSlots();

    // Filtrer les créneaux passés si c'est aujourd'hui
    const today = new Date().toISOString().split("T")[0];
    if (date === today) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      return allSlots.filter((slot) => {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotTime = hours * 60 + minutes;
        return slotTime > currentTime && !occupiedSlots.includes(slot);
      });
    }

    return allSlots.filter((slot) => !occupiedSlots.includes(slot));
  }

  async getAvailableDates(): Promise<string[]> {
    const availableDates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      if (this.isWeekend(dateStr) || this.isHoliday(dateStr)) {
        continue;
      }

      const dayCount = await this.rendezvousModel.countDocuments({
        date: dateStr,
        status: { $ne: "Annulé" },
      });

      if (dayCount < this.MAX_SLOTS_PER_DAY) {
        availableDates.push(dateStr);
      }
    }

    return availableDates;
  }

  // ==================== PRIVATE METHODS ====================

  private processAndValidateRendezvousData(
    createDto: CreateRendezvousDto,
  ): any {
    const processed = { ...createDto };

    // Traitement des champs "Autre"
    if (processed.destination === "Autre" && processed.destinationAutre) {
      processed.destination = processed.destinationAutre.trim();
    } else if (processed.destination !== "Autre") {
      processed.destinationAutre = undefined;
    }

    if (processed.filiere === "Autre" && processed.filiereAutre) {
      processed.filiere = processed.filiereAutre.trim();
    } else if (processed.filiere !== "Autre") {
      processed.filiereAutre = undefined;
    }

    // Validation des champs requis
    if (!processed.destination?.trim()) {
      throw new BadRequestException("La destination est obligatoire");
    }
    if (!processed.filiere?.trim()) {
      throw new BadRequestException("La filière est obligatoire");
    }

    // Validation date et heure
    this.validateDateConstraints(processed.date);
    this.validateTimeSlot(processed.time);

    return processed;
  }

  private validateDateConstraints(dateStr: string): void {
    if (this.isWeekend(dateStr)) {
      throw new BadRequestException(
        "Les réservations sont fermées le week-end",
      );
    }

    if (this.isHoliday(dateStr)) {
      throw new BadRequestException(
        "Les réservations sont fermées les jours fériés",
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException(
        "Vous ne pouvez pas réserver une date passée",
      );
    }
  }

  private validateTimeSlot(time: string): void {
    const [hours, minutes] = time.split(":").map(Number);
    const timeInHours = hours + minutes / 60;

    if (
      timeInHours < this.WORKING_HOURS.start ||
      timeInHours > this.WORKING_HOURS.end
    ) {
      throw new BadRequestException(
        "Les horaires disponibles sont entre 9h00 et 16h30",
      );
    }

    const totalMinutes = (hours - 9) * 60 + minutes;
    if (totalMinutes % 30 !== 0) {
      throw new BadRequestException(
        "Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)",
      );
    }
  }

  private async isSlotAvailable(
    date: string,
    time: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query: any = {
      date,
      time,
      status: { $ne: "Annulé" },
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await this.rendezvousModel.findOne(query);
    return !existing;
  }

  private async getOccupiedSlots(date: string): Promise<string[]> {
    const results = await this.rendezvousModel
      .find({
        date,
        status: { $ne: "Annulé" },
      })
      .select("time -_id")
      .lean();

    return results.map((r) => r.time);
  }

  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let hour = 9; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 16) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    return slots;
  }

  private isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date.getDay() === 0 || date.getDay() === 6;
  }

  private isHoliday(dateStr: string): boolean {
    return HOLIDAYS_2025.includes(dateStr);
  }

  private async sendNotification(
    rendezvous: Rendezvous,
    type: "confirmation" | "status" | "reminder",
  ): Promise<void> {
    try {
      switch (type) {
        case "confirmation":
          await this.notificationService.sendConfirmation(rendezvous);
          break;
        case "status":
          await this.notificationService.sendStatusUpdate(rendezvous);
          break;
        case "reminder":
          await this.notificationService.sendReminder(rendezvous);
          break;
      }
      this.logger.log(`Notification ${type} envoyée.`);
    } catch (error) {
      this.logger.error(`Erreur notification ${type}: ${error.message}`);
    }
  }

  private async createProcedureIfEligible(
    rendezvous: Rendezvous,
  ): Promise<void> {
    this.logger.log(`Vérification éligibilité procédure.`);

    const existingProcedure = await this.procedureService.findByEmail(
      rendezvous.email,
    );

    if (!existingProcedure || existingProcedure.length === 0) {
      try {
        const createDto: CreateProcedureDto = {
          rendezVousId: rendezvous._id.toString(),
        };
        await this.procedureService.createFromRendezvous(createDto);
        this.logger.log(`Procédure créée`);
        await this.sendNotification(rendezvous, "status"); // Notification procédure créée
      } catch (error) {
        this.logger.error(`Erreur création procédure: ${error.message}`);
      }
    } else {
      this.logger.log(`Procédure déjà existante.`);
    }
  }

  // ==================== CRON JOBS ====================

  @Cron("0 9 * * *")
  async sendDailyReminders(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const rendezvous = await this.rendezvousModel.find({
      date: today,
      status: "Confirmé",
    });

    this.logger.log(`Envoi rappels.`);

    for (const rdv of rendezvous) {
      await this.sendNotification(rdv, "reminder");
    }
  }

  @Cron("0 * * * *")
  async updatePastRendezVous(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const result = await this.rendezvousModel.updateMany(
      {
        date: { $lt: today },
        status: { $in: ["En attente", "Confirmé"] },
      },
      { $set: { status: "Terminé" } },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Rendez-vous passés mis à jour.`);
    }
  }

  @Cron("0 * * * *")
  async autoCancelPendingRendezvous(): Promise<void> {
    const fiveHoursAgo = new Date();
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

    const result = await this.rendezvousModel.updateMany(
      {
        status: "En attente",
        createdAt: { $lt: fiveHoursAgo },
      },
      { $set: { status: "Annulé" } },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Rendez-vous automatiquement annulés.`);
    }
  }
}
