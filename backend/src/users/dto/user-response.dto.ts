import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullName: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  email: string;

  @ApiProperty({
    example: '+33 6 12 34 56 78',
    description: 'Téléphone (format avec espaces)',
  })
  telephone: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  canLogin: boolean;

  @ApiProperty({ example: false })
  isTemporarilyLoggedOut: boolean;

  @ApiProperty({ example: null, nullable: true })
  logoutUntil: Date | null;

  @ApiProperty({ example: null, nullable: true })
  lastLogout: Date | null;

  @ApiProperty({ example: null, nullable: true })
  lastLogin: Date | null;

  @ApiProperty({ example: 5 })
  loginCount: number;

  @ApiProperty({ example: 2 })
  logoutCount: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class UsersListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
