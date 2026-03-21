// update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  Matches,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Nouveau mot de passe (optionnel)',
    required: false,
  })
  @IsOptional()
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
  password?: string;

  @ApiProperty({
    example: 'jean.dupont@example.com',
    description: 'Email (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiProperty({
    example: '+33 6 12 34 56 78',
    description:
      'Téléphone - accepte tous les formats: +33 6 12 34 56 78, 0612345678, 06-12-34-56-78, +33.6.12.34.56.78, etc.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[\s.-]?[(]?[0-9]{1,4}[)]?[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,4}$/,
    {
      message:
        'Format de téléphone invalide. Formats acceptés: +33 6 12 34 56 78, 0612345678, 06-12-34-56-78, +33.6.12.34.56.78, (0)1 23 45 67 89, etc.',
    },
  )
  telephone?: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Jean',
    description: 'Prénom (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName?: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName?: string;

  @ApiProperty({
    example: 'jean.dupont@example.com',
    description: 'Email (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Nouveau mot de passe (optionnel)',
    required: false,
  })
  @IsOptional()
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
  password?: string;

  @ApiProperty({
    example: '+33 6 12 34 56 78',
    description: 'Téléphone - accepte tous les formats (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[\s.-]?[(]?[0-9]{1,4}[)]?[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,4}$/,
    {
      message:
        'Format de téléphone invalide. Formats acceptés: +33 6 12 34 56 78, 0612345678, 06-12-34-56-78, +33.6.12.34.56.78, etc.',
    },
  )
  telephone?: string;
}
