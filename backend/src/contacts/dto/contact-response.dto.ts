import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullName: string;

  @ApiProperty({ example: 'j***t@example.com' })
  email: string;

  @ApiProperty({
    example: 'Bonjour, je souhaiterais avoir des informations...',
  })
  message: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: 'Merci pour votre message...', nullable: true })
  adminResponse: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  respondedAt: Date | null;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  respondedBy: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  userId: string | null;
}

export class ContactListResponseDto {
  @ApiProperty({ type: [ContactResponseDto] })
  data: ContactResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  unreadCount: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
