import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const TIME_SLOT_REGEX = /^(09|1[0-6]):(00|30)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

export class CreateRendezvousDto {
  @ApiProperty({ example: "Jean", description: "Prénom du client" })
  @IsNotEmpty({ message: "Le prénom est obligatoire" })
  @IsString({ message: "Le prénom doit être une chaîne de caractères" })
  firstName: string;

  @ApiProperty({ example: "Dupont", description: "Nom de famille du client" })
  @IsNotEmpty({ message: "Le nom est obligatoire" })
  @IsString({ message: "Le nom doit être une chaîne de caractères" })
  lastName: string;

  @ApiProperty({
    example: "jean.dupont@example.com",
    description: "Email du client",
  })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "Format d'email invalide" })
  email: string;

  @IsNotEmpty({ message: "Le téléphone est obligatoire" })
  @IsString({ message: "Le téléphone doit être une chaîne de caractères" })
  @MinLength(5, { message: "Le téléphone doit contenir au moins 5 caractères" })
  telephone: string;

  // Validation renforcée pour les champs "Autre"
  @IsOptional()
  @IsString()
  @MaxLength(100)
  destinationAutre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  filiereAutre?: string;

  @ApiProperty({
    example: "France",
    description: "Destination souhaitée (peut être une valeur personnalisée)",
  })
  @IsNotEmpty({ message: "La destination est obligatoire" })
  @IsString({ message: "La destination doit être une chaîne de caractères" })
  @MaxLength(100, {
    message: "La destination ne peut pas dépasser 100 caractères",
  })
  destination: string;

  @ApiProperty({
    enum: [
      "Bac",
      "Bac+1",
      "Bac+2",
      "Licence",
      "Master I",
      "Master II",
      "Doctorat",
    ],
    example: "Licence",
    description: "Niveau d'étude du client",
  })
  @IsNotEmpty({ message: "Le niveau d'étude est obligatoire" })
  @IsString({ message: "Le niveau d'étude doit être une chaîne de caractères" })
  niveauEtude: string;

  @ApiProperty({
    example: "Informatique",
    description: "Filière souhaitée (peut être une valeur personnalisée)",
  })
  @IsNotEmpty({ message: "La filière est obligatoire" })
  @IsString({ message: "La filière doit être une chaîne de caractères" })
  @MaxLength(100, { message: "La filière ne peut pas dépasser 100 caractères" })
  filiere: string;

  @ApiProperty({
    example: "2024-12-25",
    description: "Date du rendez-vous (YYYY-MM-DD)",
  })
  @IsNotEmpty({ message: "La date est obligatoire" })
  @Matches(DATE_REGEX, {
    message: "Format de date invalide (YYYY-MM-DD requis)",
  })
  date: string;

  @ApiProperty({
    example: "10:00",
    description:
      "Heure du rendez-vous (HH:MM) entre 09:00 et 16:30 par pas de 30min",
  })
  @IsNotEmpty({ message: "L'heure est obligatoire" })
  @Matches(TIME_SLOT_REGEX, {
    message: "Créneau horaire invalide (09:00-16:30, par pas de 30min)",
  })
  time: string;
}
