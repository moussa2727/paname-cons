import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepName, StepStatus, ProcedureStatus } from '@prisma/client';

/**
 * Entité pour une étape de procédure
 */
export class StepEntity {
  @ApiProperty({
    description: "Identifiant unique de l'étape",
    example: '123e4567-e89b-12d3-a456-426614000',
  })
  id: string;

  @ApiProperty({
    description: 'Identifiant de la procédure associée',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  procedureId: string;

  @ApiProperty({
    description: "Nom de l'étape",
    enum: StepName,
    example: StepName.DEMANDE_ADMISSION,
  })
  nom: StepName;

  @ApiProperty({
    description: "Statut de l'étape",
    enum: StepStatus,
    example: StepStatus.IN_PROGRESS,
  })
  statut: StepStatus;

  @ApiPropertyOptional({
    description: 'Raison du refus (si statut = REJECTED)',
    example: 'Documents manquants',
  })
  raisonRefus?: string | null;

  @ApiProperty({
    description: "Ordre d'affichage de l'étape",
    example: 1,
    minimum: 0,
    default: 0,
  })
  order: number;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T14:30:00.000Z',
  })
  dateMaj: Date;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-01T10:00:00.000Z',
  })
  dateCreation: Date;

  @ApiPropertyOptional({
    description: 'Date de complétion',
    example: '2024-01-15T14:30:00.000Z',
  })
  dateCompletion?: Date | null;

  // Méthodes d'instance pour Step
  isCompleted(): boolean {
    return this.statut === StepStatus.COMPLETED;
  }

  isRejected(): boolean {
    return this.statut === StepStatus.REJECTED;
  }

  isInProgress(): boolean {
    return this.statut === StepStatus.IN_PROGRESS;
  }

  isPending(): boolean {
    return this.statut === StepStatus.PENDING;
  }

  // Méthode d'instance: Obtenir la durée en jours
  getDuration(): number | null {
    if (!this.dateCompletion) return null;
    return (
      (this.dateCompletion.getTime() - this.dateCreation.getTime()) /
      (1000 * 60 * 60 * 24)
    );
  }

  // Méthode d'instance: Vérifier si l'étape peut être modifiée
  get canBeModified(): boolean {
    const finalStatuses: StepStatus[] = [
      StepStatus.COMPLETED,
      StepStatus.CANCELLED,
      StepStatus.REJECTED,
    ];
    return !finalStatuses.includes(this.statut);
  }

  // Méthode d'instance: Vérifier si l'étape est en retard
  isOverdue(): boolean {
    if (this.statut !== StepStatus.IN_PROGRESS) return false;

    // En retard si plus de 7 jours sur la même étape
    const stepDuration =
      (Date.now() - this.dateCreation.getTime()) / (1000 * 60 * 60 * 24);
    return stepDuration > 7;
  }

  // Méthode d'instance: Obtenir le libellé du statut
  getStatusLabel(): string {
    const labels: Record<StepStatus, string> = {
      [StepStatus.PENDING]: 'En attente',
      [StepStatus.IN_PROGRESS]: 'En cours',
      [StepStatus.COMPLETED]: 'Terminée',
      [StepStatus.REJECTED]: 'Refusée',
      [StepStatus.CANCELLED]: 'Annulée',
    };
    return labels[this.statut] || this.statut;
  }

  // Méthode d'instance: Obtenir la couleur du statut
  getStatusColor(): string {
    const colors: Record<StepStatus, string> = {
      [StepStatus.PENDING]: 'gray',
      [StepStatus.IN_PROGRESS]: 'blue',
      [StepStatus.COMPLETED]: 'green',
      [StepStatus.REJECTED]: 'red',
      [StepStatus.CANCELLED]: 'orange',
    };
    return colors[this.statut] || 'gray';
  }
}

/**
 * Informations de base sur l'utilisateur associé
 */
export class ProcedureUserInfoEntity {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'jean.dupont@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
  })
  lastName: string;

  @ApiProperty({
    description: 'Nom complet',
    example: 'Jean Dupont',
  })
  fullName: string;

  @ApiProperty({
    description: 'Téléphone',
    example: '+33612345678',
  })
  telephone: string;
}

/**
 * Informations de base sur le rendez-vous associé
 */
export class ProcedureRendezvousInfoEntity {
  @ApiProperty({
    description: 'Identifiant du rendez-vous',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Date du rendez-vous',
    example: '2024-12-25',
  })
  date: string;

  @ApiProperty({
    description: 'Heure du rendez-vous',
    example: '14:30',
  })
  time: string;

  @ApiProperty({
    description: 'Statut du rendez-vous',
    example: 'Confirmé',
  })
  status: string;

  @ApiPropertyOptional({
    description: "Avis de l'administrateur",
    example: 'Favorable',
  })
  avisAdmin?: string;
}

/**
 * Entité de base Procedure (correspond au modèle Prisma)
 */
export class ProcedureEntity {
  @ApiProperty({
    description: 'Identifiant unique de la procédure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Identifiant du rendez-vous associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  rendezVousId: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  prenom: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  nom: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.dupont@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'Téléphone',
    example: '+33612345678',
  })
  telephone: string;

  @ApiProperty({
    description: 'Destination choisie',
    example: 'France',
  })
  destination: string;

  @ApiPropertyOptional({
    description: 'Autre destination (si destination = "Autre")',
    example: 'Belgique',
  })
  destinationAutre?: string | null;

  @ApiProperty({
    description: 'Filière choisie',
    example: 'Informatique',
  })
  filiere: string;

  @ApiPropertyOptional({
    description: 'Autre filière (si filiere = "Autre")',
    example: 'Data Science',
  })
  filiereAutre?: string | null;

  @ApiProperty({
    description: "Niveau d'étude",
    example: 'Master I',
  })
  niveauEtude: string;

  @ApiPropertyOptional({
    description: 'Autre niveau d\'étude (si niveauEtude = "Autre")',
    example: 'DUT',
  })
  niveauEtudeAutre?: string | null;

  @ApiProperty({
    description: 'Statut de la procédure',
    enum: ProcedureStatus,
    example: ProcedureStatus.IN_PROGRESS,
  })
  statut: ProcedureStatus;

  @ApiPropertyOptional({
    description: 'Raison du rejet (si statut = REJECTED)',
    example: 'Dossier incomplet',
  })
  raisonRejet?: string | null;

  @ApiProperty({
    description: 'Indique si la procédure est supprimée (soft delete)',
    example: false,
    default: false,
  })
  isDeleted: boolean;

  @ApiPropertyOptional({
    description: 'Date de suppression (soft delete)',
    example: '2024-01-25T10:30:00.000Z',
  })
  deletedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Raison de la suppression',
    example: 'Doublon',
  })
  deletionReason?: string | null;

  @ApiPropertyOptional({
    description: 'Date de complétion',
    example: '2024-01-15T14:30:00.000Z',
  })
  dateCompletion?: Date | null;

  @ApiPropertyOptional({
    description: 'Date de dernière modification',
    example: '2024-01-20T09:15:00.000Z',
  })
  dateDerniereModification?: Date | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-01T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-20T09:15:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: "Identifiant de l'utilisateur associé",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string | null;

  @ApiPropertyOptional({
    description: "Date d'annulation",
    example: '2024-01-20T09:15:00.000Z',
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({
    description: "Raison d'annulation",
    example: "Annulation par l'utilisateur",
  })
  cancelledReason?: string | null;

  @ApiPropertyOptional({
    description: "ID de l'utilisateur ayant annulé",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cancelledBy?: string | null;

  // Relations
  steps?: StepEntity[];
  rendezVous?: ProcedureRendezvousInfoEntity;
  user?: ProcedureUserInfoEntity;

  // Méthodes d'instance pour Procedure
  get canBeModified(): boolean {
    const finalStatuses: ProcedureStatus[] = [
      ProcedureStatus.COMPLETED,
      ProcedureStatus.CANCELLED,
      ProcedureStatus.REJECTED,
    ];
    return !finalStatuses.includes(this.statut);
  }

  getEffectiveDestination(): string {
    return this.destination === 'Autre' && this.destinationAutre
      ? this.destinationAutre
      : this.destination;
  }

  getEffectiveNiveauEtude(): string {
    return this.niveauEtude === 'Autre' && this.niveauEtudeAutre
      ? this.niveauEtudeAutre
      : this.niveauEtude;
  }

  getEffectiveFiliere(): string {
    return this.filiere === 'Autre' && this.filiereAutre
      ? this.filiereAutre
      : this.filiere;
  }

  getProgress(): number {
    if (!this.steps || this.steps.length === 0) return 0;
    const completedSteps = this.steps.filter(
      (s) => s.statut === StepStatus.COMPLETED,
    ).length;
    return Math.round((completedSteps / this.steps.length) * 100);
  }

  getActiveStep(): StepEntity | null {
    if (!this.steps) return null;
    return this.steps.find((s) => s.statut === StepStatus.IN_PROGRESS) || null;
  }

  canAccessStep(stepName: StepName): boolean {
    if (!this.steps) return false;

    const steps = this.steps.sort((a, b) => a.order - b.order);
    const stepIndex = steps.findIndex((s) => s.nom === stepName);

    if (stepIndex === -1) return false;

    // Vérifier que toutes les étapes précédentes sont terminées
    for (let i = 0; i < stepIndex; i++) {
      if (steps[i].statut !== StepStatus.COMPLETED) return false;
    }

    return true;
  }

  getDaysSinceCreation(): number {
    const diff = Date.now() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  isOverdue(): boolean {
    if (this.statut === ProcedureStatus.COMPLETED) return false;

    const activeStep = this.getActiveStep();
    if (!activeStep) return false;

    // Considérer en retard si l'étape active dure plus de 14 jours
    const stepDuration =
      (Date.now() - activeStep.dateCreation.getTime()) / (1000 * 60 * 60 * 24);
    return stepDuration > 14;
  }

  getStatusLabel(): string {
    const labels: Record<ProcedureStatus, string> = {
      [ProcedureStatus.PENDING]: 'En attente',
      [ProcedureStatus.IN_PROGRESS]: 'En cours',
      [ProcedureStatus.COMPLETED]: 'Terminée',
      [ProcedureStatus.REJECTED]: 'Refusée',
      [ProcedureStatus.CANCELLED]: 'Annulée',
    };
    return labels[this.statut] || this.statut;
  }

  getStatusColor(): string {
    const colors: Record<ProcedureStatus, string> = {
      [ProcedureStatus.PENDING]: 'yellow',
      [ProcedureStatus.IN_PROGRESS]: 'blue',
      [ProcedureStatus.COMPLETED]: 'green',
      [ProcedureStatus.REJECTED]: 'red',
      [ProcedureStatus.CANCELLED]: 'gray',
    };
    return colors[this.statut] || 'blue';
  }

  getNextStep(): StepName | undefined {
    if (!this.steps) return undefined;

    const sortedSteps = [...this.steps].sort((a, b) => a.order - b.order);
    for (const step of sortedSteps) {
      if (step.statut === StepStatus.PENDING) {
        return step.nom;
      }
    }
    return undefined;
  }

  // Méthode privée pour masquer l'email
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const visibleChars = Math.min(2, localPart.length);
    const maskedLocal =
      localPart.substring(0, visibleChars) +
      '*'.repeat(localPart.length - visibleChars);
    return `${maskedLocal}@${domain}`;
  }
}

/**
 * Entité enrichie avec des propriétés calculées pour les réponses API
 */
export class ProcedureWithMetaEntity extends ProcedureEntity {
  @ApiProperty({
    description: 'Nom complet',
    example: 'Jean Dupont',
  })
  fullName: string;

  @ApiProperty({
    description: 'Destination effective (si "Autre", utilise destinationAutre)',
    example: 'France',
  })
  effectiveDestination: string;

  @ApiProperty({
    description: 'Filière effective (si "Autre", utilise filiereAutre)',
    example: 'Informatique',
  })
  effectiveFiliere: string;

  @ApiProperty({
    description: "Nombre total d'étapes",
    example: 3,
    minimum: 0,
  })
  totalSteps: number;

  @ApiProperty({
    description: "Nombre d'étapes complétées",
    example: 1,
    minimum: 0,
  })
  completedSteps: number;

  @ApiProperty({
    description: 'Pourcentage de progression',
    example: 33,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiPropertyOptional({
    description: 'Étape active actuelle',
    enum: StepName,
    example: StepName.DEMANDE_VISA,
  })
  activeStep?: StepName;

  @ApiProperty({
    description: 'Libellé du statut pour affichage',
    example: 'En cours',
  })
  statusLabel: string;

  @ApiProperty({
    description: 'Couleur associée au statut',
    example: 'blue',
    enum: ['blue', 'green', 'red', 'gray', 'orange', 'purple'],
  })
  statusColor: string;

  @ApiProperty({
    description: 'Nombre de jours depuis la création',
    example: 5,
    minimum: 0,
  })
  daysSinceCreation: number;

  @ApiPropertyOptional({
    description: 'Date estimée de complétion',
    example: '2024-02-15T00:00:00.000Z',
  })
  estimatedCompletionDate?: Date;

  @ApiProperty({
    description: 'Date de dernière activité',
    example: '2024-01-20T09:15:00.000Z',
  })
  lastActivity: Date;

  // Relations enrichies
  declare steps: StepEntity[];
  declare rendezVous?: ProcedureRendezvousInfoEntity;
  declare user?: ProcedureUserInfoEntity;
}

/**
 * Entité pour la création d'une procédure
 */
export class CreateProcedureEntity {
  @ApiProperty({
    description: 'Identifiant du rendez-vous associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  rendezVousId: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  prenom: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  nom: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.dupont@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'Téléphone',
    example: '+33612345678',
  })
  telephone: string;

  @ApiProperty({
    description: 'Destination choisie',
    example: 'France',
  })
  destination: string;

  @ApiPropertyOptional({
    description: 'Autre destination (si destination = "Autre")',
    example: 'Belgique',
  })
  destinationAutre?: string;

  @ApiProperty({
    description: 'Filière choisie',
    example: 'Informatique',
  })
  filiere: string;

  @ApiPropertyOptional({
    description: 'Autre filière (si filiere = "Autre")',
    example: 'Data Science',
  })
  filiereAutre?: string;

  @ApiProperty({
    description: "Niveau d'étude",
    example: 'Master I',
  })
  niveauEtude: string;

  @ApiPropertyOptional({
    description: "Identifiant de l'utilisateur associé",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string;
}

/**
 * Entité pour la mise à jour d'une procédure
 */
export class UpdateProcedureEntity {
  @ApiPropertyOptional({
    description: 'Prénom',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  prenom?: string;

  @ApiPropertyOptional({
    description: 'Nom',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  nom?: string;

  @ApiPropertyOptional({
    description: 'Téléphone',
    example: '+33612345678',
  })
  telephone?: string;

  @ApiPropertyOptional({
    description: 'Destination choisie',
    example: 'France',
  })
  destination?: string;

  @ApiPropertyOptional({
    description: 'Autre destination (si destination = "Autre")',
    example: 'Belgique',
  })
  destinationAutre?: string;

  @ApiPropertyOptional({
    description: 'Filière choisie',
    example: 'Informatique',
  })
  filiere?: string;

  @ApiPropertyOptional({
    description: 'Autre filière (si filiere = "Autre")',
    example: 'Data Science',
  })
  filiereAutre?: string;

  @ApiPropertyOptional({
    description: "Niveau d'étude",
    example: 'Master I',
  })
  niveauEtude?: string;

  @ApiPropertyOptional({
    description: 'Raison du rejet',
    example: 'Dossier incomplet',
  })
  raisonRejet?: string;
}

/**
 * Entité pour les statistiques des procédures
 */
export class ProcedureStatisticsEntity {
  @ApiProperty({
    description: 'Total des procédures',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Procédures par statut',
    example: {
      PENDING: 10,
      IN_PROGRESS: 75,
      COMPLETED: 50,
      REJECTED: 15,
      CANCELLED: 10,
    },
  })
  byStatus: Record<ProcedureStatus, number>;

  @ApiProperty({
    description: 'Taux de complétion (%)',
    example: 33.3,
    minimum: 0,
    maximum: 100,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Taux de rejet (%)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  rejectionRate: number;

  @ApiProperty({
    description: 'Temps moyen de complétion (en jours)',
    example: 45,
    minimum: 0,
  })
  averageCompletionTime: number;

  @ApiProperty({
    description: 'Nouvelles procédures',
    example: {
      today: 5,
      thisWeek: 25,
      thisMonth: 45,
    },
  })
  newProcedures: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };

  @ApiProperty({
    description: 'Destinations les plus demandées',
    example: [
      { destination: 'France', count: 45 },
      { destination: 'Canada', count: 32 },
      { destination: 'États-Unis', count: 28 },
    ],
  })
  topDestinations: { destination: string; count: number }[];

  @ApiProperty({
    description: 'Filières les plus demandées',
    example: [
      { filiere: 'Informatique', count: 38 },
      { filiere: 'Médecine', count: 27 },
      { filiere: 'Commerce', count: 25 },
    ],
  })
  topFilieres: { filiere: string; count: number }[];

  @ApiProperty({
    description: 'Analytiques par étape',
    example: [
      {
        stepName: 'DEMANDE_ADMISSION',
        completionRate: 85,
        averageTime: 10,
      },
      {
        stepName: 'DEMANDE_VISA',
        completionRate: 65,
        averageTime: 20,
      },
    ],
  })
  stepsAnalytics: {
    stepName: StepName;
    completionRate: number;
    averageTime: number;
  }[];
}
