import {
  RendezvousStatus,
  AdminOpinion,
  EducationLevel,
  CancelledBy,
  User,
  Procedure,
} from '@prisma/client';

/**
 * Entité de base Rendezvous (correspond au modèle Prisma)
 */
export class RendezvousEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre: string | null;
  niveauEtude: EducationLevel;
  niveauEtudeAutre: string | null;
  filiere: string;
  filiereAutre: string | null;
  date: string;
  time: string;
  status: RendezvousStatus;
  avisAdmin: AdminOpinion | null;
  cancelledAt: Date | null;
  cancelledBy: CancelledBy | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;

  // Relations optionnelles
  user?: User;
  procedure?: Procedure;
}

/**
 * Entité enrichie avec des propriétés calculées
 */
export class RendezvousWithMetaEntity extends RendezvousEntity {
  // Nom complet
  fullName: string;

  // Destination effective (si "Autre", utilise destinationAutre)
  effectiveDestination: string;

  // Niveau d'étude effectif (si "Autre", utilise niveauEtudeAutre)
  effectiveNiveauEtude: string;

  // Filière effective (si "Autre", utilise filiereAutre)
  effectiveFiliere: string;

  // Date/heure combinée
  dateTime: Date;

  // Métadonnées
  canCancel: boolean;
  canModify: boolean;
  isPast: boolean;
  isToday: boolean;
  minutesUntilRendezvous: number;

  // Pour l'admin
  userEmail?: string;
  userFullName?: string;
  procedureStatus?: string;
  procedureId?: string;
}

/**
 * Entité pour la création d'un rendez-vous
 */
export class CreateRendezvousEntity {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: EducationLevel;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
  userId?: string;
}

/**
 * Entité pour la mise à jour d'un rendez-vous
 */
export class UpdateRendezvousEntity {
  firstName?: string;
  lastName?: string;
  telephone?: string;
  destination?: string;
  destinationAutre?: string;
  niveauEtude?: EducationLevel;
  filiere?: string;
  filiereAutre?: string;
  date?: string;
  time?: string;
}

/**
 * Entité pour l'annulation d'un rendez-vous
 */
export class CancelRendezvousEntity {
  reason: string;
  cancelledBy: CancelledBy;
  cancelledAt: Date;
}

/**
 * Entité pour la complétion d'un rendez-vous
 */
export class CompleteRendezvousEntity {
  avisAdmin: AdminOpinion;
  completedAt: Date;
  procedureCreated?: boolean;
  procedureId?: string;
}

/**
 * Entité pour les statistiques des rendez-vous
 */
export class RendezvousStatisticsEntity {
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
  topDestinations: {
    destination: string;
    count: number;
  }[];
  completionRate: number;
  cancellationRate: number;
}

/**
 * Entité pour les créneaux disponibles
 */
export class AvailableSlotsEntity {
  date: string;
  slots: string[];
  totalAvailable: number;
  totalSlots: number;
}

/**
 * Entité pour la réponse de vérification de disponibilité
 */
export class AvailabilityCheckEntity {
  available: boolean;
  date: string;
  time: string;
  nextAvailableSlot?: {
    date: string;
    time: string;
  };
  alternativeSlots?: string[];
}
