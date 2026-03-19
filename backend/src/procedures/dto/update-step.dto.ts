import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StepStatus } from '@prisma/client';

export class UpdateStepDto {
  @ApiPropertyOptional({
    description: "Nouveau statut de l'étape",
    enum: StepStatus,
    example: StepStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(StepStatus, { message: 'Statut invalide' })
  statut?: StepStatus;

  @ApiPropertyOptional({
    description: 'Raison du refus (si statut = REJECTED)',
    example: 'Documents manquants',
  })
  @IsOptional()
  @IsString({
    message: 'La raison du refus doit être une chaîne de caractères',
  })
  raisonRefus?: string;

  @ApiPropertyOptional({
    description: 'Date de complétion',
    example: '2024-01-25T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de complétion invalide' })
  dateCompletion?: string;
}

export class AddStepDto {
  @ApiPropertyOptional({
    description: "Nom de l'étape",
    example: 'ENTRETIEN_MOTIVATION',
  })
  @IsString({ message: "Le nom de l'étape doit être une chaîne de caractères" })
  @IsOptional()
  stepName?: string;
}
