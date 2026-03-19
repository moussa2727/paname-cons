import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminUpdateUserDto {
  @ApiProperty({
    example: 'Jean',
    description: 'Prénom',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName?: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName?: string;

  @ApiProperty({
    example: '+33612345678',
    description: 'Téléphone',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Format de téléphone invalide' })
  telephone?: string;

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
}
