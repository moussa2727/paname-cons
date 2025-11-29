// userProfileApi.ts - SERVICE pour toutes les opérations utilisateur (sauf auth)
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
  private readonly VITE_API_URL = import.meta.env.VITE_API_URL;

  // ==================== 🔐 VALIDATIONS STRICTES (CONFORMES BACKEND) ====================

  /**
   * Validation email - STRICTEMENT CONFORME BACKEND
   */
  validateEmail(email: string): string {
    if (!email || email.trim() === '') {
      return "L'email est requis";
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      return "Format d'email invalide";
    }

    return '';
  }

  /**
   * Validation téléphone - STRICTEMENT CONFORME BACKEND
   */
  validateTelephone(telephone: string): string {
    if (!telephone || telephone.trim() === '') {
      return 'Le téléphone est requis';
    }

    const trimmedPhone = telephone.trim();

    // ✅ CONFORME BACKEND : au moins 5 caractères
    if (trimmedPhone.length < 5) {
      return 'Le téléphone doit contenir au moins 5 caractères';
    }

    return '';
  }

  /**
   * Validation mot de passe - STRICTEMENT CONFORME BACKEND
   */
  validatePassword(password: string, fieldName: string): string {
    if (!password || password.trim() === '') {
      return `${this.getPasswordFieldLabel(fieldName)} est requis`;
    }

    // ✅ CONFORME BACKEND : validation spécifique pour nouveau mot de passe
    if (fieldName === 'newPassword') {
      if (password.length < 8) {
        return 'Le mot de passe doit contenir au moins 8 caractères';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      }
    }

    return '';
  }

  private getPasswordFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      currentPassword: 'Le mot de passe actuel',
      newPassword: 'Le nouveau mot de passe',
      confirmNewPassword: 'La confirmation du mot de passe',
    };
    return labels[fieldName] || 'Ce champ';
  }

  // ==================== 📧 MOT DE PASSE OUBLIÉ ====================

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<void> {
    // ✅ Validation email CONFORME BACKEND
    const emailError = this.validateEmail(email);
    if (emailError) {
      throw new Error(emailError);
    }

    try {
      const response = await fetch(
        `${this.VITE_API_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      // ✅ Gestion d'erreurs CONFORME BACKEND
      if (!response.ok) {
        await this.handleForgotPasswordError(response);
      }

      // ✅ RÉPONSE CONFORME BACKEND - Toujours retourner succès même si email non trouvé
      await response.json();
    } catch (error: unknown) {
      // ✅ IGNORER L'ERREUR SPÉCIALE POUR LA SÉCURITÉ
      if ((error as Error).message === 'EMAIL_SENT_FOR_SECURITY') {
        return; // Ne rien faire - conforme au backend pour la confidentialité
      }
      this.handleApiError(error, 'demande de réinitialisation');
    }
  }

  // ==================== 🔄 RÉINITIALISATION MOT DE PASSE ====================

  /**
   * Réinitialisation du mot de passe avec token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    // ✅ Validation STRICTE CONFORME BACKEND
    const passwordError = this.validatePassword(newPassword, 'newPassword');
    if (passwordError) {
      throw new Error(passwordError);
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }

    try {
      const response = await fetch(
        `${this.VITE_API_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        }
      );

      if (!response.ok) {
        await this.handleResetPasswordError(response);
      }

      await response.json();
    } catch (error: unknown) {
      this.handleApiError(error, 'réinitialisation de mot de passe');
    }
  }

  // ==================== 📞 APPELS API PROFIL ====================

  /**
   * Mise à jour profil
   */
  async updateProfile(profileData: UserProfileData): Promise<any> {
    // ✅ Validation STRICTE identique backend
    const validation = this.validateProfileBeforeSubmit(profileData);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    try {
      const response = await fetch(
        `${this.VITE_API_URL}/api/users/profile/me`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: profileData.email?.trim(),
            telephone: profileData.telephone?.trim(),
          }),
        }
      );

      // ✅ Gestion d'erreurs CONFORME BACKEND
      if (!response.ok) {
        await this.handleProfileUpdateError(response);
      }

      const result = await response.json();
      return this.formatUserResponse(result);
    } catch (error: unknown) {
      this.handleApiError(error, 'profil');
    }
  }

  /**
   * Récupération profil
   */
  async getProfile(): Promise<any> {
    try {
      const response = await fetch(
        `${this.VITE_API_URL}/api/users/profile/me`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        await this.handleGetProfileError(response);
      }

      const result = await response.json();
      return this.formatUserResponse(result);
    } catch (error: unknown) {
      this.handleApiError(error, 'profil');
    }
  }

  /**
   * Mise à jour mot de passe
   */
  async updatePassword(passwordData: PasswordData): Promise<void> {
    // ✅ Validation STRICTE identique backend
    const validation = this.validatePasswordBeforeSubmit(passwordData);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    try {
      const response = await fetch(
        `${this.VITE_API_URL}/api/auth/update-password`,
        {
          method: 'POST',
          headers: {
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

      // ✅ Gestion d'erreurs CONFORME BACKEND
      if (!response.ok) {
        await this.handlePasswordUpdateError(response);
      }

      await response.json();
    } catch (error: unknown) {
      this.handleApiError(error, 'mot de passe');
    }
  }

  // ==================== 🛡️ GESTION D'ERREURS STRICTE ====================

  private async handleForgotPasswordError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        if (errorData.message?.includes("Format d'email invalide")) {
          throw new Error("Format d'email invalide");
        }
        throw new Error(errorData.message || 'Données de demande invalides');

      case 429:
        throw new Error('Trop de tentatives - Veuillez réessayer plus tard');

      case 500:
        throw new Error('Erreur interne du serveur - Veuillez réessayer');

      default:
        throw new Error('EMAIL_SENT_FOR_SECURITY'); // Erreur spéciale qui sera catchée
    }
  }

  private async handleResetPasswordError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        if (
          errorData.message?.includes('Les mots de passe ne correspondent pas')
        ) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (
          errorData.message?.includes('doit contenir au moins 8 caractères')
        ) {
          throw new Error(
            'Le mot de passe doit contenir au moins 8 caractères'
          );
        }
        if (
          errorData.message?.includes('minuscule, une majuscule et un chiffre')
        ) {
          throw new Error(
            'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
          );
        }
        throw new Error(
          errorData.message || 'Données de réinitialisation invalides'
        );

      case 401:
        if (errorData.message?.includes('Token invalide ou expiré')) {
          throw new Error('Lien de réinitialisation invalide ou expiré');
        }
        throw new Error('Lien de réinitialisation invalide');

      case 404:
        throw new Error('Utilisateur non trouvé');

      case 500:
        throw new Error('Erreur interne du serveur - Veuillez réessayer');

      default:
        throw new Error('Erreur lors de la réinitialisation du mot de passe');
    }
  }

  private async handleProfileUpdateError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        if (
          errorData.message?.includes('email est déjà utilisé') ||
          errorData.message?.includes('Cet email est déjà utilisé')
        ) {
          throw new Error('Cet email est déjà utilisé');
        }
        if (
          errorData.message?.includes('téléphone est déjà utilisé') ||
          errorData.message?.includes('Ce numéro de téléphone est déjà utilisé')
        ) {
          throw new Error('Ce numéro de téléphone est déjà utilisé');
        }
        if (errorData.message?.includes("Format d'email invalide")) {
          throw new Error("Format d'email invalide");
        }
        if (errorData.message?.includes('téléphone doit contenir')) {
          throw new Error('Le téléphone doit contenir au moins 5 caractères');
        }
        if (errorData.message?.includes('Au moins un champ')) {
          throw new Error(
            'Au moins un champ (email ou téléphone) doit être fourni'
          );
        }
        if (errorData.message?.includes("L'email ne peut pas être vide")) {
          throw new Error("L'email ne peut pas être vide");
        }
        throw new Error(errorData.message || 'Données de profil invalides');

      case 401:
        throw new Error('Session expirée - Veuillez vous reconnecter');

      case 403:
        throw new Error('Accès refusé');

      case 404:
        throw new Error('Service temporairement indisponible');

      case 409:
        throw new Error(
          'Ces informations sont déjà utilisées par un autre compte'
        );

      case 429:
        throw new Error('Trop de tentatives - Veuillez réessayer plus tard');

      case 500:
        throw new Error('Erreur interne du serveur - Veuillez réessayer');

      default:
        throw new Error('Erreur lors de la mise à jour du profil');
    }
  }

  private async handleGetProfileError(response: Response): Promise<never> {
    switch (response.status) {
      case 401:
        throw new Error('Session expirée - Veuillez vous reconnecter');
      case 404:
        throw new Error('Profil non trouvé');
      default:
        throw new Error('Erreur lors de la récupération du profil');
    }
  }

  private async handlePasswordUpdateError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        if (
          errorData.message?.includes('Les mots de passe ne correspondent pas')
        ) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (
          errorData.message?.includes('doit contenir au moins 8 caractères')
        ) {
          throw new Error(
            'Le mot de passe doit contenir au moins 8 caractères'
          );
        }
        if (
          errorData.message?.includes('minuscule, une majuscule et un chiffre')
        ) {
          throw new Error(
            'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
          );
        }
        throw new Error(
          errorData.message || 'Données de mot de passe invalides'
        );

      case 401:
        if (
          errorData.message?.includes('Mot de passe actuel incorrect') ||
          errorData.message?.includes('Le mot de passe actuel est incorrect')
        ) {
          throw new Error('Le mot de passe actuel est incorrect');
        }
        throw new Error('Session expirée - Veuillez vous reconnecter');

      default:
        throw new Error('Erreur lors de la mise à jour du mot de passe');
    }
  }

  private handleApiError(error: any, context: string): never {
    console.error(`Erreur ${context}:`, error);

    if (
      error.name === 'TypeError' &&
      error.message.includes('Failed to fetch')
    ) {
      throw new Error('Erreur de connexion au serveur');
    }

    throw error;
  }

  // ==================== ✅ VALIDATIONS POUR FORMULAIRES ====================

  validateProfileBeforeSubmit(profileData: UserProfileData): {
    isValid: boolean;
    errors: ValidationErrors;
  } {
    const errors: ValidationErrors = {};
    let hasValidData = false;

    // ✅ LOGIQUE STRICTE CONFORME BACKEND
    if (profileData.email !== undefined) {
      const emailError = this.validateEmail(profileData.email);
      if (emailError) {
        errors.email = emailError;
      } else {
        hasValidData = true;
      }
    }

    if (profileData.telephone !== undefined) {
      const telephoneError = this.validateTelephone(profileData.telephone);
      if (telephoneError) {
        errors.telephone = telephoneError;
      } else {
        hasValidData = true;
      }
    }

    // ✅ MÊME RÈGLE QUE BACKEND : au moins un champ valide
    if (!hasValidData && Object.keys(errors).length === 0) {
      errors.email = 'Au moins un champ (email ou téléphone) doit être fourni';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  validatePasswordBeforeSubmit(passwordData: PasswordData): {
    isValid: boolean;
    errors: ValidationErrors;
  } {
    const errors: ValidationErrors = {};

    // ✅ VALIDATION STRICTE CONFORME BACKEND
    const currentPasswordError = this.validatePassword(
      passwordData.currentPassword,
      'currentPassword'
    );
    if (currentPasswordError) errors.currentPassword = currentPasswordError;

    const newPasswordError = this.validatePassword(
      passwordData.newPassword,
      'newPassword'
    );
    if (newPasswordError) errors.newPassword = newPasswordError;

    const confirmPasswordError = this.validatePassword(
      passwordData.confirmNewPassword,
      'confirmNewPassword'
    );
    if (confirmPasswordError) {
      errors.confirmNewPassword = confirmPasswordError;
    } else if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Les mots de passe ne correspondent pas';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // ==================== 🎯 FORMATAGE RÉPONSES ====================

  private formatUserResponse(userData: any): any {
    // ✅ STRUCTURE STRICTE CONFORME RÉPONSES BACKEND
    return {
      id: userData._id,
      email: userData.email,
      telephone: userData.telephone,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isActive: userData.isActive,
      isAdmin:
        userData.isAdmin !== undefined
          ? userData.isAdmin
          : userData.role === 'admin',
    };
  }
}

export const userProfileApi = new UserProfileApiService();
