import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondContactDto {
  @ApiProperty({
    example: 'Merci pour votre message. Nous vous contacterons bientôt.',
    description: "Réponse de l'administrateur",
  })
  @IsString({ message: 'La réponse doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La réponse est requise' })
  @MinLength(10, { message: 'La réponse doit contenir au moins 10 caractères' })
  @MaxLength(2000, {
    message: 'La réponse ne peut pas dépasser 2000 caractères',
  })
  response: string;

  @ApiProperty({
    example: true,
    description: 'Marquer comme lu après réponse',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'La valeur doit être un booléen' })
  markAsRead?: boolean;
}
