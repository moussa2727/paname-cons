import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepStatus, StepName } from '@prisma/client';

/**
 * Types d'actions d'audit pour les procédures
 */
export enum ProcedureAuditAction {
  PROCEDURE_CREATED = 'PROCEDURE CREATED',
  PROCEDURE_UPDATED = 'PROCEDURE UPDATED',
  PROCEDURE_STATUS_CHANGED = 'PROCEDURE STATUS CHANGED',
  PROCEDURE_DELETED = 'PROCEDURE DELETED',
  PROCEDURE_RESTORED = 'PROCEDURE RESTORED',
  STEP_ADDED = 'STEP ADDED',
  STEP_UPDATED = 'STEP UPDATED',
  STEP_STATUS_CHANGED = 'STEP STATUS CHANGED',
  COMMENT_ADDED = 'COMMENT ADDED',
  FILE_ATTACHED = 'FILE ATTACHED',
  FILE_REMOVED = 'FILE REMOVED',
  EMAIL_SENT = 'EMAIL SENT',
  VIEWED = 'VIEWED',
  EXPORTED = 'EXPORTED',
}

/**
 * Entité pour un événement d'audit de procédure
 */
export class ProcedureAuditEntity {
  @ApiProperty({
    description: "Identifiant unique de l'événement d'audit",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Identifiant de la procédure concernée',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  procedureId: string;

  @ApiProperty({
    description: "Type d'action effectuée",
    enum: ProcedureAuditAction,
    example: ProcedureAuditAction.PROCEDURE_STATUS_CHANGED,
  })
  action: ProcedureAuditAction;

  @ApiProperty({
    description: "Identifiant de l'utilisateur ayant effectué l'action",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'admin@panameconsulting.com',
  })
  userEmail: string;

  @ApiProperty({
    description: "Nom complet de l'utilisateur",
    example: 'Admin Système',
  })
  userName: string;

  @ApiProperty({
    description: "Rôle de l'utilisateur",
    example: 'ADMIN',
  })
  userRole: string;

  @ApiPropertyOptional({
    description: 'Anciennes valeurs (avant modification)',
    example: {
      statut: 'IN_PROGRESS',
      raisonRejet: null,
    },
  })
  oldValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Nouvelles valeurs (après modification)',
    example: {
      statut: 'COMPLETED',
      dateCompletion: '2024-01-25T10:30:00.000Z',
    },
  })
  newValues?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Métadonnées supplémentaires',
    example: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      reason: 'Avis favorable',
    },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: "Date et heure de l'événement",
    example: '2024-01-25T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * Entité pour un audit d'étape spécifique
 */
export class StepAuditEntity {
  @ApiProperty({
    description: "Identifiant de l'étape",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  stepId: string;

  @ApiProperty({
    description: "Nom de l'étape",
    enum: StepName,
    example: StepName.DEMANDE_ADMISSION,
  })
  stepName: StepName;

  @ApiProperty({
    description: "Type d'action",
    enum: ProcedureAuditAction,
    example: ProcedureAuditAction.STEP_STATUS_CHANGED,
  })
  action: ProcedureAuditAction;

  @ApiPropertyOptional({
    description: 'Ancien statut',
    enum: StepStatus,
    example: StepStatus.PENDING,
  })
  oldStatus?: StepStatus;

  @ApiPropertyOptional({
    description: 'Nouveau statut',
    enum: StepStatus,
    example: StepStatus.COMPLETED,
  })
  newStatus?: StepStatus;

  @ApiPropertyOptional({
    description: 'Ancienne raison de refus',
    example: null,
  })
  oldRaisonRefus?: string;

  @ApiPropertyOptional({
    description: 'Nouvelle raison de refus',
    example: 'Documents incomplets',
  })
  newRaisonRefus?: string;

  @ApiProperty({
    description: 'Date de mise à jour',
    example: '2024-01-25T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Entité pour les statistiques d'audit
 */
export class ProcedureAuditStatisticsEntity {
  @ApiProperty({
    description: "Total des événements d'audit",
    example: 1250,
  })
  totalEvents: number;

  @ApiProperty({
    description: "Événements par type d'action",
    example: {
      PROCEDURE_CREATED: 150,
      PROCEDURE_STATUS_CHANGED: 320,
      STEP_UPDATED: 580,
      COMMENT_ADDED: 200,
    },
  })
  byAction: Record<ProcedureAuditAction, number>;

  @ApiProperty({
    description: 'Événements par utilisateur',
    example: [
      { userId: '123', userName: 'Admin', count: 450 },
      { userId: '456', userName: 'Consultant', count: 380 },
    ],
  })
  topUsers: { userId: string; userName: string; count: number }[];

  @ApiProperty({
    description: 'Événements par jour (7 derniers jours)',
    example: [
      { date: '2024-01-19', count: 45 },
      { date: '2024-01-20', count: 52 },
      { date: '2024-01-21', count: 38 },
    ],
  })
  dailyEvents: { date: string; count: number }[];

  @ApiProperty({
    description: 'Procédures les plus auditées',
    example: [
      { procedureId: '123', procedureName: 'Jean Dupont - France', count: 25 },
      { procedureId: '456', procedureName: 'Marie Martin - Canada', count: 18 },
    ],
  })
  topProcedures: {
    procedureId: string;
    procedureName: string;
    count: number;
  }[];

  @ApiProperty({
    description: 'Temps moyen entre les actions (en heures)',
    example: 3.5,
  })
  averageTimeBetweenActions: number;
}

/**
 * Entité pour les filtres d'audit
 */
export class ProcedureAuditFilterEntity {
  @ApiPropertyOptional({
    description: 'Identifiant de la procédure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  procedureId?: string;

  @ApiPropertyOptional({
    description: "Type d'action",
    enum: ProcedureAuditAction,
    example: ProcedureAuditAction.PROCEDURE_STATUS_CHANGED,
  })
  action?: ProcedureAuditAction;

  @ApiPropertyOptional({
    description: "Identifiant de l'utilisateur",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Date de début (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Limite de résultats',
    example: 100,
    default: 100,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset pour la pagination',
    example: 0,
    default: 0,
  })
  offset?: number;

  @ApiPropertyOptional({
    description: 'Trier par',
    example: 'createdAt',
    default: 'createdAt',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc';
}

/**
 * Entité pour la réponse paginée des audits
 */
export class PaginatedProcedureAuditEntity {
  @ApiProperty({
    description: "Liste des événements d'audit",
    type: [ProcedureAuditEntity],
  })
  data: ProcedureAuditEntity[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    example: {
      total: 1250,
      page: 1,
      limit: 50,
      totalPages: 25,
      hasNext: true,
      hasPrevious: false,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Entité pour l'export des audits
 */
export class ProcedureAuditExportEntity {
  @ApiProperty({
    description: "Format d'export",
    example: 'csv',
    enum: ['csv', 'json', 'pdf'],
  })
  format: string;

  @ApiProperty({
    description: 'Données exportées',
    type: [ProcedureAuditEntity],
  })
  data: ProcedureAuditEntity[];

  @ApiProperty({
    description: 'Date de génération',
    example: '2024-01-25T10:30:00.000Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Filtres appliqués',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  })
  filters: ProcedureAuditFilterEntity;

  @ApiProperty({
    description: 'URL de téléchargement (si généré)',
    example: '/exports/audit-2024-01-25.csv',
    required: false,
  })
  downloadUrl?: string;
}

/**
 * Entité pour la comparaison d'audits
 */
export class ProcedureAuditComparisonEntity {
  @ApiProperty({
    description: 'Identifiant de la procédure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  procedureId: string;

  @ApiProperty({
    description: 'Version 1 (date)',
    example: '2024-01-20T10:00:00.000Z',
  })
  version1Date: Date;

  @ApiProperty({
    description: 'Version 2 (date)',
    example: '2024-01-25T10:00:00.000Z',
  })
  version2Date: Date;

  @ApiProperty({
    description: 'Différences entre les deux versions',
    example: [
      {
        field: 'statut',
        oldValue: 'IN_PROGRESS',
        newValue: 'COMPLETED',
      },
      {
        field: 'steps.0.statut',
        oldValue: 'PENDING',
        newValue: 'COMPLETED',
      },
    ],
  })
  differences: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
