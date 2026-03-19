import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    required: false,
    description: 'Token de rafraîchissement à révoquer',
  })
  @IsOptional()
  @IsString({ message: 'Le refresh token doit être une chaîne de caractères' })
  refresh_token?: string;
}
