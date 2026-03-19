import { RendezvousStatus } from '@prisma/client';
import {
  RendezvousEntity,
  RendezvousWithMetaEntity,
} from './rendezvous.entity';

/**
 * Entité pour les filtres de recherche
 */
export class RendezvousFilterEntity {
  status?: RendezvousStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  destinations?: string[];
  searchTerm?: string;
  hasProcedure?: boolean;
  avisAdmin?: 'FAVORABLE' | 'UNFAVORABLE' | 'PENDING';
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
}

/**
 * Entité pour les options de pagination
 */
export class RendezvousPaginationEntity {
  page: number = 1;
  limit: number = 10;
  sortBy: keyof RendezvousEntity = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  filters?: RendezvousFilterEntity;
}

/**
 * Entité pour les résultats paginés
 */
export class PaginatedRendezvousEntity {
  data: RendezvousWithMetaEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
