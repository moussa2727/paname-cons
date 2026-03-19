// types/message.types.ts
// Basé strictement sur les DTOs et entités du backend
// Les emails sont affichés en clair (non masqués)

// ─── DTO Réponse (contact-response.dto.ts) ───────────────────────────────────

export interface ContactResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string; // "Jean Dupont" | "Anonyme"
  email: string; // ✅ Email en clair (non masqué)
  message: string;
  isRead: boolean;
  adminResponse: string | null;
  respondedAt: Date | null;
  respondedBy: string | null; // userId de l'admin
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
}

export interface ContactListResponse {
  data: ContactResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

// ─── DTO Création (create-contact.dto.ts) ────────────────────────────────────

export interface CreateContactDto {
  firstName?: string; // optionnel, min 2, max 50
  lastName?: string; // optionnel, min 2, max 50
  email: string; // requis, format email valide
  message: string; // requis, min 10, max 2000
}

// ─── DTO Réponse admin (respond-contact.dto.ts) ──────────────────────────────

export interface RespondContactDto {
  response: string; // requis, min 10, max 2000
  markAsRead?: boolean; // optionnel, default true
}

// ─── DTO Query (contact-query.dto.ts) ────────────────────────────────────────

export type ContactSortField = "createdAt" | "email" | "firstName" | "lastName";
export type SortOrder = "asc" | "desc";

export interface ContactQueryDto {
  page?: number; // default 1, min 1
  limit?: number; // default 10, min 1
  isRead?: boolean; // filtre lu / non lu
  isReplied?: boolean; // ✅ filtre répondu / non répondu
  email?: string; // filtre exact email
  search?: string; // recherche textuelle
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  sortBy?: ContactSortField; // default 'createdAt'
  sortOrder?: SortOrder; // default 'desc'
  showDeleted?: boolean; // ✅ afficher les messages supprimés
}

// ─── Statistiques ────────────────────────────────────────────────────────────

export interface ContactStatistics {
  total: number;
  unread: number;
  responded: number;
  pending: number;
  responseRate: number;
  today: number; // ✅ Messages aujourd'hui
  thisWeek: number; // ✅ Messages cette semaine
  thisMonth: number; // ✅ Messages ce mois
}

// ─── Réponse compteur non lus ────────────────────────────────────────────────

export interface UnreadCountResponse {
  count: number;
}

// ─── Entité Contact (contact.entity.ts) ──────────────────────────────────────

export interface ContactEntity {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string; // ✅ Email en clair
  message: string;
  isRead: boolean;
  adminResponse: string | null;
  respondedAt: Date | null;
  respondedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
}

// ✅ Version enrichie avec email en clair
export interface ContactWithMetaEntity extends ContactEntity {
  fullName: string;
  email: string; // ✅ Email en clair (pas de version masquée)
  status: ContactStatus;
  timeAgo: string;
  respondedByEmail?: string;
  respondedByName?: string;
}

export type ContactStatus = "NEW" | "READ" | "RESPONDED";

// ─── Résultats paginés enrichis ──────────────────────────────────────────────

export interface PaginatedContactEntity {
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

// ─── Entité Audit (contact-audit.entity.ts) ──────────────────────────────────

export type ContactAuditAction = "CREATE" | "READ" | "RESPOND" | "DELETE";
export type ContactAuditRole = "ADMIN" | "USER" | "SYSTEM";

export interface ContactAuditEntity {
  id: string;
  contactId: string;
  action: ContactAuditAction;
  performedBy: string; // userId
  performedByRole: ContactAuditRole;
  oldData: Partial<ContactEntity> | null;
  newData: Partial<ContactEntity> | null;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface ContactResponseHistoryEntity {
  contactId: string;
  originalMessage: {
    content: string;
    sentAt: Date;
    sender: {
      name: string;
      email: string; // ✅ Email en clair
    };
  };
  responses: {
    content: string;
    respondedAt: Date;
    respondedBy: {
      id: string;
      name: string;
      email: string; // ✅ Email en clair
    };
  }[];
}

// ─── Erreurs API ─────────────────────────────────────────────────────────────

export interface ApiErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiError {
  message: string;
  errors?: ApiErrorDetail[];
  statusCode?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  errors?: ApiErrorDetail[];
}

// ─── Types pour les filtres du hook useMessages ──────────────────────────────

export interface MessagesFilters {
  search: string;
  isRead?: boolean;
  isReplied?: boolean;
  showDeleted: boolean;
  sortBy: ContactSortField;
  sortOrder: SortOrder;
  startDate?: string;
  endDate?: string;
}

export interface MessagesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Type pour le callback de réponse ────────────────────────────────────────

export type RespondCallback = (id: string, response: string) => Promise<void>;
