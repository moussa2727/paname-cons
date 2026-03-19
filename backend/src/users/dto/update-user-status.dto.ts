import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'Le statut doit être un booléen' })
  isActive: boolean;

  @ApiProperty({ example: '2024-12-31T23:59:59.000Z', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Date invalide' })
  logoutUntil?: string;

  @ApiProperty({ example: 'Compte suspendu temporairement', required: false })
  @IsOptional()
  @IsString({ message: 'La raison doit être une chaîne de caractères' })
  reason?: string;
}
