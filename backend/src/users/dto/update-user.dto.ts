import { PartialType, OmitType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateUserDto — pour les utilisateurs avec rôle USER.
 * Tous les champs de CreateUserDto deviennent optionnels (PATCH),
 * password est retiré puis rajouté avec @IsOptional.
 * email et telephone sont hérités tels quels de CreateUserDto
 * (avec la regex téléphone corrigée dans create-user.dto.ts).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description: 'Nouveau mot de passe',
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

/**
 * UpdateProfileDto — pour les ADMIN uniquement.
 * Seuls firstName, lastName et password sont autorisés.
 * email et telephone sont volontairement ABSENTS — un admin ne peut jamais
 * les modifier via cette route, ni au niveau DTO ni au niveau service.
 */
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, ['firstName', 'lastName', 'telephone'] as const),
) {
  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description: 'Nouveau mot de passe',
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

  @ApiPropertyOptional({
    example: '+2250707070707',
    description: 'Numéro de téléphone',
  })
  @IsOptional()
  @IsString({
    message: 'Le numéro de téléphone doit être une chaîne de caractères',
  })
  telephone?: string;
}
