import { PartialType } from '@nestjs/swagger';
import { CreateProcedureDto } from './create-procedure.dto';
import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {
  @ApiPropertyOptional({
    description: 'Raison du rejet',
    example: 'Dossier incomplet',
  })
  @IsOptional()
  @IsString({
    message: 'La raison du rejet doit être une chaîne de caractères',
  })
  raisonRejet?: string;

  @ApiPropertyOptional({
    description: 'Marquer comme supprimé',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isDeleted doit être un booléen' })
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Date de suppression',
    example: '2024-01-25T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date de suppression invalide' })
  deletedAt?: string;

  @ApiPropertyOptional({
    description: 'Raison de la suppression',
    example: 'Doublon',
  })
  @IsOptional()
  @IsString({
    message: 'La raison de suppression doit être une chaîne de caractères',
  })
  deletionReason?: string;
}
