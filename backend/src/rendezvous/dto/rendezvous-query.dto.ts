import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RendezvousStatus } from '@prisma/client';

export class RendezvousQueryDto {
  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: RendezvousStatus,
  })
  @IsOptional()
  @IsEnum(RendezvousStatus)
  status?: RendezvousStatus;

  @ApiPropertyOptional({ description: 'Filtrer par date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filtrer par email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Filtrer par destination' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'Filtrer par filière' })
  @IsOptional()
  @IsString()
  filiere?: string;

  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Terme de recherche' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Afficher uniquement les rendez-vous avec avis',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasAvis?: boolean;

  @ApiPropertyOptional({
    description: 'Afficher uniquement les rendez-vous avec procédure',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasProcedure?: boolean;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'date' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'date';

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
