// userProfileApi.ts - SERVICE SIMPLIFIÉ UTILISANT LE CONTEXTE
import { toast } from 'react-toastify';

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

// Interface pour les fonctions d'authentification
export interface AuthFunctions {
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

// ==================== SERVICE SIMPLIFIÉ ====================
class UserProfileService {
  private readonly VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';

  // Cette méthode est conçue pour être utilisée avec fetchWithAuth du contexte
  static async getCurrentUser(authFunctions: AuthFunctions): Promise<Partial<User> | null> {
    try {
      const response = await authFunctions.fetchWithAuth('/api/auth/me');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Erreur lors de la récupération du profil';

        if (response.status === 401) {
          console.warn('Session expirée détectée');
          return null;
        }

        toast.error(errorMessage);
        return null;
      }

      const userData = await response.json();

      return {
        id: userData.id || userData._id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        telephone: userData.telephone,
        isActive: userData.isActive !== false,
        logoutUntil: userData.logoutUntil,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };

    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return null;
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  static async updateProfile(
    authFunctions: AuthFunctions,
    updateData: UserUpdateData
  ): Promise<Partial<User>> {
    // Validation
    if (!updateData.email && !updateData.telephone) {
      const errorMessage = 'Au moins un champ (email ou téléphone) doit être fourni';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const requestData: any = {};
    if (updateData.email !== undefined) {
      requestData.email = updateData.email.trim();
    }
    if (updateData.telephone !== undefined) {
      requestData.telephone = updateData.telephone.trim();
    }

    if (Object.keys(requestData).length === 0) {
      const errorMessage = 'Aucune donnée valide à mettre à jour';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await authFunctions.fetchWithAuth('/api/users/profile/me', {
        method: 'PATCH',
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      toast.success('Profil mis à jour avec succès');

      return {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        telephone: result.telephone, 
        isActive: result.isActive,
        logoutUntil: result.logoutUntil,
      };
    } catch (error: any) {
      console.error('Erreur updateProfile:', error);
      throw error;
    }
  }

  /**
   * Met à jour le mot de passe de l'utilisateur
   */
  static async updatePassword(
    authFunctions: AuthFunctions,
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

      toast.success('Mot de passe changé avec succès');
      return {
        success: true,
        message: 'Mot de passe changé avec succès',
      };
    } catch (error: any) {
      console.error('Erreur updatePassword:', error);
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe (oubli de mot de passe)
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
    } catch (error) {
      console.error('Erreur forgotPassword:', error);
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe avec token
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
    } catch (error) {
      console.error('Erreur resetPassword:', error);
      throw error;
    }
  }
}

// ==================== EXPORT POUR UTILISATION DIRECTE ====================
export const userProfileService = UserProfileService;