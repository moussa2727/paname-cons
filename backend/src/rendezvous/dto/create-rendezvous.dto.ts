import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RENDEZVOUS_CONSTANTS } from '../../holidays/holidays.service';

export class CreateRendezvousDto {
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
  firstName: string;

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
  lastName: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.dupont@email.com',
  })
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsNotEmpty({ message: "L'email est requis" })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  email: string;

  @ApiProperty({
    description: 'Téléphone (format international)',
    example: '+33612345678',
  })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message:
      'Format de téléphone invalide (format international requis: +22812345678)',
  })
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  telephone: string;

  @ApiProperty({
    description: 'Destination choisie',
    example: 'France',
  })
  @IsString({ message: 'La destination doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La destination est requise' })
  @MinLength(2, {
    message: 'La destination doit contenir au moins 2 caractères',
  })
  @MaxLength(100, {
    message: 'La destination ne peut pas dépasser 100 caractères',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-+']+$/, {
    message:
      'La destination ne peut contenir que des lettres, espaces, tirets, plus et apostrophes',
  })
  destination: string;

  @ApiPropertyOptional({
    description: 'Autre destination (obligatoire si destination = "Autre")',
    example: 'Suisse',
    minLength: 2,
    maxLength: 100,
  })
  @ValidateIf(
    (o: CreateRendezvousDto) =>
      o.destination?.toLowerCase() === 'autre' || o.destination === 'Autre',
  )
  @IsNotEmpty({ message: 'La destination "Autre" nécessite une précision' })
  @IsString({
    message: 'La destination alternative doit être une chaîne de caractères',
  })
  @MinLength(2, {
    message: 'La destination personnalisée doit contenir au moins 2 caractères',
  })
  @MaxLength(100, {
    message: 'La destination personnalisée ne peut pas dépasser 100 caractères',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-+.']+$/, {
    message:
      'La destination personnalisée ne peut contenir que des lettres, espaces, tirets, plus et apostrophes',
  })
  destinationAutre?: string;

  @ApiProperty({
    description: "Niveau d'étude",
    example: 'Master I',
  })
  @IsString({ message: "Le niveau d'étude doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "Le niveau d'étude est requis" })
  @MinLength(2, {
    message: "Le niveau d'étude doit contenir au moins 2 caractères",
  })
  @MaxLength(100, {
    message: "Le niveau d'étude ne peut pas dépasser 100 caractères",
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-+.']+$/, {
    message:
      "Le niveau d'étude ne peut contenir que des lettres, chiffres, espaces, tirets, plus et points",
  })
  niveauEtude: string;

  @ApiPropertyOptional({
    description: 'Autre niveau d\'étude (obligatoire si niveauEtude = "Autre")',
    example: 'DUT',
    minLength: 2,
    maxLength: 100,
  })
  @ValidateIf(
    (o: CreateRendezvousDto) =>
      o.niveauEtude?.toLowerCase() === 'autre' || o.niveauEtude === 'Autre',
  )
  @IsNotEmpty({ message: 'Le niveau d\'étude "Autre" nécessite une précision' })
  @IsString({
    message: "Le niveau d'étude alternatif doit être une chaîne de caractères",
  })
  @MinLength(2, {
    message:
      "Le niveau d'étude personnalisé doit contenir au moins 2 caractères",
  })
  @MaxLength(100, {
    message:
      "Le niveau d'étude personnalisé ne peut pas dépasser 100 caractères",
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-']+$/, {
    message:
      "Le niveau d'étude personnalisé ne peut contenir que des lettres, chiffres, espaces et tirets",
  })
  niveauEtudeAutre?: string;

  @ApiProperty({
    description: 'Filière choisie',
    example: 'Informatique',
  })
  @IsString({ message: 'La filière doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La filière est requise' })
  @MinLength(2, {
    message: 'La filière doit contenir au moins 2 caractères',
  })
  @MaxLength(100, {
    message: 'La filière ne peut pas dépasser 100 caractères',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-+.']+$/, {
    message:
      'La filière ne peut contenir que des lettres, espaces, tirets, plus et apostrophes',
  })
  filiere: string;

  @ApiPropertyOptional({
    description: 'Autre filière (obligatoire si filiere = "Autre")',
    example: 'Data Science',
    minLength: 2,
    maxLength: 100,
  })
  @ValidateIf(
    (o: CreateRendezvousDto) =>
      o.filiere?.toLowerCase() === 'autre' || o.filiere === 'Autre',
  )
  @IsNotEmpty({ message: 'La filière "Autre" nécessite une précision' })
  @IsString({
    message: 'La filière alternative doit être une chaîne de caractères',
  })
  @MinLength(2, {
    message: 'La filière personnalisée doit contenir au moins 2 caractères',
  })
  @MaxLength(100, {
    message: 'La filière personnalisée ne peut pas dépasser 100 caractères',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-+.']+$/, {
    message:
      'La filière personnalisée ne peut contenir que des lettres, espaces, tirets, plus et apostrophes',
  })
  filiereAutre?: string;

  @ApiProperty({
    description: 'Date du rendez-vous (format YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString({}, { message: 'Format de date invalide (YYYY-MM-DD requis)' })
  @IsNotEmpty({ message: 'La date est requise' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, {
    message:
      'La date doit être au format YYYY-MM-DD avec un mois et un jour valides',
  })
  date: string;

  @ApiProperty({
    description: 'Heure du rendez-vous (format HH:MM)',
    example: '14:30',
    enum: RENDEZVOUS_CONSTANTS.TIME_SLOTS.ALL,
  })
  @IsString({ message: "L'heure doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'heure est requise" })
  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, {
    message:
      "Format d'heure invalide (HH:MM requis avec des heures entre 00-23 et minutes entre 00-59)",
  })
  @ValidateIf(
    (o: CreateRendezvousDto) => {
      if (!o.time) return true;
      const [hours, minutes] = o.time.split(':').map(Number);
      const isLunchBreak = (hours === 12 && minutes >= 30) || hours === 13;
      return !isLunchBreak;
    },
    {
      message: RENDEZVOUS_CONSTANTS.VALIDATION_MESSAGES.LUNCH_BREAK,
    },
  )
  time: string;
}
