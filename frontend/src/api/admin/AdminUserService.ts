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
  role: 'admin' | 'user';
}

export interface UpdateUserDto {
  email?: string;
  telephone?: string;
}

export interface AdminResetPasswordDto {
  newPassword: string;
  confirmNewPassword: string;
}

export interface AccessCheckResponse {
  canAccess: boolean;
  reason?: string;
  user?: any;
  details?: any;
}

export interface MaintenanceStatus {
  isActive: boolean;
  enabledAt: string | null;
  message: string;
}

export interface MaintenanceResponse {
  message: string;
}

// ===== HOOK PERSONNALISÉ =====
export const useAdminUserService = () => {
  const { fetchWithAuth, user, isAuthenticated } = useAuth();

  // Fonction utilitaire pour vérifier les droits admin
  const isUserAdmin = (currentUser: any): boolean => {
    return currentUser?.role === 'admin';
  };

  // Extraire les messages d'erreur spécifiques du backend
  const extractBackendErrorMessage = (error: any): string => {
    if (error.message && typeof error.message === 'string') {
      const backendMessages = [
        'Cet email est déjà utilisé',
        'Ce numéro de téléphone est déjà utilisé',
        "Cet email est réservé à l'administrateur principal",
        "Impossible de supprimer l'administrateur unique",
        "Impossible de désactiver l'administrateur unique",
        "Seul l'administrateur principal peut réinitialiser son mot de passe",
        'Le mot de passe doit contenir au moins 8 caractères',
        'Les mots de passe ne correspondent pas',
        'Au moins un champ (email ou téléphone) doit être fourni',
        "Format d'email invalide",
        'Le téléphone doit contenir au moins 5 caractères',
        'Aucune donnée valide à mettre à jour',
        'Mode maintenance activé',
        'Compte désactivé',
        'Utilisateur non trouvé',
        'Déconnecté temporairement',
      ];

      for (const msg of backendMessages) {
        if (error.message.includes(msg)) {
          return msg;
        }
      }
    }
    return error.message || 'Une erreur est survenue';
  };

  // Fonction de requête admin sécurisée avec timeout
  const secureAdminFetch = async <T = any>(
    endpoint: string,
    options: RequestInit = {},
    timeout = 15000
  ): Promise<T> => {
    if (!isAuthenticated || !isUserAdmin(user)) {
      throw new Error('Accès refusé : droits administrateur requis');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      // fetchWithAuth retourne directement les données parsées, pas un objet Response !
      console.log('API Response:', endpoint);
      const data = await fetchWithAuth<T>(endpoint, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return data;

    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('La requête a expiré. Veuillez réessayer.');
      }

      if (err.message === 'UNAUTHORIZED' || err.message === 'SESSION_EXPIRED') {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      if (err.status === 403) {
        throw new Error('Accès refusé : droits administrateur requis');
      }

      // Extraire le message d'erreur spécifique du backend
      const userMessage = extractBackendErrorMessage(err);
      throw new Error(userMessage);
    }
  };

  // Nettoyer les données pour ne pas envoyer de champs undefined/null
  const cleanData = (data: any): any => {
    return Object.fromEntries(
      Object.entries(data).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
    );
  };

  // === MÉTHODES ADMIN UNIQUEMENT ===

  // Récupérer tous les utilisateurs
  const getAllUsers = async (): Promise<User[]> => {
    try {
      return await secureAdminFetch<User[]>('/api/users', {
        method: 'GET',
      });
    } catch (err: any) {
      throw new Error(
        err.message || 'Erreur lors de la récupération des utilisateurs'
      );
    }
  };

  // Obtenir les statistiques utilisateurs
  const getUserStats = async (): Promise<UserStats> => {
    try {
      return await secureAdminFetch<UserStats>('/api/users/stats', {
        method: 'GET',
      });
    } catch (err: any) {
      throw new Error(
        err.message || 'Erreur lors de la récupération des statistiques'
      );
    }
  };

  // Créer un utilisateur
  const createUser = async (userData: CreateUserDto): Promise<User> => {
    try {
      // Validation frontend supplémentaire
      if (!userData.email || !userData.email.includes('@')) {
        throw new Error("Format d'email invalide");
      }

      if (userData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      if (!userData.telephone || userData.telephone.trim().length < 5) {
        throw new Error('Le téléphone doit contenir au moins 5 caractères');
      }

      return await secureAdminFetch<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (err: any) {
      throw new Error(
        err.message || "Erreur lors de la création de l'utilisateur"
      );
    }
  };

  // Mettre à jour un utilisateur
  const updateUser = async (
    userId: string,
    userData: UpdateUserDto
  ): Promise<User> => {
    try {
      // Validation frontend
      if (userData.email && !userData.email.includes('@')) {
        throw new Error("Format d'email invalide");
      }

      if (userData.telephone && userData.telephone.trim().length < 5) {
        throw new Error('Le téléphone doit contenir au moins 5 caractères');
      }

      // Nettoyer les données
      const cleanUserData = cleanData(userData);

      if (Object.keys(cleanUserData).length === 0) {
        throw new Error('Aucune donnée valide à mettre à jour');
      }

      return await secureAdminFetch<User>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanUserData),
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  // Réinitialiser le mot de passe d'un utilisateur (admin)
  const adminResetPassword = async (
    userId: string,
    passwordData: AdminResetPasswordDto
  ): Promise<void> => {
    try {
      // Validation frontend
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
    } catch (err: any) {
      throw new Error(
        err.message || 'Erreur lors de la réinitialisation du mot de passe'
      );
    }
  };

  // Supprimer un utilisateur
  const deleteUser = async (userId: string): Promise<void> => {
    try {
      await secureAdminFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la suppression');
    }
  };

  // Activer/désactiver un utilisateur
  const toggleUserStatus = async (userId: string): Promise<User> => {
    try {
      return await secureAdminFetch<User>(
        `/api/users/${userId}/toggle-status`,
        {
          method: 'PATCH',
        }
      );
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors du changement de statut');
    }
  };

  // Vérifier l'accès d'un utilisateur
  const checkUserAccess = async (
    userId: string
  ): Promise<AccessCheckResponse> => {
    try {
      return await secureAdminFetch<AccessCheckResponse>(
        `/api/users/check-access/${userId}`,
        {
          method: 'GET',
        }
      );
    } catch (err: any) {
      throw new Error(err.message || 'Erreur vérification accès');
    }
  };

  // Gestion du mode maintenance
  const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
    try {
      return await secureAdminFetch<MaintenanceStatus>('/api/users/maintenance-status', {
        method: 'GET',
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur récupération statut maintenance');
    }
  };

  const setMaintenanceMode = async (
    enabled: boolean
  ): Promise<MaintenanceResponse> => {
    try {
      return await secureAdminFetch<MaintenanceResponse>('/api/users/maintenance-mode', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur changement mode maintenance');
    }
  };

  // Mise à jour du profil utilisateur (accessible aussi aux non-admins)
  const updateProfile = async (userData: UpdateUserDto): Promise<User> => {
    try {
      // Validation frontend
      if (userData.email && !userData.email.includes('@')) {
        throw new Error("Format d'email invalide");
      }

      if (userData.telephone && userData.telephone.trim().length < 5) {
        throw new Error('Le téléphone doit contenir au moins 5 caractères');
      }

      const cleanUserData = cleanData(userData);

      if (Object.keys(cleanUserData).length === 0) {
        throw new Error('Aucune donnée valide à mettre à jour');
      }

      return await secureAdminFetch<User>('/api/users/profile/me', {
        method: 'PATCH',
        body: JSON.stringify(cleanUserData),
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  // Récupérer le profil de l'utilisateur connecté
  const getMyProfile = async (): Promise<User> => {
    try {
      return await secureAdminFetch<User>('/api/users/profile/me', {
        method: 'GET',
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur récupération profil');
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
    updateProfile,
    getMyProfile,

    // Utilitaires
    isUserAdmin: isUserAdmin(user),
    canAccessAdmin: isAuthenticated && isUserAdmin(user),

    // Pour débogage
    currentUser: user,
  };
};

export default useAdminUserService;