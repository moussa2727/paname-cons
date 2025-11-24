export interface UserProfileData {
  email?: string;
  telephone?: string;
}

export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ValidationErrors {
  email?: string;
  telephone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

class UserProfileApiService {
  private readonly VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Validation des champs profil
  validateProfileField(name: string, value: string): string {
    switch (name) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Format d\'email invalide';
        }
        break;
      
      case 'telephone':
        if (value && value.trim().length < 5) {
          return 'Le téléphone doit contenir au moins 5 caractères';
        }
        if (value && !/^[\d\s+\-()]+$/.test(value)) {
          return 'Le téléphone contient des caractères invalides';
        }
        break;
      
      default:
        return '';
    }
    return '';
  }

  // Validation des champs mot de passe
  validatePasswordField(name: string, value: string, allData?: PasswordData): string {
    switch (name) {
      case 'currentPassword':
        if (!value.trim()) {
          return 'Le mot de passe actuel est requis';
        }
        break;
      
      case 'newPassword':
        if (!value.trim()) {
          return 'Le nouveau mot de passe est requis';
        }
        if (value.length < 8) {
          return 'Le mot de passe doit contenir au moins 8 caractères';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
        }
        break;
      
      case 'confirmNewPassword':
        if (!value.trim()) {
          return 'La confirmation du mot de passe est requise';
        }
        if (allData && value !== allData.newPassword) {
          return 'Les mots de passe ne correspondent pas';
        }
        break;
      
      default:
        return '';
    }
    return '';
  }

async updateProfile(profileData: UserProfileData, token: string): Promise<any> {
  try {
    const response = await fetch(`${this.VITE_API_URL}/api/users/profile/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        email: profileData.email?.trim() || undefined,
        telephone: profileData.telephone?.trim() || undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      console.warn(`Erreur mise à jour profil: ${response.status}`);
      
      if (response.status === 400) {
        if (errorData.message?.includes('email est déjà utilisé')) {
          throw new Error('Cet email est déjà utilisé');
        }
        if (errorData.message?.includes('numéro de téléphone est déjà utilisé')) {
          throw new Error('Ce numéro de téléphone est déjà utilisé');
        }
        if (errorData.message?.includes('Format d\'email invalide')) {
          throw new Error('Format d\'email invalide');
        }
        if (errorData.message?.includes('téléphone doit contenir')) {
          throw new Error('Le téléphone doit contenir au moins 5 caractères');
        }
        if (errorData.message?.includes('Au moins un champ')) {
          throw new Error('Au moins un champ (email ou téléphone) doit être fourni');
        }
        throw new Error('Données de profil invalides');
      }
      
      if (response.status === 401) {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
      
      throw new Error('Erreur lors de la mise à jour du profil');
    }

    const result = await response.json();
    
    // ✅ FORMAT COHÉRENT ABSOLU
    return {
      id: result.id,
      email: result.email,
      telephone: result.telephone,
      firstName: result.firstName,
      lastName: result.lastName,
      role: result.role,
      isActive: result.isActive,
      isAdmin: result.isAdmin !== undefined ? result.isAdmin : result.role === 'admin'
    };
      
  } catch (error: any) {
    console.warn('Erreur mise à jour profil');
    
    if (error.message && !error.message.includes('token')) {
      throw error;
    }
    throw new Error('Erreur de connexion au serveur');
  }
}

  // Mise à jour du mot de passe - CORRECTION DE L'ENDPOINT
  async updatePassword(passwordData: PasswordData, token: string): Promise<void> {
    if (!token) {
      throw new Error('Vous devez être connecté pour modifier votre mot de passe');
    }

    // Validation finale mot de passe
    const finalErrors: ValidationErrors = {};
    Object.keys(passwordData).forEach(key => {
      const error = this.validatePasswordField(key, passwordData[key as keyof PasswordData] || '', passwordData);
      if (error) {
        finalErrors[key as keyof ValidationErrors] = error;
      }
    });

    if (Object.keys(finalErrors).length > 0) {
      throw new Error('Veuillez corriger les erreurs dans le formulaire');
    }

    try {
      const response = await fetch(`${this.VITE_API_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.warn(`Erreur mise à jour mot de passe: ${response.status}`);
        
        if (response.status === 404) {
          return await this.tryAlternativePasswordUpdate(passwordData, token);
        }
        
        if (response.status === 400 || response.status === 401) {
          if (errorData.message?.includes('Mot de passe actuel incorrect') || 
              errorData.message?.includes('Le mot de passe actuel est incorrect')) {
            throw new Error('Le mot de passe actuel est incorrect');
          }
          throw new Error(errorData.message || 'Erreur lors de la mise à jour du mot de passe');
        }
        
        throw new Error('Erreur lors de la mise à jour du mot de passe');
      }

      await response.json();
      
    } catch (error: any) {
      console.warn('Erreur mise à jour mot de passe');
      
      // Gestion des erreurs réseau
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Erreur de connexion au serveur');
      }
      
      // Propager les erreurs métier existantes
      if (error.message && 
          !error.message.includes('token') && 
          !error.message.includes('Failed to fetch')) {
        throw error;
      }
      
      throw new Error('Erreur lors de la mise à jour du mot de passe');
    }
  }

  private async tryAlternativePasswordUpdate(passwordData: PasswordData, token: string): Promise<void> {
    try {
      const response = await fetch(`${this.VITE_API_URL}/api/users/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('Le mot de passe actuel est incorrect');
        }
        
        throw new Error(errorData.message || 'Erreur lors de la mise à jour du mot de passe');
      }

      await response.json();
      
    } catch (error: any) {
      console.warn('Endpoint alternatif échoué');
      throw new Error('Fonctionnalité temporairement indisponible');
    }
  }

  validateProfileBeforeSubmit(profileData: UserProfileData): { isValid: boolean; errors: ValidationErrors } {
    const errors: ValidationErrors = {};
    let hasValidData = false;
    if (profileData.email !== undefined && profileData.email.trim() !== '') {
      hasValidData = true;
      const emailError = this.validateProfileField('email', profileData.email);
      if (emailError) errors.email = emailError;
    }

    if (profileData.telephone !== undefined && profileData.telephone.trim() !== '') {
      hasValidData = true;
      const telephoneError = this.validateProfileField('telephone', profileData.telephone);
      if (telephoneError) errors.telephone = telephoneError;
    }

    if (!hasValidData) {
      errors.email = 'Au moins un champ (email ou téléphone) doit être modifié';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validatePasswordBeforeSubmit(passwordData: PasswordData): { isValid: boolean; errors: ValidationErrors } {
    const errors: ValidationErrors = {};
    
    Object.keys(passwordData).forEach(key => {
      const error = this.validatePasswordField(key, passwordData[key as keyof PasswordData] || '', passwordData);
      if (error) {
        errors[key as keyof ValidationErrors] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const userProfileApi = new UserProfileApiService();