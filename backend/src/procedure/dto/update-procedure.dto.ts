// update-procedure.dto.ts - AJOUT DE dateCompletion
import { PartialType } from "@nestjs/swagger";
import { CreateProcedureDto } from "./create-procedure.dto";
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ProcedureStatus } from "../../schemas/procedure.schema";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { UpdateStepDto } from "./update-step.dto";

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {
  @ApiProperty({
    example: "Terminée",
    description: "Statut de la procédure",
    enum: ProcedureStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProcedureStatus, { message: "Statut invalide" })
  statut?: ProcedureStatus;

  @ApiProperty({
    description: "Liste des étapes mises à jour",
    type: [UpdateStepDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStepDto)
  steps?: UpdateStepDto[];

  @ApiProperty({
    example: false,
    description: "Indique si la procédure est supprimée logiquement",
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: "isDeleted doit être un booléen" })
  isDeleted?: boolean;

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Date de suppression",
    required: false,
  })
  @IsOptional()
  @IsDate({ message: "deletedAt doit être une date valide" })
  deletedAt?: Date;

  @ApiProperty({
    example: "Doublon",
    description: "Raison de la suppression",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "deletionReason doit être une chaîne de caractères" })
  deletionReason?: string;

  @ApiProperty({
    example: "Documents manquants",
    description: "Raison du rejet de la procédure",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "raisonRejet doit être une chaîne de caractères" })
  @MinLength(5, { message: "La raison doit contenir au moins 5 caractères" })
  @MaxLength(500, { message: "La raison ne doit pas dépasser 500 caractères" })
  raisonRejet?: string;

  // ✅ AJOUT: Propriété dateCompletion
  @ApiProperty({
    example: "2024-01-20T15:45:00.000Z",
    description: "Date de completion de la procédure",
    required: false,
  })
  @IsOptional()
  @IsDate({ message: "dateCompletion doit être une date valide" })
  dateCompletion?: Date;
}
