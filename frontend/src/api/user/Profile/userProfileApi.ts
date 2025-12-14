// userProfileApi.ts - SERVICE SYNCHRONISÉ AVEC LE BACKEND
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
  lastLogin?: string;
  loginCount?: number;
  lastLogout?: string;
  logoutCount?: number;
  logoutReason?: string;
  logoutTransactionId?: string;
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
   * Correspond à: GET /api/auth/me (auth.controller.ts)
   */
  static async getCurrentUser(authFunctions: AuthContextFunctions): Promise<User | null> {
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

      // TRANSFORMATION DES DONNÉES EXACTEMENT COMME LE BACKEND
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
        updatedAt: userData.updatedAt,
        lastLogin: userData.lastLogin,
        loginCount: userData.loginCount,
        lastLogout: userData.lastLogout,
        logoutCount: userData.logoutCount,
        logoutReason: userData.logoutReason,
        logoutTransactionId: userData.logoutTransactionId
      };

      return user;

    } catch (error: any) {
      console.error('Erreur lors de la récupération du profil:', error);
      
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error('Impossible de récupérer le profil utilisateur');
      }
      
      return null;
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   * Correspond à: PATCH /api/users/profile/me (users.controller.ts)
   * Gestion INDÉPENDANTE email/téléphone comme spécifié
   */
  static async updateProfile(
    authFunctions: AuthContextFunctions,
    updateData: UserUpdateData
  ): Promise<User> {
    console.log("🔄 === updateProfile SERVICE SYNCHRONISÉ ===");
    console.log("📥 Données reçues:", updateData);
    
    // 🔍 VALIDATION EXACTEMENT COMME LE BACKEND (users.controller.ts)
    if (
      updateData.email === undefined &&
      updateData.telephone === undefined
    ) {
      const errorMessage = 'Au moins un champ (email ou téléphone) doit être fourni';
      console.error("❌ Validation échouée:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // ✅ VALIDATION EMAIL (si fourni)
    if (updateData.email !== undefined) {
      if (updateData.email.trim() === "") {
        const errorMessage = "L'email ne peut pas être vide";
        console.error("❌ Validation email:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        const errorMessage = "Format d'email invalide";
        console.error("❌ Validation email:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    }

    // ✅ VALIDATION TÉLÉPHONE (si fourni) - IMPORTANT: LONGUEUR MINIMUM
    if (updateData.telephone !== undefined) {
      // 🔥 CORRECTION CRITIQUE: Accepter chaîne vide mais si rempli, vérifier longueur
      const trimmedPhone = updateData.telephone.trim();
      
      // Si téléphone n'est pas vide, vérifier la longueur
      if (trimmedPhone !== "" && trimmedPhone.length < 5) {
        const errorMessage = "Le téléphone doit contenir au moins 5 caractères";
        console.error("❌ Validation téléphone:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log("📱 Téléphone validé:", trimmedPhone);
    }

    // 🏗️ CONSTRUIRE LES DONNÉES EXACTEMENT COMME LE BACKEND
    const allowedUpdate: any = {};

    // Email - seulement si fourni et non vide
    if (
      updateData.email !== undefined &&
      updateData.email.trim() !== ""
    ) {
      allowedUpdate.email = updateData.email.trim().toLowerCase();
    }

    // Téléphone - accepter chaîne vide pour suppression
    if (updateData.telephone !== undefined) {
      // ⚠️ IMPORTANT: Envoyer chaîne vide pour supprimer le téléphone
      allowedUpdate.telephone = updateData.telephone.trim();
    }

    // Vérification finale comme backend
    if (Object.keys(allowedUpdate).length === 0) {
      const errorMessage = "Aucune donnée valide à mettre à jour";
      console.error("❌ Validation finale:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log("📤 Données finales pour API:", allowedUpdate);

    try {
      console.log("🌐 Envoi requête PATCH à /api/users/profile/me");
      
      const response = await authFunctions.fetchWithAuth('/api/users/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allowedUpdate),
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

      // Retourner utilisateur formaté comme le backend
      return {
        id: result.id || result._id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        telephone: result.telephone,
        isActive: result.isActive !== false,
        isAdmin: result.role === UserRole.ADMIN,
        logoutUntil: result.logoutUntil,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        lastLogin: result.lastLogin,
        loginCount: result.loginCount,
        lastLogout: result.lastLogout,
        logoutCount: result.logoutCount,
        logoutReason: result.logoutReason,
        logoutTransactionId: result.logoutTransactionId
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
   * Correspond à: POST /api/auth/update-password (auth.controller.ts)
   */
  static async updatePassword(
    authFunctions: AuthContextFunctions,
    passwordData: PasswordUpdateData
  ): Promise<{ success: boolean; message: string }> {
    console.log("🔐 === updatePassword SERVICE SYNCHRONISÉ ===");
    
    // 🔍 VALIDATION EXACTEMENT COMME LE BACKEND (auth.controller.ts)
    
    // 1. Vérification mot de passe actuel
    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === '') {
      const errorMessage = "Le mot de passe actuel est requis";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 2. Vérification correspondance nouveaux mots de passe
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      const errorMessage = "Les mots de passe ne correspondent pas";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 3. Vérification longueur minimum
    if (passwordData.newPassword.length < 8) {
      const errorMessage = "Le mot de passe doit contenir au moins 8 caractères";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 4. Validation de complexité (comme users.service.ts)
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      const errorMessage = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      console.error("❌ Validation complexité:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log("📤 Données validées pour API");

    try {
      console.log("🌐 Envoi requête POST à /api/auth/update-password");
      
      const response = await authFunctions.fetchWithAuth('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword,
        }),
      });

      console.log("📥 Réponse - Status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erreur ${response.status}`;
        
        // Gestion spécifique des erreurs connues du backend
        if (errorMessage.includes('mot de passe actuel incorrect')) {
          console.error("❌ Mot de passe actuel incorrect");
          toast.error("Le mot de passe actuel est incorrect");
          throw new Error("Le mot de passe actuel est incorrect");
        }
        
        if (errorMessage.includes('Configuration du compte invalide')) {
          console.error("❌ Configuration compte invalide");
          toast.error("Problème technique avec votre compte. Contactez l'administrateur.");
          throw new Error(errorMessage);
        }
        
        console.error("❌ Erreur API:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Résultat API:", result);
      
      // Rafraîchir le token après changement de mot de passe
      await authFunctions.refreshToken();
      
      toast.success('Mot de passe changé avec succès');
      return {
        success: true,
        message: 'Mot de passe changé avec succès',
      };
    } catch (error: any) {
      console.error('❌ Erreur updatePassword:', error);
      
      // Ne pas afficher de toast pour les erreurs de session
      if (error.message !== 'SESSION_EXPIRED') {
        // Le toast a déjà été affiché dans les validations
        if (!error.message.includes('Le mot de passe actuel est incorrect') && 
            !error.message.includes('Configuration du compte invalide')) {
          toast.error(error.message || 'Erreur lors du changement de mot de passe');
        }
      }
      
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe (oubli de mot de passe)
   * Correspond à: POST /api/auth/forgot-password (auth.controller.ts)
   */
  static async forgotPassword(email: string): Promise<void> {
    console.log("📧 === forgotPassword SERVICE ===");
    
    // Validation email
    if (!email || email.trim() === "") {
      const errorMessage = "L'email est requis";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMessage = "Format d'email invalide";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
      console.log("🌐 Envoi requête POST à /api/auth/forgot-password");
      
      const response = await window.fetch(
        `${VITE_API_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        }
      );

      console.log("📥 Réponse - Status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Erreur lors de l'envoi de l'email";
        console.error("❌ Erreur API:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log("✅ Email envoyé avec succès");
      toast.success('Si votre email est enregistré, vous recevrez un lien de réinitialisation');
    } catch (error: any) {
      console.error('❌ Erreur forgotPassword:', error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email de réinitialisation");
      throw error;
    }
  }

  /**
   * Réinitialisation du mot de passe avec token
   * Correspond à: POST /api/auth/reset-password (auth.controller.ts)
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    console.log("🔄 === resetPassword SERVICE ===");
    
    // 🔍 VALIDATION EXACTEMENT COMME LE BACKEND (auth.service.ts & users.service.ts)
    
    // 1. Validation token
    if (!token || token.trim() === '') {
      const errorMessage = "Le token de réinitialisation est requis";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 2. Validation longueur minimum
    if (newPassword.length < 8) {
      const errorMessage = "Le mot de passe doit contenir au moins 8 caractères";
      console.error("❌ Validation:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 3. Validation de complexité
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      const errorMessage = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      console.error("❌ Validation complexité:", errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log("📤 Données validées pour API");

    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
      console.log("🌐 Envoi requête POST à /api/auth/reset-password");
      
      const response = await window.fetch(
        `${VITE_API_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.trim(),
            newPassword: newPassword,
            confirmPassword: newPassword, // Comme backend
          }),
        }
      );

      console.log("📥 Réponse - Status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Erreur lors de la réinitialisation';
        console.error("❌ Erreur API:", errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log("✅ Mot de passe réinitialisé avec succès");
      toast.success('Mot de passe réinitialisé avec succès');
    } catch (error: any) {
      console.error('❌ Erreur resetPassword:', error);
      toast.error(error.message || 'Erreur lors de la réinitialisation du mot de passe');
      throw error;
    }
  }
}

// ==================== HOOK PERSONNALISÉ SYNCHRONISÉ ====================
export const useUserProfile = () => {
  const { fetchWithAuth, access_token, refreshToken } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    const updatedUser = await UserProfileService.updateProfile(authFunctions, updateData);
    setUser(updatedUser);
    return updatedUser;
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

// ==================== EXPORT POUR UTILISATION DIRECTE ====================
export const userProfileService = UserProfileService;