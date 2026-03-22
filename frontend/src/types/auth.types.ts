// ============================================================
// auth.types.ts
// ------------------------------------------------------------
// § 1 — BackendDTO_*  : forme exacte des réponses HTTP
// § 2 — AppUser       : état exploité côté frontend
// § 3 — AuthContextType
// ============================================================

// ─────────────────────────────────────────────────────────────
// § 1 — BACKEND DTOs
// ─────────────────────────────────────────────────────────────

/** Enveloppe générique de TOUTES les réponses du backend */
export interface BackendDTO_ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** POST /auth/register */
export interface BackendDTO_RegisterData {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    telephone: string;
    role: "USER" | "ADMIN";
    isActive: boolean;
  };
}

/** POST /auth/login */
export interface BackendDTO_LoginData {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number; // secondes — 900 (15 min) ou 2592000 (30 jours si rememberMe)
  remember_me: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    telephone: string;
    role: "USER" | "ADMIN";
    isActive: boolean;
    canLogin: boolean;
    isTemporarilyLoggedOut: boolean;
    logoutUntil: string | null;
    lastLogin: string | null;
    loginCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

/** POST /auth/refresh → { message: "Tokens rafraîchis" } */
export interface BackendDTO_RefreshData {
  message: string;
}

/** POST /admin/auth/logout-all */
export interface BackendDTO_LogoutAllData {
  message: string;
  sessionsTerminated: number;
}

/** POST /auth/forgot-password */
export interface BackendDTO_ForgotPasswordData {
  message: string;
}

/** POST /auth/reset-password */
export interface BackendDTO_ResetPasswordData {
  message: string;
}

/** POST /auth/change-password */
export interface BackendDTO_ChangePasswordData {
  message: string;
}

/** GET | PATCH /user/profile */
export interface BackendDTO_ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  telephone: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  canLogin: boolean;
  isTemporarilyLoggedOut: boolean;
  logoutUntil: string | null;
  lastLogout: string | null;
  lastLogin: string | null;
  loginCount: number;
  logoutCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// § 2 — TYPES APPLICATIFS
// ─────────────────────────────────────────────────────────────

/**
 * Utilisateur stocké dans le state React.
 * Construit via mappers — jamais directement depuis un DTO.
 */
export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  telephone: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  canLogin: boolean;
  isTemporarilyLoggedOut: boolean;
  logoutUntil: string | null;
  lastLogout: string | null;
  lastLogin: string | null;
  loginCount: number;
  logoutCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// § 3 — AuthContextType
// ─────────────────────────────────────────────────────────────

export interface AuthContextType {
  user: AppUser | null;
  /** true pendant le checkAuth initial */
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login(email: string, password: string, rememberMe?: boolean): Promise<void>;
  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    telephone: string;
  }): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  refreshToken(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  updateUser(patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
    telephone?: string;
    password?: string;
  }): Promise<void>;
  /**
   * PATCH /admin/profile
   * Champs autorisés : firstName, lastName, password uniquement.
   * Email et téléphone protégés — jamais envoyés au backend.
   */
  updateAdminProfile(params: {
    firstName?: string;
    lastName?: string;
    password?: string;
  }): Promise<void>;
  refreshUserProfile(): Promise<void>;
  getActiveSessions(): Promise<number>;
}
