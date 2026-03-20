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
import { ProcedureStatus } from '@prisma/client';

export class ProcedureQueryDto {
  @ApiPropertyOptional({
    description: 'Numéro de page',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: ProcedureStatus,
    example: ProcedureStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ProcedureStatus, { message: 'Statut invalide' })
  status?: ProcedureStatus;

  @ApiPropertyOptional({
    description: 'Filtrer par email',
    example: 'jean@email.com',
  })
  @IsOptional()
  @IsString({ message: "L'email doit être une chaîne de caractères" })
  email?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par destination',
    example: 'France',
  })
  @IsOptional()
  @IsString({ message: 'La destination doit être une chaîne de caractères' })
  destination?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par filière',
    example: 'Informatique',
  })
  @IsOptional()
  @IsString({ message: 'La filière doit être une chaîne de caractères' })
  filiere?: string;

  @ApiPropertyOptional({
    description: 'Inclure les procédures supprimées',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description:
      'Inclure toutes les procédures (y compris terminées) - pour admin uniquement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Date de début (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Terme de recherche', example: 'Dupont' })
  @IsOptional()
  @IsString({
    message: 'Le terme de recherche doit être une chaîne de caractères',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Champ de tri',
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'Le champ de tri doit être une chaîne de caractères' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString({ message: "L'ordre de tri doit être asc ou desc" })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ProcedureStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Date de début (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Grouper par (jour, mois, année)',
    enum: ['day', 'month', 'year'],
    default: 'month',
  })
  @IsOptional()
  @IsString({ message: 'Le groupement doit être une chaîne de caractères' })
  groupBy?: 'day' | 'month' | 'year' = 'month';
}
