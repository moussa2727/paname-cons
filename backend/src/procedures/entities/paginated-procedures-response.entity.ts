import { ApiProperty } from '@nestjs/swagger';
import { ProcedureWithMetaEntity } from './procedure.entity';

/**
 * Entité pour les résultats paginés
 */
export class PaginatedProcedureEntity {
  @ApiProperty({
    description: 'Liste des procédures',
    type: [ProcedureWithMetaEntity],
  })
  data: ProcedureWithMetaEntity[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    example: {
      total: 150,
      page: 1,
      limit: 10,
      totalPages: 15,
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
