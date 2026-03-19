import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ required: false, description: 'Token de rafraîchissement' })
  @IsOptional()
  @IsString({ message: 'Le refresh token doit être une chaîne de caractères' })
  refresh_token?: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: "Nouveau token d'accès" })
  access_token: string;

  @ApiProperty({ description: 'Nouveau token de rafraîchissement' })
  refresh_token: string;
}
