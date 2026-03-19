/**
 * Entité pour une session utilisateur
 */
export class UserSessionEntity {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  lastActivity: Date;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entité pour les sessions actives d'un utilisateur
 */
export class UserActiveSessionsEntity {
  userId: string;
  total: number;
  maxAllowed: number;
  sessions: UserSessionEntity[];
  canCreateNewSession: boolean;
}

/**
 * Entité pour l'historique de connexion
 */
export class UserLoginHistoryEntity {
  id: string;
  userId: string;
  loginAt: Date;
  logoutAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  location: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  } | null;
  duration: number | null; // en minutes
  successful: boolean;
  failureReason?: string;
}
