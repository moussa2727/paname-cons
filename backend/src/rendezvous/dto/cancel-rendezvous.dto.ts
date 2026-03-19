import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CancelledBy } from '@prisma/client';
export class CancelRendezvousDto {
  @ApiProperty({
    description: "Raison de l'annulation",
    example: 'Empêchement personnel',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Annulé par',
    enum: CancelledBy,
    default: CancelledBy.USER,
  })
  @IsOptional()
  @IsEnum(CancelledBy)
  cancelledBy?: CancelledBy;
}
