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
import { toast } from "react-hot-toast";
import type {
  // DTOs backend (réponses brutes)
  BackendDTO_ApiResponse,
  BackendDTO_UserResponse,
  BackendDTO_UsersListResponse,
  BackendDTO_UserStatistics,
  BackendDTO_CreateUserBody,
  BackendDTO_UpdateUserBody,
  BackendDTO_AdminUpdateUserBody,
  // Types applicatifs
  AppUser,
  AppUserList,
  AppUserStatistics,
  // Params d'appel
  GetUsersParams,
  CreateUserParams,
  UpdateProfileParams,
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
      "[users.service] Error:",
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
 * PATCH /user/profile
 * Met à jour le profil de l'utilisateur connecté.
 * Correspond à UpdateProfileDto backend - TOUS les champs y compris email et password.
 */
export async function updateUserProfile(
  params: UpdateProfileParams,
): Promise<AppUser> {
  const body: BackendDTO_UpdateUserBody = {
    ...(params.firstName !== undefined && { firstName: params.firstName }),
    ...(params.lastName !== undefined && { lastName: params.lastName }),
    ...(params.email !== undefined && { email: params.email }),
    ...(params.telephone !== undefined && { telephone: params.telephone }),
    ...(params.password !== undefined && { password: params.password }),
  };

  try {
    const response = await apiFetch(`${API_URL}/user/profile`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    const user = mapUserResponseToAppUser(dto);

    // Toast de succès
    toast.success("Profil mis à jour avec succès", {
      duration: 4000,
    });

    return user;
  } catch (error) {
    console.error('[updateUserProfile] Erreur:', {
      error,
      status: (error as { status?: number })?.status,
      message: (error as { message?: string })?.message,
      body,
    });

    // Toast d'erreur
    toast.error("Erreur lors de la mise à jour du profil", {
      duration: 4000,
    });
    throw error;
  }
}

/**
 * PATCH /admin/profile   [ADMIN]
 * Met à jour le profil de l'admin connecté.
 * N'accepte pas l'email pour des raisons de sécurité.
 */
export async function updateAdminProfile(
  params: UpdateProfileParams,
): Promise<AppUser> {
  // Créer le corps avec seulement les champs autorisés pour l'admin
  const body: BackendDTO_AdminUpdateUserBody = {
    ...(params.firstName !== undefined && { firstName: params.firstName }),
    ...(params.lastName !== undefined && { lastName: params.lastName }),
    ...(params.telephone !== undefined && { telephone: params.telephone }),
    ...(params.password !== undefined && { password: params.password }),
  };

  try {
    const response = await apiFetch(`${API_URL}/admin/profile`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    const user = mapUserResponseToAppUser(dto);

    // Toast de succès
    toast.success("Profil admin mis à jour avec succès", {
      duration: 4000,
    });

    return user;
  } catch (error) {
    console.error("Erreur updateAdminProfile:", error);
    throw error;
  }
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

  try {
    const response = await apiFetch(`${API_URL}/admin/users/create`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    const user = mapUserResponseToAppUser(dto);

    // Toast de succès
    toast.success(
      `Utilisateur ${user.firstName} ${user.lastName} créé avec succès`,
      {
        duration: 4000,
      },
    );

    return user;
  } catch (error) {
    // Toast d'erreur
    toast.error("Erreur lors de la création de l'utilisateur", {
      duration: 4000,
    });
    throw error;
  }
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
  try {
    const response = await apiFetch(`${API_URL}/admin/users/statistics`, {
      method: "GET",
    });

    // Le backend retourne la structure directement dans body.data
    const dto = await parseResponse<BackendDTO_UserStatistics>(response);

    // Pas de transformation nécessaire : les noms de champs sont identiques
    return {
      totalUsers: dto.totalUsers,
      activeUsers: dto.activeUsers,
      inactiveUsers: dto.inactiveUsers,
      adminUsers: dto.adminUsers,
      userUsers: dto.userUsers,
      recentlyCreated: dto.recentlyCreated,
      recentlyActive: dto.recentlyActive,
    };
  } catch (error) {
    toast.error("Erreur lors du chargement des statistiques");
    throw error;
  }
}

/**
 * GET /admin/user/:id   [ADMIN]
 * Récupère un utilisateur par son ID.
 */
export async function getUserById(id: string): Promise<AppUser> {
  try {
    const response = await apiFetch(
      `${API_URL}/admin/user/${encodeURIComponent(id)}`,
      {
        method: "GET",
      },
    );

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    return mapUserResponseToAppUser(dto);
  } catch (error) {
    toast.error("Erreur lors du chargement de l'utilisateur");
    throw error;
  }
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

  try {
    const response = await apiFetch(
      `${API_URL}/admin/user/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    const user = mapUserResponseToAppUser(dto);

    // Toast de succès
    toast.success(
      `Utilisateur ${user.firstName} ${user.lastName} mis à jour avec succès`,
      {
        duration: 4000,
      },
    );

    return user;
  } catch (error) {
    // Toast d'erreur
    toast.error("Erreur lors de la mise à jour de l'utilisateur", {
      duration: 4000,
    });
    throw error;
  }
}

/**
 * DELETE /admin/user/:id   [ADMIN]
 * Supprime (soft delete) un utilisateur.
 * Le backend renvoie HTTP 204 No Content → pas de body à parser.
 * Interdit de supprimer son propre compte (ForbiddenException backend).
 */
export async function deleteUser(id: string): Promise<void> {
  try {
    const response = await apiFetch(
      `${API_URL}/admin/user/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );

    // 204 No Content — on ne parse pas le body
    if (!response.ok) {
      // Cas d'erreur (403, 404) : on lit le body pour le message
      const body: BackendDTO_ApiResponse<never> = await response.json();
      throw new Error(body.message || `Erreur HTTP ${response.status}`);
    }

    // Toast de succès
    toast.success("Utilisateur supprimé avec succès", {
      duration: 4000,
    });
  } catch (error) {
    // Toast d'erreur
    toast.error("Erreur lors de la suppression de l'utilisateur", {
      duration: 4000,
    });
    throw error;
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
  // Protection : empêcher la désactivation si isActive est false
  if (!params.isActive) {
    // Récupérer d'abord l'utilisateur pour vérifier si c'est un admin
    try {
      const userResponse = await apiFetch(
        `${API_URL}/admin/user/${encodeURIComponent(id)}`,
        { method: "GET" },
      );

      if (userResponse.ok) {
        const userDto: BackendDTO_UserResponse = await userResponse.json();
        if (userDto.role === "ADMIN") {
          const error = new Error(
            "Impossible de désactiver un compte administrateur",
          );
          toast.error(error.message, { duration: 4000 });
          throw error;
        }
      }
    } catch (error) {
      // Si erreur de récupération, laisser le backend gérer la protection
      if (error instanceof Error && error.message.includes("administrateur")) {
        throw error;
      }
    }
  }

  const body = {
    isActive: params.isActive,
    ...(params.logoutUntil && { logoutUntil: params.logoutUntil }),
    ...(params.reason && { reason: params.reason }),
  };

  try {
    const response = await apiFetch(
      `${API_URL}/admin/user/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    const dto = await parseResponse<BackendDTO_UserResponse>(response);
    const user = mapUserResponseToAppUser(dto);

    // Toast de succès
    const action = params.isActive ? "activé" : "désactivé";
    toast.success(
      `Utilisateur ${user.firstName} ${user.lastName} ${action} avec succès`,
      {
        duration: 4000,
      },
    );

    return user;
  } catch (error) {
    // Toast d'erreur
    const action = params.isActive ? "l'activation" : "la désactivation";
    toast.error(`Erreur lors de ${action} de l'utilisateur`, {
      duration: 4000,
    });
    throw error;
  }
}
