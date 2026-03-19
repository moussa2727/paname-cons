import { StepStatus, StepName } from '@prisma/client';

/**
 * Entité pour un événement de la timeline
 */
export class TimelineEventEntity {
  id: string;
  procedureId: string;
  type:
    | 'STEP_CREATED'
    | 'STEP_UPDATED'
    | 'STEP_COMPLETED'
    | 'STATUS_CHANGED'
    | 'COMMENT_ADDED';
  stepName?: StepName;
  oldStatus?: StepStatus;
  newStatus?: StepStatus;
  oldProcedureStatus?: string;
  newProcedureStatus?: string;
  comment?: string;
  createdBy: string;
  createdByRole: 'ADMIN' | 'USER' | 'SYSTEM';
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Entité pour la timeline complète d'une procédure
 */
export class ProcedureTimelineEntity {
  procedureId: string;
  events: TimelineEventEntity[];
  summary: {
    totalEvents: number;
    firstEvent: Date;
    lastEvent: Date;
    duration: number; // en jours
    stepsTimeline: {
      stepName: StepName;
      created: Date;
      completed?: Date;
      duration?: number;
    }[];
  };
}

/**
 * Entité pour un commentaire sur une procédure
 */
export class ProcedureCommentEntity {
  id: string;
  procedureId: string;
  content: string;
  createdBy: string;
  createdByRole: 'ADMIN' | 'USER';
  createdAt: Date;
  updatedAt: Date;
  isInternal: boolean; // visible seulement par admin
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
}
