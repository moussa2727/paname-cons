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
    description: 'Nouveau mot de passe',
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
    description: 'Email',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiProperty({
    example: '+33 6 12 34 56 78',
    description:
      'Téléphone (formats acceptés: +33 6 12 34 56 78 ou 06 12 34 56 78)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^(\+?[0-9][\d\s\-\\.\\()]{7,20})$/, {
    message:
      'Format de téléphone invalide. Accepté: +33 6 12 34 56 78, 06 12 34 56 78, +223 7 49 72 438, (0)1 23 45 67 89, etc.',
  })
  telephone?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Jean', description: 'Prénom', required: false })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName?: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom', required: false })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName?: string;

  @ApiProperty({
    example: '+33 6 12 34 56 78',
    description:
      'Téléphone (formats acceptés: +33 6 12 34 56 78 ou 06 12 34 56 78)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^(\+?[0-9][\d\s\-.()]{7,20})$/, {
    message:
      'Format de téléphone invalide. Accepté: +33 6 12 34 56 78, 06 12 34 56 78, +223 7 49 72 438, (0)1 23 45 67 89, etc.',
  })
  telephone?: string;
}
