import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({
    example: 'Jean',
    description: 'Prénom (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  firstName?: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  lastName?: string;

  @ApiProperty({
    example: 'jean.dupont@example.com',
    description: 'Email',
    required: true,
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    example:
      'Bonjour, je souhaiterais avoir des informations sur les études en France.',
    description: 'Message',
    required: true,
  })
  @IsString({ message: 'Le message doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le message est requis' })
  @MinLength(10, { message: 'Le message doit contenir au moins 10 caractères' })
  @MaxLength(2000, {
    message: 'Le message ne peut pas dépasser 2000 caractères',
  })
  message: string;
}
