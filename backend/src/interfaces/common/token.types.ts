// =================================
// TYPES TOKENS (Gestion des tokens d'authentification)
// =================================

export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  isRememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionData {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokedTokenData {
  userId: string;
  token: string;
  revokedAt: Date;
  revocationReason: string;
  ipAddress?: string;
  userAgent?: string;
}
