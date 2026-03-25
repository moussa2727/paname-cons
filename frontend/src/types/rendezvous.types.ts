// ============================================================
// rendezvous.types.ts
// Version alignée strictement sur le backend Prisma
// Structure: COMMUN > USER > ADMIN
// ============================================================

// ==================== PARTIE COMMUNE ====================
// ==================== ENUMS (Miroir EXACT du backend) ====================

/**
 * Créneaux horaires - Correspond exactement à Prisma TimeSlot
 * Pause déjeuner : 12:00 est autorisé, 12:30-14:00 exclu
 */
export const TimeSlot = {
  SLOT_0900: "SLOT_0900",
  SLOT_0930: "SLOT_0930",
  SLOT_1000: "SLOT_1000",
  SLOT_1030: "SLOT_1030",
  SLOT_1100: "SLOT_1100",
  SLOT_1130: "SLOT_1130",
  SLOT_1200: "SLOT_1200", // 12:00 est autorisé
  // Pause déjeuner 12:30-14:00 exclue
  SLOT_1400: "SLOT_1400",
  SLOT_1430: "SLOT_1430",
  SLOT_1500: "SLOT_1500",
  SLOT_1530: "SLOT_1530",
  SLOT_1600: "SLOT_1600",
  SLOT_1630: "SLOT_1630",
} as const;
export type TimeSlot = keyof typeof TimeSlot;

/**
 * Statuts du rendez-vous - Correspond exactement à Prisma RendezvousStatus
 */
export const RendezvousStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type RendezvousStatus =
  (typeof RendezvousStatus)[keyof typeof RendezvousStatus];

/**
 * Avis administrateur - Correspond exactement à Prisma AdminOpinion
 */
export const AdminOpinion = {
  FAVORABLE: "FAVORABLE",
  UNFAVORABLE: "UNFAVORABLE",
} as const;
export type AdminOpinion = (typeof AdminOpinion)[keyof typeof AdminOpinion];

/**
 * Annulé par - Correspond exactement à Prisma CancelledBy
 */
export const CancelledBy = {
  USER: "USER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type CancelledBy = (typeof CancelledBy)[keyof typeof CancelledBy];

// ==================== DTOs COMMUNS (Partagés User/Admin) ====================

/**
 * User info dans les relations
 */
export interface UserInfoDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Procedure info dans les relations
 */
export interface ProcedureInfoDto {
  id: string;
  statut: string;
}

/**
 * RendezvousResponseDto - Correspond exactement à ce que le backend renvoie
 */
export interface RendezvousResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string | null;
  effectiveDestination: string;
  niveauEtude: string;
  niveauEtudeAutre?: string | null;
  effectiveNiveauEtude: string;
  filiere: string;
  filiereAutre?: string | null;
  effectiveFiliere: string;
  date: string;
  time: TimeSlot;
  dateTime: string;
  status: RendezvousStatus;
  avisAdmin?: AdminOpinion | null;
  cancelledAt?: string | null;
  cancelledBy?: CancelledBy | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  user?: UserInfoDto | null;
  procedure?: ProcedureInfoDto | null;
  canCancel: boolean;
  canModify: boolean;
  isPast: boolean;
  isToday: boolean;
  minutesUntilRendezvous: number;
  lunchBreakInfo?: {
    lunchBreakStart: string;
    lunchBreakEnd: string;
    isLunchBreak: boolean;
  };
}

/**
 * TimeSlot with metadata
 */
export interface TimeSlotWithMeta {
  time: string;
  available: boolean;
  isPast?: boolean;
  isLunchBreak?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

/**
 * AvailableSlotsDto
 */
export interface AvailableSlotsDto {
  date: string;
  available: boolean;
  reason?: string;
  availableSlots: string[]; // Tableau de strings comme dans le backend
  totalSlots: number;
  occupiedSlots: number;
}

/**
 * AvailabilityCheckDto
 */
export interface AvailabilityCheckDto {
  available: boolean;
  date: string;
  time: TimeSlot;
  message?: string;
  alternativeSlots?: string[];
  nextAvailableSlot?: { date: string; time: TimeSlot };
}

/**
 * AvailableDatesResponseDto
 */
export interface AvailableDatesResponseDto {
  date: string;
  availableSlots: number;
  hasSlots: boolean;
}

// ==================== PARTIE UTILISATEUR ====================
// ==================== DTOs REQUÊTE UTILISATEUR ====================

/**
 * POST /rendezvous - CreateRendezvousDto (Utilisateur uniquement)
 */
export interface CreateRendezvousDto {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
  filiere: string;
  filiereAutre?: string;
  date: string; // Format: YYYY-MM-DD
  time: TimeSlot;
}

/**
 * PATCH /rendezvous/:id/cancel - CancelRendezvousDto (Utilisateur uniquement)
 */
export interface CancelRendezvousDto {
  reason: string;
  cancelledBy?: CancelledBy;
}

// ==================== PARTIE ADMINISTRATEUR ====================
// ==================== DTOs REQUÊTE ADMIN ====================

/**
 * PATCH /admin/rendezvous/:id/patch - UpdateRendezvousDto
 */
export interface UpdateRendezvousDto extends Partial<CreateRendezvousDto> {
  avisAdmin?: AdminOpinion;
  cancellationReason?: string;
  status?: RendezvousStatus;
}

/**
 * PATCH /admin/rendezvous/:id/complete - CompleteRendezvousDto
 */
export interface CompleteRendezvousDto {
  avisAdmin: AdminOpinion;
  comments?: string;
}

/**
 * GET /admin/rendezvous/all - RendezvousQueryDto
 */
export interface RendezvousQueryDto {
  page?: number;
  limit?: number;
  status?: RendezvousStatus;
  date?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  hasAvis?: boolean;
  hasProcedure?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * PaginatedRendezvousResponseDto (Admin seulement)
 */
export interface PaginatedRendezvousResponseDto {
  data: RendezvousResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * RendezvousStatisticsDto (Admin seulement)
 */
export interface RendezvousStatisticsDto {
  total: number;
  byStatus: {
    confirmed: number;
    completed: number;
    cancelled: number;
    pending: number;
  };
  upcoming: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    thisMonth: number;
  };
  topDestinations: { destination: string; count: number }[];
  completionRate: number;
  cancellationRate: number;
}

// ==================== PARTIE COMMUNE (Suite) ====================
// ==================== TYPES INTERNES ====================

export interface RendezvousFilters {
  status?: RendezvousStatus | RendezvousStatus[];
  dateRange?: { start: string; end: string };
  searchTerm?: string;
  hasProcedure?: boolean;
  avisAdmin?: AdminOpinion;
  destination?: string;
  filiere?: string;
}

// ==================== ERREURS API ====================

export interface ApiErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiError {
  message: string;
  errors?: ApiErrorDetail[];
  statusCode?: number;
}

// ==================== CONSTANTES UTILITAIRES (Communes) ====================

/**
 * Mapping des libellés français pour l'affichage
 */
export const RendezvousStatusLabels: Record<RendezvousStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const AdminOpinionLabels: Record<AdminOpinion, string> = {
  FAVORABLE: "Favorable",
  UNFAVORABLE: "Défavorable",
};

export const CancelledByLabels: Record<CancelledBy, string> = {
  USER: "Utilisateur",
  ADMIN: "Administrateur",
  SYSTEM: "Système",
};

/**
 * Options de destination pour l'interface
 */
export const DESTINATION_OPTIONS = [
  "France",
  "Russie",
  "Chypre",
  "Chine",
  "Maroc",
  "Algérie",
  "Turquie",
  "Autre",
];

/**
 * Options de créneaux horaires pour l'interface
 * Format: HH:MM pour l'affichage, sera converti en SLOT_* pour le backend
 */
export const TIME_SLOT_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

/**
 * Options de niveau d'étude pour l'interface
 */
export const NIVEAU_ETUDE_OPTIONS = [
  "Bac",
  "Bac+1",
  "Bac+2",
  "Licence",
  "Master I",
  "Master II",
  "Doctorat",
  "Autre",
];

/**
 * Options de filière pour l'interface
 */
export const FILIERE_OPTIONS = [
  "Informatique",
  "Médecine",
  "Droit",
  "Commerce",
  "Ingénierie",
  "Architecture",
  "Autre",
];

// ==================== UTILITAIRES TIMESLOT (Communs) ====================

/**
 * Convertit un TimeSlot (SLOT_*) en format HH:MM pour l'affichage
 */
export const timeSlotToDisplay = (timeSlot: TimeSlot): string => {
  const map: Record<TimeSlot, string> = {
    SLOT_0900: "09:00",
    SLOT_0930: "09:30",
    SLOT_1000: "10:00",
    SLOT_1030: "10:30",
    SLOT_1100: "11:00",
    SLOT_1130: "11:30",
    SLOT_1200: "12:00",
    SLOT_1400: "14:00",
    SLOT_1430: "14:30",
    SLOT_1500: "15:00",
    SLOT_1530: "15:30",
    SLOT_1600: "16:00",
    SLOT_1630: "16:30",
  };
  return map[timeSlot] || timeSlot;
};

/**
 * Convertit un format HH:MM en TimeSlot (SLOT_*) pour le backend
 */
export const displayToTimeSlot = (display: string): TimeSlot => {
  const map: Record<string, TimeSlot> = {
    "09:00": "SLOT_0900",
    "09:30": "SLOT_0930",
    "10:00": "SLOT_1000",
    "10:30": "SLOT_1030",
    "11:00": "SLOT_1100",
    "11:30": "SLOT_1130",
    "12:00": "SLOT_1200",
    "14:00": "SLOT_1400",
    "14:30": "SLOT_1430",
    "15:00": "SLOT_1500",
    "15:30": "SLOT_1530",
    "16:00": "SLOT_1600",
    "16:30": "SLOT_1630",
  };
  return map[display] || (display as TimeSlot);
};
