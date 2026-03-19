import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RendezvousStatus,
  AdminOpinion,
  EducationLevel,
  CancelledBy,
} from '@prisma/client';

class UserInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  fullName: string;
}

class ProcedureInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  statut: string;
}

export class RendezvousResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  telephone: string;

  @ApiProperty()
  destination: string;

  @ApiPropertyOptional()
  destinationAutre?: string;

  @ApiProperty()
  effectiveDestination: string;

  @ApiProperty({ enum: EducationLevel })
  niveauEtude: EducationLevel;

  @ApiPropertyOptional()
  niveauEtudeAutre?: string;

  @ApiProperty()
  effectiveNiveauEtude: string;

  @ApiProperty()
  filiere: string;

  @ApiPropertyOptional()
  filiereAutre?: string;

  @ApiProperty()
  effectiveFiliere: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiProperty()
  dateTime: Date;

  @ApiProperty({ enum: RendezvousStatus })
  status: RendezvousStatus;

  @ApiPropertyOptional({ enum: AdminOpinion })
  avisAdmin?: AdminOpinion;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional({ enum: CancelledBy })
  cancelledBy?: CancelledBy;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional({ type: UserInfoDto })
  user?: UserInfoDto;

  @ApiPropertyOptional({ type: ProcedureInfoDto })
  procedure?: ProcedureInfoDto;

  @ApiProperty({
    description:
      'Un utilisateur peut annuler son propre rendez-vous si le statut est PENDING ou CONFIRMED',
  })
  canCancel: boolean;

  @ApiProperty({
    description:
      'Un utilisateur ne peut modifier que les rendez-vous PENDING ou CONFIRMED prévus dans plus de 24h',
  })
  canModify: boolean;

  @ApiProperty()
  isPast: boolean;

  @ApiProperty()
  isToday: boolean;

  @ApiProperty({
    description: 'Minutes restantes avant le rendez-vous (négatif si passé)',
  })
  minutesUntilRendezvous: number;

  @ApiPropertyOptional({
    description: 'Informations sur la pause déjeuner (12:00-14:00)',
    example: {
      lunchBreakStart: '12:00',
      lunchBreakEnd: '14:00',
      isLunchBreak: false,
    },
  })
  lunchBreakInfo?: {
    lunchBreakStart: string;
    lunchBreakEnd: string;
    isLunchBreak: boolean;
  };
}

export class PaginatedRendezvousResponseDto {
  @ApiProperty({ type: [RendezvousResponseDto] })
  data: RendezvousResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;
}

export class RendezvousStatisticsDto {
  @ApiProperty()
  total: number;

  @ApiProperty({
    example: {
      confirmed: 80,
      completed: 45,
      cancelled: 15,
      pending: 10,
    },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    example: {
      today: 8,
      tomorrow: 12,
      thisWeek: 45,
      thisMonth: 120,
    },
  })
  upcoming: Record<string, number>;

  @ApiProperty({
    example: [
      { destination: 'France', count: 45 },
      { destination: 'Canada', count: 32 },
    ],
  })
  topDestinations: { destination: string; count: number }[];

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  cancellationRate: number;
}

export class AvailableSlotsDto {
  @ApiProperty()
  date: string;

  @ApiProperty({
    example: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ],
    type: [String],
  })
  slots: string[];

  @ApiProperty()
  totalAvailable: number;

  @ApiProperty()
  totalSlots: number;
}

export class AvailabilityCheckDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiPropertyOptional({
    example: {
      date: '2024-12-25',
      time: '15:00',
    },
  })
  nextAvailableSlot?: { date: string; time: string };

  @ApiPropertyOptional({
    example: ['14:30', '15:00', '15:30'],
    type: [String],
  })
  alternativeSlots?: string[];
}
