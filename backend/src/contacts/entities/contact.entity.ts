import { User } from '@prisma/client';

/**
 * Entité de base Contact (correspond au modèle Prisma)
 */
export class ContactEntity {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  message: string;
  isRead: boolean;
  adminResponse: string | null;
  respondedAt: Date | null;
  respondedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;

  // Relations optionnelles
  user?: User;
}

/**
 * Entité enrichie avec des propriétés calculées
 */
export class ContactWithMetaEntity extends ContactEntity {
  // Nom complet
  fullName: string;

  // Email masqué pour la sécurité
  maskedEmail: string;

  // Statut
  status: 'NEW' | 'READ' | 'RESPONDED';

  // Temps écoulé
  timeAgo: string;

  // Pour l'admin
  respondedByEmail?: string;
  respondedByName?: string;
}

/**
 * Entité pour la création d'un contact (public)
 */
export class CreateContactEntity {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  userId?: string;
}

/**
 * Entité pour la réponse à un contact (admin)
 */
export class RespondContactEntity {
  adminResponse: string;
  respondedBy: string;
  respondedAt: Date;
  isRead: boolean;
}

/**
 * Entité pour la mise à jour d'un contact
 */
export class UpdateContactEntity {
  isRead?: boolean;
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: Date;
}

/**
 * Entité pour les statistiques des contacts
 */
export class ContactStatisticsEntity {
  total: number;
  unread: number;
  responded: number;
  responseRate: number;
  averageResponseTime: number; // en heures
  newMessages: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topSenders: {
    email: string;
    count: number;
  }[];
}

/**
 * Entité pour les filtres de recherche
 */
export class ContactFilterEntity {
  isRead?: boolean;
  isResponded?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  email?: string;
}

/**
 * Entité pour les résultats paginés
 */
export class PaginatedContactEntity {
  data: ContactWithMetaEntity[];
  meta: {
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
