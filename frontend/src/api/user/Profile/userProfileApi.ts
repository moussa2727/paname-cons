// userProfileApi.ts - SERVICE SYNCHRONISÉ AVEC LE CONTEXTE AUTH
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

// ==================== INTERFACES ====================
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  telephone?: string;
  isActive: boolean;
  isAdmin?: boolean;
  logoutUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
}

export interface MaintenanceStatus {
  isActive: boolean;
  enabledAt: string | null;
  message: string;
}

export interface UserUpdateData {
  email?: string;
  telephone?: string;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Interface pour les fonctions d'authentification du contexte
export interface AuthContextFunctions {
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
  refreshToken: () => Promise<boolean>;
  access_token: string | null;
}

// ==================== SERVICE SYNCHRONISÉ ====================
class UserProfileService {
  /**
   * Récupérer le profil de l'utilisateur connecté
   * Utilise fetchWithAuth du contexte
   */
  static async getCurrentUser(authFunctions: AuthContextFunctions): Promise<User | null> {
    try {
      const response = await authFunctions.fetchWithAuth('/api/auth/me');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Erreur lors de la récupération du profil';

        if (response.status === 401) {
          console.warn('Session expirée détectée - le contexte gère déjà la redirection');
          return null;
        }

        toast.error(errorMessage);
        return null;
      }

      const userData = await response.json();

      const user: User = {
        id: userData.id || userData._id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        telephone: userData.telephone,
        isActive: userData.isActive !== false,
        isAdmin: userData.role === UserRole.ADMIN,
        logoutUntil: userData.logoutUntil,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };

      return user;

    } catch (error: any) {
      console.error('Erreur lors de la récupération du profil:', error);
      
      // Ne pas afficher de toast pour les erreurs de session (déjà gérées par le contexte)
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error('Impossible de récupérer le profil utilisateur');
      }
      
      return null;
    }
  }

 static async updateProfile(
  authFunctions: AuthContextFunctions,
  updateData: UserUpdateData
): Promise<User> {
  console.log("🔄 === updateProfile SERVICE ===");
  console.log("📥 Données reçues:", updateData);
  
  // ✅ CORRECTION : Ne PAS forcer les deux champs
  // Accepter soit email, soit téléphone, soit les deux
  const hasEmail = updateData.email !== undefined && updateData.email.trim() !== '';
  const hasTelephone = updateData.telephone !== undefined;
  
  console.log("📊 Champs disponibles:");
  console.log("  - Email:", hasEmail, updateData.email);
  console.log("  - Téléphone:", hasTelephone, updateData.telephone);
  
  if (!hasEmail && !hasTelephone) {
    const errorMessage = 'Au moins un champ (email ou téléphone) doit être fourni';
    console.error("❌ Validation échouée:", errorMessage);
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Préparer les données
  const requestData: any = {};
  
  if (hasEmail) {
    requestData.email = updateData.email!.trim();
    console.log("📧 Email à envoyer:", requestData.email);
  }
  
  if (hasTelephone) {
    // ✅ IMPORTANT : Accepter chaîne vide pour supprimer le téléphone
    requestData.telephone = updateData.telephone!.trim();
    console.log("📱 Téléphone à envoyer:", requestData.telephone);
  }

  console.log("📤 Données finales pour API:", requestData);

  try {
    console.log("🌐 Envoi requête PATCH à /api/users/profile/me");
    
    const response = await authFunctions.fetchWithAuth('/api/users/profile/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log("📥 Réponse - Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Réponse non OK:", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.error("❌ Erreur parsée:", errorData);
      } catch (e) {
        console.error("❌ Erreur raw:", errorText);
      }
      
      const errorMessage = errorData?.message || `Erreur ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("✅ Résultat API:", result);
    
    // Rafraîchir le token si nécessaire
    await authFunctions.refreshToken();
    
    toast.success('Profil mis à jour avec succès');

    return {
      id: result.id || result._id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      role: result.role,
      telephone: result.telephone,
      isActive: result.isActive !== false,
      isAdmin: result.role === UserRole.ADMIN,
    };
  } catch (error: any) {
    console.error("❌ Erreur updateProfile:", error);
    
    if (error.message !== 'SESSION_EXPIRED') {
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    }
    
    throw error;
  }
}

  /**
   * Met à jour le mot de passe de l'utilisateur
   * Utilise fetchWithAuth du contexte
   */
  static async updatePassword(
    authFunctions: AuthContextFunctions,
    passwordData: PasswordUpdateData
  ): Promise<{ success: boolean; message: string }> {
    // Validation côté client
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      const errorMessage = 'Les nouveaux mots de passe ne correspondent pas';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (passwordData.newPassword.length < 8) {
      const errorMessage = 'Le mot de passe doit contenir au moins 8 caractères';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validation de complexité
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      const errorMessage = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await authFunctions.fetchWithAuth('/api/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erreur ${response.status}`;
        throw new Error(errorMessage);
      }

      // Rafraîchir le token après changement de mot de passe
      await authFunctions.refreshToken();
      
      toast.success('Mot de passe changé avec succès');
      return {
        success: true,
        message: 'Mot de passe changé avec succès',
      };
    } catch (error: any) {
      console.error('Erreur updatePassword:', error);
      
      // Ne pas afficher de toast pour les erreurs de session
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error(error.message || 'Erreur lors du changement de mot de passe');
      }
      
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe (oubli de mot de passe)
   * Cette méthode utilise fetch direct car pas besoin de token
   */
  static async forgotPassword(email: string): Promise<void> {
    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
      const response = await window.fetch(
        `${VITE_API_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Erreur lors de l'envoi de l'email";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      toast.success('Si votre email est enregistré, vous recevrez un lien de réinitialisation');
    } catch (error: any) {
      console.error('Erreur forgotPassword:', error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email de réinitialisation");
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe avec token
   * Cette méthode utilise fetch direct car pas besoin de token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validation
    if (newPassword.length < 8) {
      const errorMessage = 'Le mot de passe doit contenir au moins 8 caractères';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validation de complexité
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      const errorMessage = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
      const response = await window.fetch(
        `${VITE_API_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword: newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Erreur lors de la réinitialisation';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      toast.success('Mot de passe réinitialisé avec succès');
    } catch (error: any) {
      console.error('Erreur resetPassword:', error);
      toast.error(error.message || 'Erreur lors de la réinitialisation du mot de passe');
      throw error;
    }
  }

  /**
   * Hook pour récupérer le profil utilisateur avec rechargement automatique
   */
  static useUserProfile = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const { fetchWithAuth, access_token, refreshToken } = useAuth();

    const authFunctions: AuthContextFunctions = {
      fetchWithAuth,
      refreshToken,
      access_token,
    };

    const fetchProfile = useCallback(async () => {
      if (!access_token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const profile = await UserProfileService.getCurrentUser(authFunctions);
        setUser(profile);
      } catch (err: any) {
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }, [authFunctions, access_token]);

    useEffect(() => {
      fetchProfile();
    }, [fetchProfile]);

    const updateProfile = useCallback(async (updateData: UserUpdateData): Promise<User> => {
      return await UserProfileService.updateProfile(authFunctions, updateData);
    }, [authFunctions]);

    const updatePassword = useCallback(async (passwordData: PasswordUpdateData): Promise<{ success: boolean; message: string }> => {
      return await UserProfileService.updatePassword(authFunctions, passwordData);
    }, [authFunctions]);

    return {
      user,
      loading,
      error,
      refetchProfile: fetchProfile,
      updateProfile,
      updatePassword,
    };
  };
}

// ==================== HOOK PERSONNALISÉ POUR LE PROFIL ====================
export const useUserProfile = () => {
  const { fetchWithAuth, access_token, refreshToken } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!access_token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authFunctions: AuthContextFunctions = {
        fetchWithAuth,
        refreshToken,
        access_token,
      };
      
      const profile = await UserProfileService.getCurrentUser(authFunctions);
      setUser(profile);
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, access_token, refreshToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updateData: UserUpdateData): Promise<User> => {
    const authFunctions: AuthContextFunctions = {
      fetchWithAuth,
      refreshToken,
      access_token,
    };
    
    const updatedUser = await UserProfileService.updateProfile(authFunctions, updateData);
    setUser(updatedUser);
    return updatedUser;
  }, [fetchWithAuth, access_token, refreshToken]);

  const updatePassword = useCallback(async (passwordData: PasswordUpdateData): Promise<{ success: boolean; message: string }> => {
    const authFunctions: AuthContextFunctions = {
      fetchWithAuth,
      refreshToken,
      access_token,
    };
    
    return await UserProfileService.updatePassword(authFunctions, passwordData);
  }, [fetchWithAuth, access_token, refreshToken]);

  return {
    user,
    loading,
    error,
    refetchProfile: fetchProfile,
    updateProfile,
    updatePassword,
  };
};

// ==================== EXPORT POUR UTILISATION DIRECTE ====================
export const userProfileService = UserProfileService;