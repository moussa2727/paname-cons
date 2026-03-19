import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProcedureDto {
  @ApiProperty({
    description: 'ID du rendez-vous associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: "L'ID du rendez-vous doit être un UUID valide" })
  @IsNotEmpty({ message: "L'ID du rendez-vous est requis" })
  rendezVousId: string;

  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes',
  })
  prenom: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes',
  })
  nom: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.dupont@email.com',
  })
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Téléphone',
    example: '+33612345678',
  })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Format de téléphone invalide (format international requis)',
  })
  telephone: string;

  @ApiProperty({
    description: 'Destination choisie',
    example: 'France',
  })
  @IsString({ message: 'La destination doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La destination est requise' })
  destination: string;

  @ApiPropertyOptional({
    description: 'Autre destination (si destination = "Autre")',
    example: 'Belgique',
  })
  @IsOptional()
  @IsString({
    message: 'La destination alternative doit être une chaîne de caractères',
  })
  destinationAutre?: string;

  @ApiProperty({
    description: 'Filière choisie',
    example: 'Informatique',
  })
  @IsString({ message: 'La filière doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La filière est requise' })
  filiere: string;

  @ApiPropertyOptional({
    description: 'Autre filière (si filiere = "Autre")',
    example: 'Data Science',
  })
  @IsOptional()
  @IsString({
    message: 'La filière alternative doit être une chaîne de caractères',
  })
  filiereAutre?: string;

  @ApiProperty({
    description: "Niveau d'étude",
    example: 'Master I',
  })
  @IsString({ message: "Le niveau d'étude doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "Le niveau d'étude est requis" })
  niveauEtude: string;

  @ApiPropertyOptional({
    description: 'Autre niveau d\'étude (si niveauEtude = "Autre")',
    example: 'DUT',
  })
  @IsOptional()
  @IsString({
    message: "Le niveau d'étude alternatif doit être une chaîne de caractères",
  })
  niveauEtudeAutre?: string;
}
