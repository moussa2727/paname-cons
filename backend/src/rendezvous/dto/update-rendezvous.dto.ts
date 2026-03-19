import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminOpinion, RendezvousStatus } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CreateRendezvousDto } from './create-rendezvous.dto';

export class UpdateRendezvousDto extends PartialType(CreateRendezvousDto) {
  @ApiPropertyOptional({
    description: "Avis de l'administrateur",
    enum: AdminOpinion,
    example: AdminOpinion.FAVORABLE,
  })
  @IsOptional()
  @IsEnum(AdminOpinion, { message: 'Avis administrateur invalide' })
  avisAdmin?: AdminOpinion;

  @ApiPropertyOptional({
    description: "Raison de l'annulation (si annulé)",
    example: "Conflit d'horaire",
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Statut du rendez-vous',
    enum: RendezvousStatus,
    example: RendezvousStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(RendezvousStatus, { message: 'Statut invalide' })
  status?: RendezvousStatus;
}
