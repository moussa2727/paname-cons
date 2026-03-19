import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class LoginResponseDto {
  @ApiProperty({
    description: "Token d'accès JWT (expire dans 15 minutes)",
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Type de token',
    example: 'Bearer',
    default: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: "Durée d'expiration du token d'accès en secondes",
    example: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: 'Token de rafraîchissement (expire dans 7 ou 30 jours)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  refresh_token?: string;

  @ApiProperty({
    description: 'Indique si la session est mémorisée (30 jours)',
    example: false,
  })
  remember_me: boolean;

  @ApiProperty({
    description: "Informations de base de l'utilisateur",
    type: 'object',
    properties: {
      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      email: { type: 'string', example: 'jean.dupont@email.com' },
      firstName: { type: 'string', example: 'Jean' },
      lastName: { type: 'string', example: 'Dupont' },
      fullName: { type: 'string', example: 'Jean Dupont' },
      telephone: { type: 'string', example: '+33612345678' },
      role: { enum: Object.values(UserRole), example: UserRole.USER },
      isActive: { type: 'boolean', example: true },
      canLogin: { type: 'boolean', example: true },
      isTemporarilyLoggedOut: { type: 'boolean', example: false },
      logoutUntil: { type: 'string', nullable: true, example: null },
      lastLogin: { type: 'string', nullable: true, example: null },
      loginCount: { type: 'number', example: 1 },
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    telephone: string;
    role: UserRole;
    isActive: boolean;
    canLogin: boolean;
    isTemporarilyLoggedOut: boolean;
    logoutUntil: Date | null;
    lastLogin: Date | null;
    loginCount: number;
  };

  constructor(partial: Partial<LoginResponseDto>) {
    Object.assign(this, partial);
  }
}
