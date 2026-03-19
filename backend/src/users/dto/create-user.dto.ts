import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Jean', description: 'Prénom' })
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @ApiProperty({ example: 'jean.dupont@example.com', description: 'Email' })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Mot de passe' })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
    },
  )
  password: string;

  @ApiProperty({ example: '+33612345678', description: 'Téléphone' })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Format de téléphone invalide (format international requis)',
  })
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  telephone: string;
}
