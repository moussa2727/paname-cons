// types/procedures.types.ts
// Types strictement basés sur les DTOs backend

// ─── Enums (miroir Prisma) ────────────────────────────────────────────────────
export type ProcedureStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type StepName = 'DEMANDE_ADMISSION' | 'DEMANDE_VISA' | 'PREPARATIF_VOYAGE';
export type SortOrder = 'asc' | 'desc';
export type ExportFormat = 'csv' | 'excel' | 'pdf';

// ─── DTOs ────────────────────────────────────────────────────────────────────
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

export interface UpdateProcedureDto extends Partial<CreateProcedureDto> {
  raisonRejet?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletionReason?: string;
}

export interface UpdateStepDto {
  statut?: StepStatus;
  raisonRefus?: string;
  dateCompletion?: string;
}

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

// ─── Réponses ────────────────────────────────────────────────────────────────
export interface StepResponseDto {
  id: string;
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateCreation: Date;
  dateMaj: Date;
  dateCompletion?: Date;
  canBeModified: boolean;
  duration?: number;
  isOverdue: boolean;
  statusLabel: string;
  statusColor: string;
}

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
  steps: StepResponseDto[];
  rendezvousStatus?: string;
  rendezvousDate?: string;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  activeStep?: StepName;
  nextStep?: StepName;
  statusLabel: string;
  statusColor: string;
  canBeModified: boolean;
  daysSinceCreation: number;
  estimatedCompletionDate?: Date;
  isOverdue: boolean;
}

export interface PaginatedProcedureResponseDto {
  data: ProcedureResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

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
}

// ─── Types pour le hook ──────────────────────────────────────────────────────
export interface ProcedureFilters {
  status?: ProcedureStatus;
  searchTerm?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  includeDeleted?: boolean;
  includeCompleted?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ProcedureLoadingState {
  list: boolean;
  details: boolean;
  statistics: boolean;
  create: boolean;
  update: boolean;
  updateStep: boolean;
  delete: boolean;
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

export interface ApiError {
  message: string;
  statusCode?: number;
}