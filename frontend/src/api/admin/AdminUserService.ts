import { useAuth } from '../../context/AuthContext';

// ===== INTERFACES (Alignées avec backend) =====
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logoutUntil?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  role: 'admin' | 'user'; // Note: Backend forcera USER pour tous les créations API
}

export interface UpdateUserDto {
  email?: string;
  telephone?: string;
}

export interface AdminResetPasswordDto {
  newPassword: string;
  confirmNewPassword: string;
}

// ===== HOOK PERSONNALISÉ =====
export const useAdminUserService = () => {
  const { fetchWithAuth, user, isAuthenticated } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  // Fonction utilitaire pour vérifier les droits admin
  const isUserAdmin = (currentUser: any): boolean => {
    return currentUser?.role === 'admin';
  };

  // Fonction de requête admin sécurisée
  const secureAdminFetch = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    if (!isAuthenticated || !isUserAdmin(user)) {
      throw new Error('Accès refusé : droits administrateur requis');
    }

    try {
      const response = await fetchWithAuth(endpoint, options);

      if (response.status === 401) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      if (response.status === 403) {
        throw new Error('Accès refusé : droits administrateur requis');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Erreur ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      throw err;
    }
  };

  // === MÉTHODES ADMIN UNIQUEMENT ===

  //  Récupérer tous les utilisateurs
  const getAllUsers = async (): Promise<User[]> => {
    try {
      const response = await secureAdminFetch('/api/users', {
        method: 'GET',
      });

      // Backend retourne directement un tableau d'utilisateurs
      return response as User[];
    } catch (err: any) {
      if (err.message.includes('permissions administrateur')) {
        throw new Error("Vous n'avez pas les permissions administrateur");
      }
      throw err;
    }
  };

  //  Obtenir les statistiques utilisateurs
  const getUserStats = async (): Promise<UserStats> => {
    try {
      const stats = await secureAdminFetch('/api/users/stats', {
        method: 'GET',
      });

      return stats as UserStats;
    } catch (err: any) {
      throw new Error(
        err.message || 'Erreur lors de la récupération des statistiques'
      );
    }
  };

  //  Créer un utilisateur (sera toujours USER sauf si email=EMAIL_USER et premier admin)
  const createUser = async (userData: CreateUserDto): Promise<User> => {
    try {
      const result = await secureAdminFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      // Backend retourne directement l'utilisateur créé avec id
      return result as User;
    } catch (err: any) {
      if (err.message.includes('email est déjà utilisé')) {
        throw new Error('Cet email est déjà utilisé');
      }
      if (err.message.includes('téléphone est déjà utilisé')) {
        throw new Error('Ce numéro de téléphone est déjà utilisé');
      }
      if (err.message.includes('mot de passe doit contenir au moins 8 caractères')) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      throw new Error(err.message || "Erreur lors de la création de l'utilisateur");
    }
  };

  //  Mettre à jour un utilisateur
  const updateUser = async (userId: string, userData: UpdateUserDto): Promise<User> => {
    try {
      const result = await secureAdminFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });

      // Backend retourne { id, email, firstName, lastName, role, telephone, isActive }
      return result as User;
    } catch (err: any) {
      if (err.message.includes('email est déjà utilisé')) {
        throw new Error('Cet email est déjà utilisé');
      }
      if (err.message.includes('téléphone est déjà utilisé')) {
        throw new Error('Ce numéro de téléphone est déjà utilisé');
      }
      if (err.message.includes('email est réservé')) {
        throw new Error("Cet email est réservé à l'administrateur principal");
      }
      throw new Error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  //  Réinitialiser le mot de passe d'un utilisateur (admin)
  const adminResetPassword = async (
    userId: string,
    passwordData: AdminResetPasswordDto
  ): Promise<void> => {
    try {
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      await secureAdminFetch(`/api/users/${userId}/admin-reset-password`, {
        method: 'PATCH',
        body: JSON.stringify(passwordData),
      });

      // Backend retourne { message: "Mot de passe réinitialisé avec succès" }
    } catch (err: any) {
      if (err.message.includes('administrateur principal')) {
        throw new Error("Seul l'administrateur principal peut réinitialiser son mot de passe");
      }
      if (err.message.includes('ne correspondent pas')) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      if (err.message.includes('au moins 8 caractères')) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      throw new Error(
        err.message || 'Erreur lors de la réinitialisation du mot de passe'
      );
    }
  };

  //  Supprimer un utilisateur
  const deleteUser = async (userId: string): Promise<void> => {
    try {
      await secureAdminFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      // Backend retourne 204 No Content
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('non trouvé')) {
        throw new Error('Utilisateur non trouvé');
      }
      if (err.message.includes('administrateur unique')) {
        throw new Error("Impossible de supprimer l'administrateur unique du système");
      }
      throw new Error(err.message || 'Erreur lors de la suppression');
    }
  };

  //  Activer/désactiver un utilisateur
  const toggleUserStatus = async (userId: string): Promise<User> => {
    try {
      const result = await secureAdminFetch(`/api/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });

      // Backend retourne directement l'utilisateur mis à jour
      return result as User;
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('non trouvé')) {
        throw new Error('Utilisateur non trouvé');
      }
      if (err.message.includes('administrateur unique')) {
        throw new Error("Impossible de désactiver l'administrateur unique du système");
      }
      throw new Error(
        err.message || 'Erreur lors du changement de statut'
      );
    }
  };

  //  Vérifier l'accès d'un utilisateur
  const checkUserAccess = async (userId: string): Promise<{
    canAccess: boolean;
    reason?: string;
    user?: any;
    details?: any;
  }> => {
    try {
      const accessCheck = await secureAdminFetch(`/api/users/check-access/${userId}`, {
        method: 'GET',
      });

      return accessCheck;
    } catch (err: any) {
      throw new Error(err.message || 'Erreur vérification accès');
    }
  };

  //  Gestion du mode maintenance
  const getMaintenanceStatus = async (): Promise<{
    isActive: boolean;
    enabledAt: string | null;
    message: string;
  }> => {
    try {
      const status = await secureAdminFetch('/api/users/maintenance-status', {
        method: 'GET',
      });

      return status;
    } catch (err: any) {
      throw new Error(err.message || 'Erreur récupération statut maintenance');
    }
  };

  const setMaintenanceMode = async (enabled: boolean): Promise<void> => {
    try {
      await secureAdminFetch('/api/users/maintenance-mode', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });

      // Backend retourne { message: "Mode maintenance activé/désactivé" }
    } catch (err: any) {
      throw new Error(err.message || 'Erreur changement mode maintenance');
    }
  };

  return {
    // Méthodes admin
    getAllUsers,
    getUserStats,
    createUser,
    updateUser,
    adminResetPassword,
    deleteUser,
    toggleUserStatus,
    checkUserAccess,
    getMaintenanceStatus,
    setMaintenanceMode,

    // Métadonnées
    isAdmin: isUserAdmin(user),
    canAccessAdmin: isAuthenticated && isUserAdmin(user),
  };
};

export default useAdminUserService;