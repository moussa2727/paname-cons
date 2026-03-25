// ============================================================
// users.service.ts
// ------------------------------------------------------------
// Service frontend pour toutes les routes du UsersController.
//
// Routes couvertes :
//   POST  /admin/users/create          → createUser()
//   GET   /admin/users/all             → getUsers()
//   GET   /admin/users/statistics      → getStatistics()
//   GET   /admin/user/:id              → getUserById()
//   PATCH /admin/profile               → updateAdminProfile()
//   PATCH /admin/user/:id              → updateUser()
//   DELETE /admin/user/:id             → deleteUser()
//
// Toutes les requêtes authentifiées passent par apiFetch
// (retry 401 → refresh automatique).
// ============================================================

import { apiFetch } from "../context/AuthContext";
import type {
  // DTOs backend (réponses brutes)
  BackendDTO_ApiResponse,
  BackendDTO_UserResponse,
  BackendDTO_UsersListResponse,
  BackendDTO_UserStatistics,
  BackendDTO_CreateUserBody,
  BackendDTO_AdminUpdateProfileBody,
  BackendDTO_AdminUpdateUserBody,
  // Types applicatifs
  AppUser,
  AppUserList,
  AppUserStatistics,
  // Params d'appel
  GetUsersParams,
  CreateUserParams,
  UpdateAdminProfileParams,
  UpdateUserParams,
  UpdateUserStatusParams,
} from "../types/user.types";

const API_URL = import.meta.env.VITE_API_URL as string;

// ─────────────────────────────────────────────────────────────
// Mapper DTO → AppUser
// Centralise la transformation : les composants React
// ne manipulent jamais BackendDTO_UserResponse directement.
// ─────────────────────────────────────────────────────────────

function mapUserResponseToAppUser(dto: BackendDTO_UserResponse): AppUser {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: dto.fullName,
    telephone: dto.telephone,
    role: dto.role,
    isActive: dto.isActive,
    canLogin: dto.canLogin,
    isTemporarilyLoggedOut: dto.isTemporarilyLoggedOut,
    logoutUntil: dto.logoutUntil,
    lastLogout: dto.lastLogout,
    lastLogin: dto.lastLogin,
    loginCount: dto.loginCount,
    logoutCount: dto.logoutCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers de parsing des réponses
// ─────────────────────────────────────────────────────────────

/**
 * Parse la réponse et lance une erreur si elle n'est pas OK.
 * Retourne body.data typé.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const body: BackendDTO_ApiResponse<T> = await response.json();

  if (!response.ok) {
    console.error(
      "Error:",
      body.message || `HTTP ${response.status}`,
    );
    throw new Error(body.message || `Erreur HTTP ${response.status}`);
  }
  return body.data;
}

// ─────────────────────────────────────────────────────────────
// Service — fonctions exportées
// ─────────────────────────────────────────────────────────────

/**
 * GET /user/profile
 * Récupère le profil de l'utilisateur connecté.
 * Utilisé au mount (checkAuth) et lors d'un rafraîchissement explicite.
/**
 * PATCH /admin/profile
 * Met à jour le profil de l'admin connecté.
 * Seuls firstName, lastName et password sont envoyés —
 * email et téléphone sont protégés côté backend (UpdateProfileDto).
 */
export async function updateAdminProfile(
  params: UpdateAdminProfileParams,
): Promise<AppUser> {
  const body: BackendDTO_AdminUpdateProfileBody = {
    ...(params.firstName !== undefined && { firstName: params.firstName }),
    ...(params.lastName !== undefined && { lastName: params.lastName }),
    ...(params.password !== undefined && { password: params.password }),
  };

  const response = await apiFetch(`${API_URL}/admin/profile`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  const dto = await parseResponse<BackendDTO_UserResponse>(response);
  return mapUserResponseToAppUser(dto);
}

/**
 * POST /admin/users/create   [ADMIN]
 * Crée un nouvel utilisateur.
 * Correspond à CreateUserDto backend (tous les champs requis).
 */
export async function createUser(params: CreateUserParams): Promise<AppUser> {
  const body: BackendDTO_CreateUserBody = {
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    password: params.password,
    telephone: params.telephone,
  };

  const response = await apiFetch(`${API_URL}/admin/users/create`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const dto = await parseResponse<BackendDTO_UserResponse>(response);
  return mapUserResponseToAppUser(dto);
}

/**
 * GET /admin/users/all   [ADMIN]
 * Retourne la liste paginée des utilisateurs.
 * Le backend retourne directement la structure sans enveloppe ApiResponse.
 */
export async function getUsers(
  params: GetUsersParams = {},
): Promise<AppUserList> {
  const { page = 1, limit = 10 } = params;

  const url = new URL(`${API_URL}/admin/users/all`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await apiFetch(url, { method: "GET" });

  // Pour cette route spécifique, le backend retourne directement la structure
  // sans enveloppe ApiResponse, donc on parse directement
  const listDto: BackendDTO_UsersListResponse = await response.json();

  const result = {
    items: listDto.data.map(mapUserResponseToAppUser),
    total: listDto.total,
    page: listDto.page,
    limit: listDto.limit,
    totalPages: Math.ceil(listDto.total / listDto.limit),
  };

  return result;
}

/**
 * GET /admin/users/statistics   [ADMIN]
 * Statistiques globales sur les utilisateurs.
 * Correspond à la forme retournée par getStatistics() backend.
 */
export async function getStatistics(): Promise<AppUserStatistics> {
  const response = await apiFetch(`${API_URL}/admin/users/statistics`, {
    method: "GET",
  });

  const dto = await parseResponse<BackendDTO_UserStatistics>(response);
  return {
    totalUsers: dto.totalUsers,
    activeUsers: dto.activeUsers,
    inactiveUsers: dto.inactiveUsers,
    adminUsers: dto.adminUsers,
    userUsers: dto.userUsers,
    recentlyCreated: dto.recentlyCreated,
    recentlyActive: dto.recentlyActive,
  };
}

/**
 * GET /admin/user/:id   [ADMIN]
 * Récupère un utilisateur par son ID.
 */
export async function getUserById(id: string): Promise<AppUser> {
  const response = await apiFetch(
    `${API_URL}/admin/user/${encodeURIComponent(id)}`,
    { method: "GET" },
  );

  const dto = await parseResponse<BackendDTO_UserResponse>(response);
  return mapUserResponseToAppUser(dto);
}

/**
 * PATCH /admin/user/:id   [ADMIN]
 * Met à jour un utilisateur quelconque.
 * Correspond à UpdateUserDto backend (tous les champs optionnels).
 */
export async function updateUser(
  id: string,
  params: UpdateUserParams,
): Promise<AppUser> {
  const body: BackendDTO_AdminUpdateUserBody = {
    ...(params.firstName !== undefined && { firstName: params.firstName }),
    ...(params.lastName !== undefined && { lastName: params.lastName }),
    ...(params.email !== undefined && { email: params.email }),
    ...(params.telephone !== undefined && { telephone: params.telephone }),
    ...(params.password !== undefined && { password: params.password }),
  };

  const response = await apiFetch(
    `${API_URL}/admin/user/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  const dto = await parseResponse<BackendDTO_UserResponse>(response);
  return mapUserResponseToAppUser(dto);
}

/**
 * DELETE /admin/user/:id   [ADMIN]
 * Supprime (soft delete) un utilisateur.
 * Le backend renvoie HTTP 204 No Content → pas de body à parser.
 * Interdit de supprimer son propre compte (ForbiddenException backend).
 */
export async function deleteUser(id: string): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/admin/user/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  // 204 No Content — on ne parse pas le body
  if (!response.ok) {
    const body: BackendDTO_ApiResponse<never> = await response.json();
    throw new Error(body.message || `Erreur HTTP ${response.status}`);
  }
}

/**
 * PATCH /admin/user/:id/status   [ADMIN]
 * Active ou désactive un utilisateur.
 */
export async function updateUserStatus(
  id: string,
  params: UpdateUserStatusParams,
): Promise<AppUser> {
  const body = {
    isActive: params.isActive,
    ...(params.logoutUntil && { logoutUntil: params.logoutUntil }),
    ...(params.reason && { reason: params.reason }),
  };

  const response = await apiFetch(
    `${API_URL}/admin/user/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  const dto = await parseResponse<BackendDTO_UserResponse>(response);
  return mapUserResponseToAppUser(dto);
}
