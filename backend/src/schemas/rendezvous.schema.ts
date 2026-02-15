import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model } from 'mongoose';
import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

// Constantes pour la cohérence - RETIRÉ MISSED
export const RENDEZVOUS_STATUS = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
} as const;

export const ADMIN_OPINION = {
  FAVORABLE: 'Favorable',
  UNFAVORABLE: 'Défavorable',
} as const;

export const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat',
] as const;

export const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
] as const;

// DESTINATIONS - Inclure "Autre" comme option valide
export const DESTINATIONS = [
  'Russie',
  'Chypre',
  'Chine',
  'Maroc',
  'Algérie',
  'Turquie',
  'France',
  'Autre',
] as const;

export const FILIERES = [
  'Informatique',
  'Médecine',
  'Droit',
  'Commerce',
  'Ingénierie',
  'Architecture',
  'Autre',
] as const;

// Interface pour les méthodes d'instance
export interface RendezvousMethods {
  getEffectiveDestination(): string;
  getEffectiveFiliere(): string;
  isPast(): boolean;
  canBeCancelled(byAdmin?: boolean): boolean;
  canBeModified(): boolean;
  canBeMarkedAsCompleted(): boolean;
  toSafeJSON(): any;
  isToday(): boolean;
}

// Interface pour les méthodes statiques
export interface RendezvousModel extends Model<
  Rendezvous,
  Record<string, never>,
  RendezvousMethods
> {
  findActiveByEmail(email: string): Promise<Rendezvous[]>;
  countDailyBookings(date: string): Promise<number>;
}

export type RendezvousDocument = Rendezvous & Document & RendezvousMethods;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Rendezvous {
  @Transform(({ value }) => value.toString())
  _id: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  firstName: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  lastName: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalide'],
    index: true,
  })
  email: string;

  @Prop({
    required: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Format téléphone invalide'],
  })
  telephone: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
    enum: DESTINATIONS, // "Autre" inclus comme valeur valide
  })
  destination: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 100,
  })
  destinationAutre?: string;

  @Prop({
    required: true,
    trim: true,
    enum: EDUCATION_LEVELS,
  })
  niveauEtude: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
    enum: FILIERES, // "Autre" inclus comme valeur valide
  })
  filiere: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 100,
  })
  filiereAutre?: string;

  @Prop({
    required: true,
    match: [
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      'Format de date invalide (YYYY-MM-DD requis)',
    ],
    index: true,
  })
  date: string;

  @Prop({
    required: true,
    match: [
      /^(09|1[0-6]):(00|30)$/,
      'Créneau horaire invalide (09:00-16:30, par pas de 30min)',
    ],
    enum: TIME_SLOTS,
    index: true,
  })
  time: string;

  @Prop({
    default: RENDEZVOUS_STATUS.CONFIRMED,
    enum: Object.values(RENDEZVOUS_STATUS),
    index: true,
  })
  status: string;

  @Prop({
    required: false,
    enum: Object.values(ADMIN_OPINION),
  })
  avisAdmin?: string;

  @Prop({
    required: false,
  })
  cancelledAt?: Date;

  @Prop({
    required: false,
    enum: ['admin', 'user', 'system'],
  })
  cancelledBy?: string;

  @Prop({
    required: false,
  })
  cancellationReason?: string;

  @Prop({
    default: Date.now,
  })
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  user?: mongoose.Schema.Types.ObjectId;

  // Virtual pour la destination effective (celle qui doit être affichée)
  @Prop({
    virtual: true,
    get: function () {
      const rendezvous = this as any;
      // Si destination est "Autre", retourner destinationAutre, sinon destination
      return rendezvous.destination === 'Autre' && rendezvous.destinationAutre
        ? rendezvous.destinationAutre
        : rendezvous.destination;
    },
  })
  effectiveDestination?: string;

  // Virtual pour la filière effective (celle qui doit être affichée)
  @Prop({
    virtual: true,
    get: function () {
      const rendezvous = this as any;
      // Si filiere est "Autre", retourner filiereAutre, sinon filiere
      return rendezvous.filiere === 'Autre' && rendezvous.filiereAutre
        ? rendezvous.filiereAutre
        : rendezvous.filiere;
    },
  })
  effectiveFiliere?: string;

  // Virtual pour la date/heure combinée
  @Prop({
    virtual: true,
    get: function () {
      const rendezvous = this as any;
      const dateStr = rendezvous.date;
      const timeStr = rendezvous.time;

      if (!dateStr || !timeStr) return null;

      const dateTimeStr = `${dateStr}T${timeStr}:00.000Z`;
      const dateTime = new Date(dateTimeStr);

      return isNaN(dateTime.getTime()) ? null : dateTime;
    },
    set: function (value: Date) {
      if (value && !isNaN(value.getTime())) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        const day = String(value.getUTCDate()).padStart(2, '0');
        const hours = String(value.getUTCHours()).padStart(2, '0');
        const minutes = String(value.getUTCMinutes()).padStart(2, '0');

        this.date = `${year}-${month}-${day}`;
        this.time = `${hours}:${minutes}`;
      }
    },
  })
  dateTime?: Date;

  // Virtual pour la disponibilité du rendez-vous
  @Prop({
    virtual: true,
    get: function () {
      const rendezvous = this as any;
      if (!rendezvous.dateTime) return null;

      const availabilityTime = new Date(
        rendezvous.dateTime.getTime() + 10 * 60000
      );
      return availabilityTime;
    },
  })
  availabilityTime?: Date;
}

export const RendezvousSchema = SchemaFactory.createForClass(Rendezvous);

RendezvousSchema.pre('save', async function () {
  const rendezvous = this as any;

  // Normalisation des champs
  if (rendezvous.firstName) rendezvous.firstName = rendezvous.firstName.trim();
  if (rendezvous.lastName) rendezvous.lastName = rendezvous.lastName.trim();
  if (rendezvous.email)
    rendezvous.email = rendezvous.email.toLowerCase().trim();
  if (rendezvous.telephone) rendezvous.telephone = rendezvous.telephone.trim();
  if (rendezvous.destination)
    rendezvous.destination = rendezvous.destination.trim();
  if (rendezvous.destinationAutre)
    rendezvous.destinationAutre = rendezvous.destinationAutre.trim();
  if (rendezvous.filiere) rendezvous.filiere = rendezvous.filiere.trim();
  if (rendezvous.filiereAutre)
    rendezvous.filiereAutre = rendezvous.filiereAutre.trim();

  // VÉRIFICATION STRICTE DES DESTINATIONS
  const validDestinations = [
    'Russie',
    'Chypre',
    'Chine',
    'Maroc',
    'Algérie',
    'Turquie',
    'France',
  ];

  // Validation destination "Autre"
  if (rendezvous.destination === 'Autre') {
    if (
      !rendezvous.destinationAutre ||
      rendezvous.destinationAutre.trim() === ''
    ) {
      throw new BadRequestException(
        'La destination "Autre" nécessite une précision dans le champ destinationAutre'
      );
    }
  } else if (!validDestinations.includes(rendezvous.destination)) {
    throw new BadRequestException(
      `Destination invalide. Valeurs autorisées: ${validDestinations.join(', ')}`
    );
  }

  // Validation filière "Autre"
  const validFilieres = [
    'Informatique',
    'Médecine',
    'Droit',
    'Commerce',
    'Ingénierie',
    'Architecture',
  ];

  if (rendezvous.filiere === 'Autre') {
    if (!rendezvous.filiereAutre || rendezvous.filiereAutre.trim() === '') {
      throw new BadRequestException(
        'La filière "Autre" nécessite une précision dans le champ filiereAutre'
      );
    }
  } else if (!validFilieres.includes(rendezvous.filiere)) {
    throw new BadRequestException(
      `Filière invalide. Valeurs autorisées: ${validFilieres.join(', ')}, ou "Autre"`
    );
  }

  // Validation de la date
  if (rendezvous.date) {
    const date = new Date(rendezvous.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(date.getTime()) || date < today) {
      throw new BadRequestException('Date invalide ou passée');
    }
  }

  // Validation de l'heure
  if (rendezvous.time) {
    const [hours, minutes] = rendezvous.time.split(':').map(Number);
    const timeInHours = hours + minutes / 60;

    if (timeInHours < 9 || timeInHours > 16.5) {
      throw new BadRequestException(
        'Les horaires disponibles sont entre 9h00 et 16h30'
      );
    }

    const totalMinutes = (hours - 9) * 60 + minutes;
    if (totalMinutes % 30 !== 0) {
      throw new BadRequestException(
        'Les créneaux doivent être espacés de 30 minutes'
      );
    }
  }

  // Marquer la date de mise à jour
  rendezvous.updatedAt = new Date();
});

// ==================== MÉTHODES D'INSTANCE ====================

RendezvousSchema.methods.getEffectiveDestination = function (): string {
  const rendezvous = this as any;
  // Si destination est "Autre", retourner destinationAutre, sinon retourner destination
  return rendezvous.destination === 'Autre' && rendezvous.destinationAutre
    ? rendezvous.destinationAutre
    : rendezvous.destination;
};

RendezvousSchema.methods.getEffectiveFiliere = function (): string {
  const rendezvous = this as any;
  // Si filiere est "Autre", retourner filiereAutre, sinon retourner filiere
  return rendezvous.filiere === 'Autre' && rendezvous.filiereAutre
    ? rendezvous.filiereAutre
    : rendezvous.filiere;
};

RendezvousSchema.methods.isPast = function (): boolean {
  const rendezvous = this as any;

  if (!rendezvous.dateTime || isNaN(rendezvous.dateTime.getTime())) {
    return false;
  }

  const now = new Date();
  return rendezvous.dateTime < now;
};

RendezvousSchema.methods.canBeCancelled = function (
  byAdmin: boolean = false
): boolean {
  const rendezvous = this as any;

  if (
    rendezvous.status === RENDEZVOUS_STATUS.CANCELLED ||
    rendezvous.status === RENDEZVOUS_STATUS.COMPLETED
  ) {
    return false;
  }

  if (byAdmin) {
    return true;
  }

  if (!rendezvous.dateTime || isNaN(rendezvous.dateTime.getTime())) {
    return false;
  }

  // Utilisateurs normaux : annulation possible jusqu'à 2h avant
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const timeUntilRdv = rendezvous.dateTime.getTime() - now.getTime();

  return (
    timeUntilRdv > twoHoursMs &&
    rendezvous.status === RENDEZVOUS_STATUS.CONFIRMED
  );
};

RendezvousSchema.methods.canBeModified = function (): boolean {
  const rendezvous = this as any;

  return (
    rendezvous.status !== RENDEZVOUS_STATUS.COMPLETED &&
    rendezvous.status !== RENDEZVOUS_STATUS.CANCELLED
  );
};

RendezvousSchema.methods.canBeMarkedAsCompleted = function (): boolean {
  const rendezvous = this as any;

  if (
    rendezvous.status === RENDEZVOUS_STATUS.COMPLETED ||
    rendezvous.status === RENDEZVOUS_STATUS.CANCELLED
  ) {
    return false;
  }

  if (!rendezvous.dateTime || isNaN(rendezvous.dateTime.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    rendezvous.dateTime <= now &&
    rendezvous.status === RENDEZVOUS_STATUS.CONFIRMED
  );
};

RendezvousSchema.methods.isToday = function (): boolean {
  const rendezvous = this as any;

  if (!rendezvous.date) return false;

  const today = new Date().toISOString().split('T')[0];
  return rendezvous.date === today;
};

RendezvousSchema.methods.toSafeJSON = function () {
  const rendezvous = this as any;
  const obj = rendezvous.toObject();

  // Masquer l'email
  if (obj.email) {
    const [localPart, domain] = obj.email.split('@');
    if (localPart && domain) {
      const maskedLocal =
        localPart.length <= 2
          ? localPart.charAt(0) + '*'
          : localPart.charAt(0) +
            '***' +
            localPart.charAt(localPart.length - 1);
      obj.email = `${maskedLocal}@${domain}`;
    }
  }

  // Ajouter les champs virtuels
  obj.effectiveDestination = rendezvous.getEffectiveDestination();
  obj.effectiveFiliere = rendezvous.getEffectiveFiliere();
  obj.isPast = rendezvous.isPast();
  obj.canBeCancelledByUser = rendezvous.canBeCancelled(false);
  obj.canBeModified = rendezvous.canBeModified();
  obj.canBeMarkedAsCompleted = rendezvous.canBeMarkedAsCompleted();
  obj.isToday = rendezvous.isToday();

  // Ajouter les informations de disponibilité
  if (rendezvous.dateTime) {
    const now = new Date();
    const availabilityTime = new Date(rendezvous.dateTime.getTime() + 10 * 60000);
    obj.minutesUntilAvailability = Math.max(
      0,
      Math.round((availabilityTime.getTime() - now.getTime()) / 60000)
    );
  }

  return obj;
};

// ==================== MÉTHODES STATIQUES ====================

RendezvousSchema.statics.findActiveByEmail = async function (
  email: string
): Promise<Rendezvous[]> {
  const normalizedEmail = email.toLowerCase().trim();

  return this.find({
    email: normalizedEmail,
    status: { $nin: [RENDEZVOUS_STATUS.CANCELLED] },
  })
    .sort({ date: -1, time: 1 })
    .exec();
};

RendezvousSchema.statics.countDailyBookings = async function (
  date: string
): Promise<number> {
  return this.countDocuments({
    date,
    status: { $nin: [RENDEZVOUS_STATUS.CANCELLED] },
  }).exec();
};

// ==================== INDEXES ====================

// Index unique pour éviter les doublons de créneaux (sauf annulés)
RendezvousSchema.index(
  { date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $nin: [RENDEZVOUS_STATUS.CANCELLED],
      },
    },
  }
);

// Index composé pour les recherches fréquentes
RendezvousSchema.index({ email: 1, status: 1 });
RendezvousSchema.index({ status: 1, date: 1 });
RendezvousSchema.index({ email: 1, date: -1 });
RendezvousSchema.index({ date: 1, status: 1, time: 1 });

// Index pour les jobs cron
RendezvousSchema.index(
  {
    status: 1,
    createdAt: 1,
  },
  {
    partialFilterExpression: { status: RENDEZVOUS_STATUS.PENDING },
  }
);

RendezvousSchema.index(
  {
    status: 1,
    date: 1,
    time: 1,
  },
  {
    partialFilterExpression: {
      status: { $in: [RENDEZVOUS_STATUS.PENDING, RENDEZVOUS_STATUS.CONFIRMED] },
    },
  }
);

// Index pour la synchronisation email
RendezvousSchema.index({ email: 1, updatedAt: -1 });

// Index pour les vérifications en temps réel
RendezvousSchema.index(
  {
    date: 1,
    time: 1,
    status: 1,
  },
  {
    background: true,
  }
);