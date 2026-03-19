import { IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'Ancien mot de passe',
  })
  @IsString({
    message: "L'ancien mot de passe doit être une chaîne de caractères",
  })
  @IsNotEmpty({ message: "L'ancien mot de passe est requis" })
  old_password: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'Nouveau mot de passe',
  })
  @IsString({
    message: 'Le nouveau mot de passe doit être une chaîne de caractères',
  })
  @MinLength(6, {
    message: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  new_password: string;
}
