// ============================================================
// useUser.ts
// ------------------------------------------------------------
// Hook de gestion des utilisateurs.
//
// Consomme users.service.ts — ne refait jamais les appels HTTP.
// Expose :
//   — état de chargement / erreur par opération
//   — toutes les actions du UsersController
//   — state local pour la liste paginée et les statistiques
// ============================================================

import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  updateAdminProfile,
  createUser,
  getUsers,
  getStatistics,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
} from "../services/users.service";
import type {
  AppUser,
  AppUserList,
  AppUserStatistics,
  GetUsersParams,
  CreateUserParams,
  UpdateAdminProfileParams,
  UpdateUserParams,
  UpdateUserStatusParams,
} from "../types/user.types";

// ─────────────────────────────────────────────────────────────
// Types internes du hook
// ─────────────────────────────────────────────────────────────

/** État de chargement par opération — granularité fine */
interface LoadingState {
  profile: boolean;
  updateProfile: boolean;
  list: boolean;
  statistics: boolean;
  singleUser: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

/** Valeur exposée par useUser */
export interface UseUserReturn {
  // ── État ─────────────────────────────────────────────────
  /** Profil de l'utilisateur courant (GET /user/profile) */
  profile: AppUser | null;
  /** Liste paginée (GET /admin/users/all) */
  userList: AppUserList | null;
  /** Statistiques (GET /admin/users/statistics) */
  statistics: AppUserStatistics | null;
  /** Utilisateur ciblé par getUserById (GET /admin/user/:id) */
  selectedUser: AppUser | null;
  /** Chargement par opération */
  loading: LoadingState;
  /** Dernière erreur par opération (null si aucune) */
  error: Partial<Record<keyof LoadingState, string | null>>;

  // ── Actions utilisateur ───────────────────────────────────
  /** PATCH /admin/profile — sans email */
  patchAdminProfile(params: UpdateAdminProfileParams): Promise<AppUser | null>;

  // ── Actions admin ─────────────────────────────────────────
  /** GET /admin/users/all */
  fetchUsers(params?: GetUsersParams): Promise<void>;
  /** GET /admin/users/statistics */
  fetchStatistics(): Promise<void>;
  /** GET /admin/user/:id */
  fetchUserById(id: string): Promise<AppUser | null>;
  /** POST /admin/users/create */
  createNewUser(params: CreateUserParams): Promise<AppUser | null>;
  /** PATCH /admin/user/:id */
  patchUser(id: string, params: UpdateUserParams): Promise<AppUser | null>;
  /** PATCH /admin/user/:id/status */
  updateUserStatus(
    id: string,
    params: UpdateUserStatusParams,
  ): Promise<AppUser | null>;
  /** DELETE /admin/user/:id */
  removeUser(id: string): Promise<boolean>;
  /** Vider selectedUser */
  clearSelectedUser(): void;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useUser(): UseUserReturn {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [userList, setUserList] = useState<AppUserList | null>(null);
  const [statistics, setStatistics] = useState<AppUserStatistics | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const [loading, setLoading] = useState<LoadingState>({
    profile: false,
    updateProfile: false,
    list: false,
    statistics: false,
    singleUser: false,
    create: false,
    update: false,
    delete: false,
  });

  const [error, setError] = useState<
    Partial<Record<keyof LoadingState, string | null>>
  >({});

  // ── Helpers ────────────────────────────────────────────────

  function startLoading(key: keyof LoadingState) {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setError((prev) => ({ ...prev, [key]: null }));
  }

  function stopLoading(key: keyof LoadingState) {
    setLoading((prev) => ({ ...prev, [key]: false }));
  }

  function setErr(key: keyof LoadingState, message: string) {
    setError((prev) => ({ ...prev, [key]: message }));
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /admin/profile  (sans email)
  // ─────────────────────────────────────────────────────────
  const patchAdminProfile = useCallback(
    async (params: UpdateAdminProfileParams): Promise<AppUser | null> => {
      startLoading("updateProfile");
      try {
        const updated = await updateAdminProfile(params);
        setProfile(updated);
        toast.success("Profil admin mis à jour avec succès");
        return updated;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erreur mise à jour profil admin";
        setErr("updateProfile", msg);
        toast.error(msg);
        return null;
      } finally {
        stopLoading("updateProfile");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // GET /admin/users/all
  // ─────────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    async (params: GetUsersParams = {}): Promise<void> => {
      startLoading("list");
      try {
        const list = await getUsers(params);
        console.log("[useUser] fetchUsers success:", {
          total: list.total,
          items: list.items.length,
          page: list.page,
          limit: list.limit,
          totalPages: list.totalPages,
        });
        setUserList(list);
      } catch (err) {
        console.error("[useUser] fetchUsers error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Erreur récupération utilisateurs";
        setErr("list", msg);
        toast.error(msg);
      } finally {
        stopLoading("list");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // GET /admin/users/statistics
  // ─────────────────────────────────────────────────────────
  const fetchStatistics = useCallback(async (): Promise<void> => {
    startLoading("statistics");
    try {
      const stats = await getStatistics();
      setStatistics(stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur statistiques";
      setErr("statistics", msg);
      toast.error(msg);
    } finally {
      stopLoading("statistics");
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // GET /admin/user/:id
  // ─────────────────────────────────────────────────────────
  const fetchUserById = useCallback(
    async (id: string): Promise<AppUser | null> => {
      startLoading("singleUser");
      try {
        const user = await getUserById(id);
        setSelectedUser(user);
        return user;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Utilisateur introuvable";
        setErr("singleUser", msg);
        toast.error(msg);
        return null;
      } finally {
        stopLoading("singleUser");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // POST /admin/users/create
  // ─────────────────────────────────────────────────────────
  const createNewUser = useCallback(
    async (params: CreateUserParams): Promise<AppUser | null> => {
      startLoading("create");
      try {
        const created = await createUser(params);
        // Optimistic update : on ajoute l'utilisateur en tête de liste
        setUserList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: [created, ...prev.items],
            total: prev.total + 1,
            totalPages: Math.ceil((prev.total + 1) / prev.limit),
          };
        });
        toast.success("Utilisateur créé avec succès");
        return created;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erreur création utilisateur";
        setErr("create", msg);
        toast.error(msg);
        return null;
      } finally {
        stopLoading("create");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /admin/user/:id
  // ─────────────────────────────────────────────────────────
  const patchUser = useCallback(
    async (id: string, params: UpdateUserParams): Promise<AppUser | null> => {
      startLoading("update");
      try {
        const updated = await updateUser(id, params);
        // Sync dans la liste si présent
        setUserList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((u) => (u.id === id ? updated : u)),
          };
        });
        // Sync dans selectedUser si c'est le même
        setSelectedUser((prev) => (prev?.id === id ? updated : prev));
        toast.success("Utilisateur mis à jour avec succès");
        return updated;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erreur mise à jour utilisateur";
        setErr("update", msg);
        toast.error(msg);
        return null;
      } finally {
        stopLoading("update");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // DELETE /admin/user/:id  — soft delete côté backend
  // ─────────────────────────────────────────────────────────
  const removeUser = useCallback(async (id: string): Promise<boolean> => {
    startLoading("delete");
    try {
      await deleteUser(id);
      // Retrait optimiste de la liste
      setUserList((prev) => {
        if (!prev) return prev;
        const filtered = prev.items.filter((u) => u.id !== id);
        return {
          ...prev,
          items: filtered,
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / prev.limit),
        };
      });
      // Vider selectedUser si c'était lui
      setSelectedUser((prev) => (prev?.id === id ? null : prev));
      toast.success("Utilisateur supprimé avec succès");
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur suppression utilisateur";
      setErr("delete", msg);
      toast.error(msg);
      return false;
    } finally {
      stopLoading("delete");
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // PATCH /admin/user/:id/status
  // ─────────────────────────────────────────────────────────
  const updateUserStatusHook = useCallback(
    async (
      id: string,
      params: UpdateUserStatusParams,
    ): Promise<AppUser | null> => {
      // Protection : empêcher la désactivation des administrateurs
      if (!params.isActive) {
        // Vérifier si l'utilisateur est un admin avant de continuer
        const currentUser =
          userList?.items.find((u) => u.id === id) || selectedUser;
        if (currentUser?.role === "ADMIN") {
          const errorMsg = "Impossible de désactiver un compte administrateur";
          toast.error(errorMsg);
          setErr("update", errorMsg);
          return null;
        }
      }

      startLoading("update");
      try {
        const updated = await updateUserStatus(id, params);

        // Mettre à jour l'utilisateur dans la liste
        setUserList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((user) => (user.id === id ? updated : user)),
          };
        });

        // Mettre à jour selectedUser si c'était lui
        setSelectedUser((prev) => (prev?.id === id ? updated : prev));

        toast.success(
          params.isActive
            ? "Utilisateur activé avec succès"
            : "Utilisateur désactivé avec succès",
        );
        return updated;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erreur mise à jour statut";
        setErr("update", msg);
        toast.error(msg);
        return null;
      } finally {
        stopLoading("update");
      }
    },
    [userList, selectedUser],
  );

  // ─────────────────────────────────────────────────────────
  const clearSelectedUser = useCallback(() => setSelectedUser(null), []);

  return {
    profile,
    userList,
    statistics,
    selectedUser,
    loading,
    error,
    patchAdminProfile,
    fetchUsers,
    fetchStatistics,
    fetchUserById,
    createNewUser,
    patchUser,
    updateUserStatus: updateUserStatusHook,
    removeUser,
    clearSelectedUser,
  };
}
