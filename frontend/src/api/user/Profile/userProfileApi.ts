// userProfileApi.ts - Service API complet avec mot de passe
import { toast } from 'react-toastify';

// ==================== INTERFACES (existantes dans votre code) ====================
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

// ==================== SERVICE PRINCIPAL ====================
class UserProfileService {
  private readonly VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';

  // ==================== MÉTHODES PUBLIQUES (UTILISATEUR CONNECTÉ) ====================

   /**
   * Récupère le profil utilisateur actuel via le contexte Auth
   */
  async getCurrentUser(token: string): Promise<Partial<User> | null> {
    try {
      const response = await globalThis.fetch(
        `${this.VITE_API_URL}/api/auth/me`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Erreur lors de la récupération du profil';

        // Si session expirée, le contexte Auth gèrera la redirection
        if (response.status === 401) {
          console.warn('Session expirée détectée');
          return null;
        }

        toast.error(errorMessage);
        return null;
      }

      const userData = await response.json();

      // ✅ CORRECTION : Inclure le téléphone dans le retour
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
   * Met à jour le profil utilisateur (email et/ou téléphone)
   */
  async updateProfile(
    token: string,
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

    const response = await globalThis.fetch(
      `${this.VITE_API_URL}/api/users/profile/me`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage =
        errorData.message ||
        `Erreur ${response.status} lors de la mise à jour du profil`;

      // Gestion spécifique des erreurs
      if (response.status === 400) {
        if (errorData.message?.includes('email est déjà utilisé')) {
          errorMessage = 'Cet email est déjà utilisé';
        }
        if (errorData.message?.includes('numéro de téléphone est déjà utilisé')) {
          errorMessage = 'Ce numéro de téléphone est déjà utilisé';
        }
        if (errorData.message?.includes("Format d'email invalide")) {
          errorMessage = "Format d'email invalide";
        }
      }

      if (response.status === 401) {
        errorMessage = 'Session expirée - Veuillez vous reconnecter';
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    toast.success('Profil mis à jour avec succès');

    // ✅ CORRECTION : Inclure le téléphone dans le retour
    return {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      telephone: result.telephone, 
      isActive: result.isActive,
      logoutUntil: result.logoutUntil,
    };
  }

  /**
   * Met à jour le mot de passe de l'utilisateur
   * OUI, le mot de passe est modifiable via cette méthode
   */
  async updatePassword(
    token: string,
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

    const response = await globalThis.fetch(
      `${this.VITE_API_URL}/api/auth/update-password`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.message || 'Erreur lors du changement de mot de passe';

      // Gestion des erreurs spécifiques
      if (response.status === 400) {
        if (errorMessage.includes('Le mot de passe actuel est incorrect')) {
          errorMessage = 'Le mot de passe actuel est incorrect';
        }
        if (errorMessage.includes('Configuration du compte invalide')) {
          errorMessage = 'Problème technique avec votre compte. Contactez l\'administrateur.';
        }
      }

      if (response.status === 401) {
        errorMessage = 'Session expirée - Veuillez vous reconnecter';
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    toast.success('Mot de passe changé avec succès');
    return {
      success: true,
      message: 'Mot de passe changé avec succès',
    };
  }

  /**
   * Réinitialisation du mot de passe (oubli de mot de passe)
   */
  async forgotPassword(email: string): Promise<void> {
    const response = await window.fetch(
      `${this.VITE_API_URL}/api/auth/forgot-password`,
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
  }

  /**
   * Réinitialisation du mot de passe avec token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
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

    const response = await window.fetch(
      `${this.VITE_API_URL}/api/auth/reset-password`,
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
  }


}

// ==================== EXPORT DU SERVICE ====================
export const userProfileService = new UserProfileService();

// ==================== HOOK POUR REACT ====================
/**
 * Hook pour utiliser le service API dans les composants React
 * Doit être utilisé à l'intérieur d'un AuthProvider
 */
export const useUserProfile = () => {
  // Ce hook délègue l'authentification au contexte Auth
  // et utilise seulement les méthodes API
  
  return {
    // Méthodes publiques
    getCurrentUser: userProfileService.getCurrentUser.bind(userProfileService),
    updateProfile: userProfileService.updateProfile.bind(userProfileService),
    updatePassword: userProfileService.updatePassword.bind(userProfileService),
    forgotPassword: userProfileService.forgotPassword.bind(userProfileService),
    resetPassword: userProfileService.resetPassword.bind(userProfileService),
  };
};