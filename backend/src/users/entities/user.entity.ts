import {
  UserRole,
  Session,
  Procedure,
  Rendezvous,
  Contact,
} from '@prisma/client';

/**
 * Entité de base User (correspond au modèle Prisma)
 */
export class UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  telephone: string;
  role: UserRole;
  isActive: boolean;
  logoutUntil: Date | null;
  lastLogout: Date | null;
  logoutReason: string | null;
  logoutTransaction: string | null;
  logoutCount: number;
  lastLogin: Date | null;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations optionnelles (sans données sensibles)
  sessions?: Session[];
  procedures?: Procedure[];
  rendezvous?: Rendezvous[];
  contacts?: Contact[];
}

/**
 * Entité User sans mot de passe (pour réponses API)
 */
export class UserSafeEntity extends UserEntity {
  // Propriétés calculées
  fullName: string;
  canLogin: boolean;
  isTemporarilyLoggedOut: boolean;
  activeSessions: number;
}

/**
 * Entité User avec mot de passe (pour validation interne)
 */
export class UserWithPasswordEntity extends UserEntity {
  password: string;
}

/**
 * Entité pour la création d'un utilisateur
 */
export class CreateUserEntity {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  telephone: string;
  role?: UserRole;
}

/**
 * Entité pour la mise à jour d'un utilisateur
 */
export class UpdateUserEntity {
  email?: string;
  firstName?: string;
  lastName?: string;
  telephone?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  logoutUntil?: Date | null;
  logoutReason?: string;
}

/**
 * Entité pour le changement de mot de passe
 */
export class ChangePasswordEntity {
  userId: string;
  oldPassword: string;
  newPassword: string;
  confirmedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Entité pour les statistiques des utilisateurs
 */
export class UserStatisticsEntity {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    [key in UserRole]?: number;
  };
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  loginStats: {
    averageLoginsPerUser: number;
    usersLoggedInToday: number;
    usersLoggedInThisWeek: number;
  };
  topUsers: {
    id: string;
    fullName: string;
    email: string;
    loginCount: number;
    procedureCount: number;
    rendezvousCount: number;
  }[];
}

/**
 * Entité pour les préférences utilisateur
 */
export class UserPreferencesEntity {
  userId: string;
  language: 'fr' | 'en';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  dashboardLayout?: Record<string, any>;
  updatedAt: Date;
}
