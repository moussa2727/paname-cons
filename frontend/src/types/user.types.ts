// ============================================================
// users.types.ts
// ------------------------------------------------------------
// § 1 — BackendDTO_Users_*  : forme exacte des réponses HTTP
//                             du UsersController backend
// § 2 — AppUserList         : état exploité côté frontend
// § 3 — UsersServiceParams  : paramètres d'appel du service
// ============================================================

import type { BackendDTO_ApiResponse } from "./auth.types";

// Ré-export pour usage unifié dans toute la feature users
export type { BackendDTO_ApiResponse };

// ─────────────────────────────────────────────────────────────
// § 1 — BACKEND DTOs  (ne jamais modifier côté front)
// ─────────────────────────────────────────────────────────────

/**
 * UserResponseDto — renvoyé par :
 *   GET  /user/profile
 *   GET  /admin/user/:id
 *   POST /admin/users/create
 *   PATCH /user/profile
 *   PATCH /admin/profile
 *   PATCH /admin/user/:id
 *
 * Correspond exactement à UserResponseDto du backend (users.service.ts → toResponseDto).
 */
export interface BackendDTO_UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  telephone: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  canLogin: boolean;
  isTemporarilyLoggedOut: boolean;
  /** ISO string ou null */
  logoutUntil: string | null;
  /** ISO string ou null */
  lastLogout: string | null;
  /** ISO string ou null */
  lastLogin: string | null;
  loginCount: number;
  logoutCount: number;
  /** ISO string */
  createdAt: string;
  /** ISO string */
  updatedAt: string;
}

/**
 * UsersListResponseDto — renvoyé par GET /admin/users/all
 * Correspond à UsersListResponseDto du backend.
 */
export interface BackendDTO_UsersListResponse {
  data: BackendDTO_UserResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Statistiques — renvoyées par GET /admin/users/statistics
 */
export interface BackendDTO_UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  userUsers: number;
  recentlyCreated: number;
  recentlyActive: number;
}

/**
 * Corps POST /admin/users/create — correspond à CreateUserDto backend
 */
export interface BackendDTO_CreateUserBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone: string;
}

/**
 * Corps PATCH /user/profile — correspond à UpdateUserDto backend
 * Tous les champs sont optionnels.
 */
export interface BackendDTO_UpdateUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
  password?: string;
}

/**
 * Corps PATCH /admin/profile — correspond à UpdateProfileDto backend.
 * Email ET téléphone sont VOLONTAIREMENT absents : un admin ne peut
 * modifier que son prénom, son nom et son mot de passe.
 */
export interface BackendDTO_AdminUpdateProfileBody {
  firstName?: string;
  lastName?: string;
  password?: string;
}

/**
 * Corps PATCH /admin/user/:id — correspond à UpdateUserDto backend
 */
export type BackendDTO_AdminUpdateUserBody = BackendDTO_UpdateUserBody;

// ─────────────────────────────────────────────────────────────
// § 2 — TYPES APPLICATIFS
//       Construits via mappers depuis les DTOs.
// ─────────────────────────────────────────────────────────────

/**
 * Représentation frontend d'un utilisateur.
 * Identique à AppUser (auth.types.ts) — importé directement
 * pour éviter la duplication.
 */
export type { AppUser } from "./auth.types";

/**
 * Liste paginée d'utilisateurs — état exploité côté frontend.
 */
export interface AppUserList {
  items: import("./auth.types").AppUser[];
  total: number;
  page: number;
  limit: number;
  /** Nombre total de pages calculé côté front */
  totalPages: number;
}

/**
 * Statistiques utilisateurs — état exploité côté frontend.
 * Mêmes champs que le DTO (pas de transformation nécessaire).
 */
export interface AppUserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  userUsers: number;
  recentlyCreated: number;
  recentlyActive: number;
}

// ─────────────────────────────────────────────────────────────
// § 3 — PARAMÈTRES D'APPEL DU SERVICE FRONTEND
// ─────────────────────────────────────────────────────────────

/** Paramètres de GET /admin/users/all */
export interface GetUsersParams {
  page?: number;
  limit?: number;
}

/** Données pour créer un utilisateur via le service frontend */
export interface CreateUserParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone: string;
}

/**
 * Données pour mettre à jour son propre profil (utilisateur).
 * L'email est autorisé ici (UpdateUserDto backend l'accepte).
 */
export interface UpdateProfileParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
  password?: string;
}

/**
 * Données pour mettre à jour le profil admin.
 * Email et téléphone absents — UpdateProfileDto backend ne les expose pas.
 */
export interface UpdateAdminProfileParams {
  firstName?: string;
  lastName?: string;
  password?: string;
}

/** Données pour mettre à jour un utilisateur quelconque (admin) */
export interface UpdateUserParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
  password?: string;
}

/** Données pour mettre à jour le statut d'un utilisateur (admin) */
export interface UpdateUserStatusParams {
  isActive: boolean;
  logoutUntil?: string;
  reason?: string;
}
