import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProcedureStatus } from '@prisma/client';

/**
 * Entité pour les filtres de recherche
 */
export class ProcedureFilterEntity {
  @ApiPropertyOptional({
    description: 'Statuts à inclure',
    enum: ProcedureStatus,
    isArray: true,
    example: [ProcedureStatus.IN_PROGRESS, ProcedureStatus.COMPLETED],
  })
  statut?: ProcedureStatus[];

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
    description: 'Destinations à inclure',
    example: ['France', 'Canada'],
    isArray: true,
  })
  destinations?: string[];

  @ApiPropertyOptional({
    description: 'Filières à inclure',
    example: ['Informatique', 'Médecine'],
    isArray: true,
  })
  filieres?: string[];

  @ApiPropertyOptional({
    description: 'Terme de recherche',
    example: 'Dupont',
  })
  searchTerm?: string;

  @ApiPropertyOptional({
    description: 'Inclure les procédures avec rendez-vous',
    example: true,
  })
  hasRendezvous?: boolean;

  @ApiPropertyOptional({
    description: 'Inclure les procédures supprimées',
    example: false,
    default: false,
  })
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: "Identifiant de l'utilisateur",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string;
}
