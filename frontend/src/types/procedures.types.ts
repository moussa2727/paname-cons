// types/procedures.types.ts
// STRICTEMENT CALQUÉ sur les entités backend + DTOs

// ─── Enums (miroir Prisma) ────────────────────────────────────────────────────

export const ProcedureStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type ProcedureStatus =
  (typeof ProcedureStatus)[keyof typeof ProcedureStatus];

export const StepStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const StepName = {
  DEMANDE_ADMISSION: "DEMANDE_ADMISSION",
  DEMANDE_VISA: "DEMANDE_VISA",
  PREPARATIF_VOYAGE: "PREPARATIF_VOYAGE",
} as const;
export type StepName = (typeof StepName)[keyof typeof StepName];

export type SortOrder = "asc" | "desc";
export type GroupBy = "day" | "month" | "year";
export type ExportFormat = "csv" | "excel" | "pdf";
export type StatusColor =
  | "blue"
  | "green"
  | "red"
  | "gray"
  | "yellow"
  | "orange"; // Backend renvoie aussi "orange" pour CANCELLED

// ─── Types pour le hook (AJOUTÉS) ────────────────────────────────────────────

export interface ProcedureFilters {
  status?: ProcedureStatus;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  includeDeleted?: boolean;
  includeCompleted?: boolean;
}

export interface ProcedureLoadingState {
  list: boolean;
  details: boolean;
  statistics: boolean;
  create: boolean;
  update: boolean;
  updateStep: boolean;
  delete: boolean;
  report: boolean;
  export: boolean;
}

export interface ProcedurePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── DTO Création (create-procedure.dto.ts) ───────────────────────────────────

export interface CreateProcedureDto {
  rendezVousId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  filiere: string;
  filiereAutre?: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
}

// ─── DTO Mise à jour (update-procedure.dto.ts) ────────────────────────────────

export interface UpdateProcedureDto extends Partial<CreateProcedureDto> {
  raisonRejet?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletionReason?: string;
}

// ─── DTO Mise à jour étape (update-step.dto.ts) ───────────────────────────────

export interface UpdateStepDto {
  statut?: StepStatus;
  raisonRefus?: string;
  dateCompletion?: string;
}

// ─── DTO Query (procedure-query.dto.ts) ───────────────────────────────────────

export interface ProcedureQueryDto {
  page?: number;
  limit?: number;
  status?: ProcedureStatus;
  email?: string;
  destination?: string;
  filiere?: string;
  includeDeleted?: boolean;
  includeCompleted?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface ProcedureStatsQueryDto {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupBy;
}

// ─── DTO Réponse étape (StepResponseDto) ──────────────────────────────────────

export interface StepResponseDto {
  id: string;
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateCreation: Date;
  dateMaj: Date;
  dateCompletion?: Date;

  // Virtuals calculés (depuis procedure.entity.ts)
  canBeModified: boolean;
  duration?: number;
  isOverdue: boolean;
  statusLabel: string;
  statusColor: StatusColor;
}

// ─── DTO Réponse procédure (ProcedureResponseDto) ─────────────────────────────

export interface ProcedureResponseDto {
  id: string;
  rendezVousId?: string;
  prenom: string;
  nom: string;
  fullName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  effectiveDestination: string;
  filiere: string;
  filiereAutre?: string;
  effectiveFiliere: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
  effectiveNiveauEtude: string;
  statut: ProcedureStatus;
  raisonRejet?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletionReason?: string;
  dateCompletion?: Date;
  dateDerniereModification?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
  cancelledAt?: Date | null;
  cancelledReason?: string | null;
  cancelledBy?: string | null;

  // Relations
  steps: StepResponseDto[];
  rendezvousStatus?: string;
  rendezvousDate?: string;

  // Virtuals calculés (depuis procedure.entity.ts)
  progress: number;
  completedSteps: number;
  totalSteps: number;
  activeStep?: StepName;
  nextStep?: StepName;
  statusLabel: string;
  statusColor: StatusColor;
  canBeModified: boolean;
  daysSinceCreation: number;
  estimatedCompletionDate?: Date;
  isOverdue: boolean;
}

// ─── DTO Réponse paginée (PaginatedProcedureResponseDto) ─────────────────────

export interface PaginatedProcedureResponseDto {
  data: ProcedureResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── DTO Statistiques (ProcedureStatisticsDto) ────────────────────────────────

export interface ProcedureStatisticsDto {
  total: number;
  byStatus: Record<ProcedureStatus, number>;
  completionRate: number;
  rejectionRate: number;
  averageCompletionTime: number;
  newProcedures: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topDestinations: { destination: string; count: number }[];
  topFilieres: { filiere: string; count: number }[];
  stepsAnalytics?: {
    stepName: StepName;
    completionRate: number;
    averageTime: number;
  }[];
}

// ─── Types utilitaires API ────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: { field: string; message: string; value?: unknown }[];
  statusCode?: number;
}

export interface ApiResponse<T = unknown> {
  statusCode?: number;
  message?: string;
  data: T;
}
