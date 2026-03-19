import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcedureStatus, StepStatus, StepName } from '@prisma/client';

class StepResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: StepName, example: StepName.DEMANDE_ADMISSION })
  nom: StepName;

  @ApiProperty({ enum: StepStatus, example: StepStatus.IN_PROGRESS })
  statut: StepStatus;

  @ApiPropertyOptional({ example: 'Documents manquants' })
  raisonRefus?: string;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  dateCreation: Date;

  @ApiProperty({ example: '2024-01-15T14:30:00.000Z' })
  dateMaj: Date;

  @ApiPropertyOptional({ example: '2024-01-15T14:30:00.000Z' })
  dateCompletion?: Date;

  // Virtuals calculés pour Step
  @ApiProperty({
    example: true,
    description: "Indique si l'étape peut être modifiée",
  })
  canBeModified: boolean;

  @ApiPropertyOptional({
    example: 15,
    description: "Durée de l'étape en jours (si complétée)",
  })
  duration?: number;

  @ApiProperty({
    example: false,
    description: "Indique si l'étape est en retard (>7 jours)",
  })
  isOverdue: boolean;

  @ApiProperty({
    example: 'En cours',
    description: 'Libellé du statut pour affichage',
  })
  statusLabel: string;

  @ApiProperty({
    example: 'blue',
    description: "Couleur associée au statut pour l'UI",
  })
  statusColor: string;
}

export class ProcedureResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  rendezVousId?: string;

  @ApiProperty({ example: 'Jean' })
  prenom: string;

  @ApiProperty({ example: 'Dupont' })
  nom: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullName: string;

  @ApiProperty({ example: 'jean.dupont@email.com' })
  email: string;

  @ApiProperty({ example: '+33612345678' })
  telephone: string;

  @ApiProperty({ example: 'France' })
  destination: string;

  @ApiPropertyOptional({ example: 'Belgique' })
  destinationAutre?: string;

  @ApiProperty({ example: 'France' })
  effectiveDestination: string;

  @ApiProperty({ example: 'Informatique' })
  filiere: string;

  @ApiPropertyOptional({ example: 'Data Science' })
  filiereAutre?: string;

  @ApiProperty({ example: 'Informatique' })
  effectiveFiliere: string;

  @ApiProperty({ example: 'Master I' })
  niveauEtude: string;

  @ApiPropertyOptional({ example: 'DUT' })
  niveauEtudeAutre?: string;

  @ApiProperty({ example: 'Master I' })
  effectiveNiveauEtude: string;

  @ApiProperty({ enum: ProcedureStatus, example: ProcedureStatus.IN_PROGRESS })
  statut: ProcedureStatus;

  @ApiPropertyOptional({ example: 'Dossier incomplet' })
  raisonRejet?: string;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiPropertyOptional({ example: '2024-01-25T10:30:00.000Z' })
  deletedAt?: Date;

  @ApiPropertyOptional({ example: 'Doublon' })
  deletionReason?: string;

  @ApiPropertyOptional({ example: '2024-01-15T14:30:00.000Z' })
  dateCompletion?: Date;

  @ApiPropertyOptional({ example: '2024-01-20T09:15:00.000Z' })
  dateDerniereModification?: Date;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-20T09:15:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId?: string | null;

  @ApiPropertyOptional({
    example: '2024-01-20T09:15:00.000Z',
    description: 'Date à laquelle la procédure a été annulée',
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({
    example: "Annulation par l'utilisateur",
    description: "Raison de l'annulation",
  })
  cancelledReason?: string | null;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: "ID de l'utilisateur ayant annulé la procédure",
  })
  cancelledBy?: string | null;

  @ApiProperty({ type: [StepResponseDto] })
  steps: StepResponseDto[];

  @ApiProperty({ example: 33 })
  progress: number;

  @ApiProperty({ example: 1 })
  completedSteps: number;

  @ApiProperty({ example: 3 })
  totalSteps: number;

  @ApiPropertyOptional({ example: StepName.DEMANDE_VISA })
  activeStep?: StepName;

  @ApiPropertyOptional({ example: 'Confirmé' })
  rendezvousStatus?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  rendezvousDate?: string;

  // Virtuals calculés additionnels
  @ApiProperty({
    example: 'En cours',
    description: 'Libellé du statut pour affichage',
  })
  statusLabel: string;

  @ApiProperty({
    example: 'blue',
    description: "Couleur associée au statut pour l'UI",
  })
  statusColor: string;

  @ApiProperty({
    example: true,
    description: 'Indique si la procédure peut être modifiée',
  })
  canBeModified: boolean;

  @ApiProperty({
    example: 5,
    description: 'Nombre de jours depuis la création',
  })
  daysSinceCreation: number;

  @ApiPropertyOptional({
    example: '2024-02-15T00:00:00.000Z',
    description: 'Date estimée de complétion',
  })
  estimatedCompletionDate?: Date;

  @ApiProperty({
    example: false,
    description: 'Indique si la procédure est en retard (>14 jours)',
  })
  isOverdue: boolean;

  @ApiPropertyOptional({
    example: StepName.PREPARATIF_VOYAGE,
    description: 'Prochaine étape à effectuer',
  })
  nextStep?: StepName;
}

export class PaginatedProcedureResponseDto {
  @ApiProperty({ type: [ProcedureResponseDto] })
  data: ProcedureResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}

export class ProcedureStatisticsDto {
  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({
    example: {
      PENDING: 10,
      IN_PROGRESS: 75,
      COMPLETED: 50,
      REJECTED: 15,
      CANCELLED: 10,
    },
  })
  byStatus: Record<string, number>;

  @ApiProperty({ example: 33.3 })
  completionRate: number;

  @ApiProperty({ example: 10 })
  rejectionRate: number;

  @ApiProperty({ example: 45 })
  averageCompletionTime: number;

  @ApiProperty({
    example: {
      today: 5,
      thisWeek: 25,
      thisMonth: 45,
    },
  })
  newProcedures: Record<string, number>;

  @ApiProperty({
    example: [
      { destination: 'France', count: 45 },
      { destination: 'Canada', count: 32 },
    ],
  })
  topDestinations: { destination: string; count: number }[];

  @ApiProperty({
    example: [
      { filiere: 'Informatique', count: 38 },
      { filiere: 'Médecine', count: 27 },
    ],
  })
  topFilieres: { filiere: string; count: number }[];
}
