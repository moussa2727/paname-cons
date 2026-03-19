import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminOpinion } from '@prisma/client';

export class CompleteRendezvousDto {
  @ApiProperty({
    description: "Avis de l'administrateur",
    enum: AdminOpinion,
    example: AdminOpinion.FAVORABLE,
  })
  @IsEnum(AdminOpinion)
  @IsNotEmpty()
  avisAdmin: AdminOpinion;

  @ApiPropertyOptional({
    description: 'Commentaires supplémentaires',
    example: 'Dossier complet, procédure lancée',
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
