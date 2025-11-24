// update-step.dto.ts - VERSION ROBUSTE
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsDateString,
  ValidateIf,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { StepStatus, StepName } from "../../schemas/procedure.schema";

export class UpdateStepDto {
  @ApiProperty({
    example: "DEMANDE ADMISSION",
    description: "Nom de l'étape",
    enum: StepName,
    required: false,
  })
  @IsOptional()
  @IsEnum(StepName, { message: "Nom d'étape invalide" })
  nom?: StepName;

  @ApiProperty({
    example: "Terminé",
    description: "Statut de l'étape",
    enum: StepStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(StepStatus, { message: "Statut d'étape invalide" })
  statut?: StepStatus;

  @ApiProperty({
    example: "Documents incomplets",
    description: "Raison du refus (si applicable)",
    required: false,
  })
  @ValidateIf((dto) => dto.statut === StepStatus.REJECTED)
  @IsString({ message: "La raison doit être une chaîne de caractères" })
  @MinLength(5, { message: "La raison doit contenir au moins 5 caractères" })
  @MaxLength(500, { message: "La raison ne doit pas dépasser 500 caractères" })
  raisonRefus?: string;

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Date de mise à jour",
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: "dateMaj doit être une date ISO valide" })
  dateMaj?: string;
}
