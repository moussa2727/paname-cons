import { ApiProperty } from '@nestjs/swagger';

export enum ReminderType {
  ONE_HOUR = '1H_BEFORE',
  TWO_HOURS = '2H_BEFORE',
  TWENTY_FOUR_HOURS = '24H_BEFORE',
  FORTY_EIGHT_HOURS = '48H_BEFORE',
  CUSTOM = 'CUSTOM',
}

export enum ReminderChannel {
  EMAIL = 'EMAIL',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Entité pour un rappel de rendez-vous
 */
export class RendezvousReminderEntity {
  @ApiProperty({
    description: 'Identifiant unique du rappel',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Identifiant du rendez-vous associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  rendezvousId: string;

  @ApiProperty({
    description: 'Type de rappel',
    enum: ReminderType,
    example: ReminderType.TWENTY_FOUR_HOURS,
  })
  type: ReminderType;

  @ApiProperty({
    description: "Date et heure planifiée pour l'envoi",
    example: '2024-12-24T10:00:00.000Z',
  })
  scheduledFor: Date;

  @ApiProperty({
    description: "Date et heure réelle d'envoi",
    example: '2024-12-24T10:00:05.000Z',
    required: false,
  })
  sentAt?: Date;

  @ApiProperty({
    description: 'Statut du rappel',
    enum: ReminderStatus,
    example: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @ApiProperty({
    description: "Canal d'envoi",
    enum: ReminderChannel,
    example: ReminderChannel.EMAIL,
  })
  channel: ReminderChannel;

  @ApiProperty({
    description: 'Nombre de tentatives effectuées',
    example: 0,
    minimum: 0,
    maximum: 5,
  })
  attempts: number;

  @ApiProperty({
    description: "Message d'erreur en cas d'échec",
    example: 'Échec de connexion SMTP',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Contenu du rappel envoyé',
    example: {
      subject: 'Rappel: Votre rendez-vous dans 24h',
      body: 'Bonjour Jean, votre rendez-vous est demain à 14h30.',
    },
    required: false,
  })
  content?: {
    subject: string;
    body: string;
    html?: string;
  };

  @ApiProperty({
    description: 'Métadonnées supplémentaires',
    example: {
      template: 'rendezvous-reminder-24h',
      priority: 'high',
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Date de création du rappel',
    example: '2024-12-20T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-12-24T10:00:05.000Z',
  })
  updatedAt: Date;
}

/**
 * Entité pour la création d'un rappel
 */
export class CreateRendezvousReminderEntity {
  @ApiProperty({
    description: 'Type de rappel',
    enum: ReminderType,
    example: ReminderType.TWENTY_FOUR_HOURS,
  })
  type: ReminderType;

  @ApiProperty({
    description: "Canal d'envoi",
    enum: ReminderChannel,
    example: ReminderChannel.EMAIL,
    default: ReminderChannel.EMAIL,
  })
  channel?: ReminderChannel;

  @ApiProperty({
    description:
      'Date et heure planifiée (optionnelle, calculée automatiquement si non fournie)',
    example: '2024-12-24T10:00:00.000Z',
    required: false,
  })
  scheduledFor?: Date;

  @ApiProperty({
    description:
      'Contenu personnalisé (optionnel, utilise le template par défaut si non fourni)',
    required: false,
  })
  customContent?: {
    subject: string;
    body: string;
  };
}

/**
 * Entité pour les statistiques des rappels
 */
export class ReminderStatisticsEntity {
  @ApiProperty({
    description: 'Total des rappels programmés',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Rappels par statut',
    example: {
      pending: 45,
      sent: 95,
      failed: 8,
      cancelled: 2,
    },
  })
  byStatus: Record<ReminderStatus, number>;

  @ApiProperty({
    description: 'Rappels par type',
    example: {
      '24H_BEFORE': 80,
      '2H_BEFORE': 45,
      '1H_BEFORE': 25,
    },
  })
  byType: Record<ReminderType, number>;

  @ApiProperty({
    description: 'Rappels par canal',
    example: {
      EMAIL: 150,
    },
  })
  byChannel: Record<ReminderChannel, number>;

  @ApiProperty({
    description: 'Taux de succès',
    example: 94.5,
    minimum: 0,
    maximum: 100,
  })
  successRate: number;

  @ApiProperty({
    description: "Rappels à envoyer aujourd'hui",
    example: 12,
  })
  pendingToday: number;

  @ApiProperty({
    description: 'Rappels à envoyer demain',
    example: 18,
  })
  pendingTomorrow: number;

  @ApiProperty({
    description: "Temps moyen d'envoi (en secondes)",
    example: 2.5,
  })
  averageSendTime: number;
}

/**
 * Entité pour le résultat d'envoi d'un rappel
 */
export class ReminderResultEntity {
  @ApiProperty({
    description: 'Identifiant du rappel',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  reminderId: string;

  @ApiProperty({
    description: 'Identifiant du rendez-vous',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  rendezvousId: string;

  @ApiProperty({
    description: 'Email du destinataire',
    example: 'jean.dupont@email.com',
  })
  recipient: string;

  @ApiProperty({
    description: 'Nom du destinataire',
    example: 'Jean Dupont',
  })
  recipientName: string;

  @ApiProperty({
    description: 'Type de rappel',
    enum: ReminderType,
    example: ReminderType.TWENTY_FOUR_HOURS,
  })
  reminderType: ReminderType;

  @ApiProperty({
    description: 'Canal utilisé',
    enum: ReminderChannel,
    example: ReminderChannel.EMAIL,
  })
  channel: ReminderChannel;

  @ApiProperty({
    description: "Indique si l'envoi a réussi",
    example: true,
  })
  sent: boolean;

  @ApiProperty({
    description: "Date d'envoi",
    example: '2024-12-24T10:00:05.000Z',
    required: false,
  })
  sentAt?: Date;

  @ApiProperty({
    description: "Message d'erreur en cas d'échec",
    example: 'Échec de connexion SMTP',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Tentative numéro',
    example: 1,
    minimum: 1,
  })
  attempt: number;

  @ApiProperty({
    description: 'Temps de traitement (en ms)',
    example: 250,
  })
  processingTimeMs: number;
}

/**
 * Entité pour la configuration des rappels
 */
export class ReminderConfigEntity {
  @ApiProperty({
    description: 'Activer les rappels par email',
    example: true,
    default: true,
  })
  enableEmailReminders: boolean;

  @ApiProperty({
    description: 'Délais de rappel (en heures avant le rendez-vous)',
    example: [48, 24, 2],
    default: [24],
  })
  reminderDelays: number[];

  @ApiProperty({
    description: 'Heure limite pour les rappels du jour (format HH:MM)',
    example: '21:00',
    default: '21:00',
  })
  dailyCutoffTime: string;

  @ApiProperty({
    description: 'Nombre maximum de tentatives',
    example: 3,
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  maxAttempts: number;

  @ApiProperty({
    description: 'Délai entre les tentatives (en minutes)',
    example: 5,
    minimum: 1,
    default: 5,
  })
  retryDelayMinutes: number;
}

/**
 * Entité pour la réponse de planification de rappel
 */
export class ScheduleReminderResponseEntity {
  @ApiProperty({
    description: 'Identifiant du rappel créé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  reminderId: string;

  @ApiProperty({
    description: 'Identifiant du rendez-vous',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  rendezvousId: string;

  @ApiProperty({
    description: 'Type de rappel',
    enum: ReminderType,
    example: ReminderType.TWENTY_FOUR_HOURS,
  })
  type: ReminderType;

  @ApiProperty({
    description: 'Date et heure planifiée',
    example: '2024-12-24T10:00:00.000Z',
  })
  scheduledFor: Date;

  @ApiProperty({
    description: 'Canal utilisé',
    enum: ReminderChannel,
    example: ReminderChannel.EMAIL,
  })
  channel: ReminderChannel;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Rappel programmé avec succès pour le 24/12/2024 à 10h00',
  })
  message: string;
}
