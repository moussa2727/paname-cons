// UserProfile.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { UserHeader, usePageConfig } from '../../components/user/UserHeader';
import { useAuth } from '../../context/AuthContext';
import { userProfileService, UserUpdateData, AuthContextFunctions } from '../../api/user/Profile/userProfileApi';
import { Loader2, Mail, Phone, Calendar, Shield, User, UserCheck, Lock, Eye, EyeOff } from 'lucide-react';

const UserProfile = () => {
  const { user, updateProfile, fetchWithAuth, refreshToken, access_token } = useAuth();
  const pageConfig = usePageConfig();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // États pour les informations du profil
  const [profileData, setProfileData] = useState({
    email: '',
    telephone: '',
  });
  
  // États pour les informations de sécurité
  const [securityInfo, setSecurityInfo] = useState({
    lastLogin: '',
    accountCreated: '',
  });
  
  // États pour la validation
  const [emailError, setEmailError] = useState('');
  const [telephoneError, setTelephoneError] = useState('');

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Référence pour éviter les chargements multiples
  const isInitialLoad = useRef(false);

  // Créer l'objet authFunctions conforme à l'interface AuthContextFunctions
  const getAuthFunctions = useCallback((): AuthContextFunctions => {
    return {
      fetchWithAuth,
      refreshToken,
      access_token,
    };
  }, [fetchWithAuth, refreshToken, access_token]);

  // Validation de l'email (seulement si modifié)
  const validateEmail = (email: string): boolean => {
    if (!email || email.trim() === '') {
      setEmailError('L\'email ne peut pas être vide');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailError(isValid ? '' : 'Email invalide');
    return isValid;
  };

  // Validation du téléphone (accepter vide)
  const validateTelephone = (telephone: string): boolean => {
    if (!telephone || telephone.trim() === '') {
      setTelephoneError('');
      return true;
    }
    
    const phoneRegex = /^[+]?[0-9\s\-\(\)\.]{8,20}$/;
    const cleanedPhone = telephone.replace(/[\s\-\(\)\.]/g, '');
    const hasMinDigits = cleanedPhone.length >= 8;
    
    const isValid = phoneRegex.test(telephone) && hasMinDigits;
    setTelephoneError(isValid ? '' : 'Format invalide (min. 8 chiffres)');
    return isValid;
  };

  // Validation des mots de passe
  const validatePasswords = () => {
    let isValid = true;
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };

    // Vérification mot de passe actuel
    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
      isValid = false;
    }

    // Vérification correspondance nouveaux mots de passe
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    // Vérification longueur minimum
    if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
      isValid = false;
    }

    // Validation de complexité
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);

    if (passwordData.newPassword && (!hasLowerCase || !hasUpperCase || !hasNumber)) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
      isValid = false;
    }

    setPasswordErrors(newErrors);
    return isValid;
  };

  // Charger les données du profil
  const loadUserProfile = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const authFunctions = getAuthFunctions();
      const userData = await userProfileService.getCurrentUser(authFunctions);
      
      if (userData) {
        setProfileData({
          email: userData.email || '',
          telephone: userData.telephone || '',
        });
        
        if (userData.createdAt) {
          setSecurityInfo({
            accountCreated: new Date(userData.createdAt).toLocaleDateString('fr-FR'),
            lastLogin: new Date().toLocaleDateString('fr-FR'),
          });
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error);
      
      if (user) {
        setProfileData({
          email: user.email || '',
          telephone: user.telephone || '',
        });
      } else {
        toast.error('Impossible de charger les informations du profil');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAuthFunctions, user, isLoading]);

  // Rafraîchir les données
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await loadUserProfile();
      toast.success('Profil actualisé');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile, isRefreshing]);

  // Gérer la soumission du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔄 ===== DÉBUT SOUMISSION PROFIL =====");
    
    const isEmailValid = profileData.email !== user?.email 
      ? validateEmail(profileData.email) 
      : true;
    
    const isPhoneValid = profileData.telephone !== user?.telephone 
      ? validateTelephone(profileData.telephone) 
      : true;
    
    if (!isEmailValid || !isPhoneValid) {
      toast.error('Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    const hasEmailChanged = profileData.email !== user?.email;
    const hasTelephoneChanged = profileData.telephone !== user?.telephone;
    
    if (!hasEmailChanged && !hasTelephoneChanged) {
      toast.info('Aucune modification à enregistrer');
      return;
    }

    setIsLoading(true);
    
    try {
      const authFunctions = getAuthFunctions();
      const updateData: UserUpdateData = {};
      
      if (hasEmailChanged && profileData.email.trim() !== '') {
        updateData.email = profileData.email.trim();
      }
      
      if (hasTelephoneChanged) {
        updateData.telephone = profileData.telephone.trim();
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('Aucune modification à enregistrer');
        return;
      }

      const updatedUser = await userProfileService.updateProfile(authFunctions, updateData);
      
      setProfileData({
        email: updatedUser.email || '',
        telephone: updatedUser.telephone || '',
      });
      
      toast.success('Profil mis à jour avec succès');
      
    } catch (error: any) {
      console.error("❌ ERREUR lors de la mise à jour:", error);
      
      if (error.message !== 'SESSION_EXPIRED' &&
          !error.message.includes('L\'email ne peut pas être vide') &&
          !error.message.includes('Format d\'email invalide') &&
          !error.message.includes('Le téléphone doit contenir') &&
          !error.message.includes('Aucune donnée valide')) {
        toast.error(error.message || 'Erreur lors de la mise à jour du profil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la soumission du mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔄 ===== DÉBUT CHANGEMENT MOT DE PASSE =====");
    
    if (!validatePasswords()) {
      toast.error('Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    setIsPasswordLoading(true);
    
    try {
      const authFunctions = getAuthFunctions();
      const result = await userProfileService.updatePassword(authFunctions, {
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      
      toast.success('Mot de passe changé avec succès');
      
    } catch (error: any) {
      console.error("❌ Erreur changement mot de passe:", error);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Effet initial - charger les données une seule fois
  useEffect(() => {
    if (!isInitialLoad.current && user) {
      isInitialLoad.current = true;
      
      loadUserProfile();
      
      const timer = setTimeout(() => {
        if (!profileData.email && user) {
          setProfileData({
            email: user.email || '',
            telephone: user.telephone || '',
          });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, loadUserProfile, profileData.email]);

  // Synchroniser avec les données du contexte (fallback)
  useEffect(() => {
    if (user && !profileData.email) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
  }, [user, profileData.email]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-4 pb-8 md:pt-16">
      <UserHeader
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        pageTitle={pageConfig.pageTitle}
        description={pageConfig.description}
        isLoading={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="px-4 max-w-4xl mx-auto mt-4 md:mt-16 space-y-6 md:space-y-8">
        {/* Section principale du profil */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-600" />
              Informations personnelles
            </h2>

            {isLoading && !profileData.email ? (
              <div className="flex justify-center py-8 md:py-12">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-5 md:space-y-6">
                {/* Nom complet (lecture seule) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nom complet
                  </label>
                  <div className="px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 text-sm md:text-base">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <p className="text-xs text-gray-500">
                    Le nom complet ne peut pas être modifié ici
                  </p>
                </div>

                {/* Email - champ obligatoire */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4" />
                    Adresse email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => {
                        setProfileData({ ...profileData, email: e.target.value });
                        if (e.target.value !== user?.email) {
                          validateEmail(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (profileData.email !== user?.email) {
                          validateEmail(profileData.email);
                        }
                      }}
                      className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border text-sm md:text-base ${
                        emailError ? 'border-red-300' : 'border-gray-300'
                      } focus:border-sky-500 focus:ring-0 focus:outline-none transition-all`}
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Téléphone - champ optionnel */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4" />
                    Téléphone (optionnel)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={profileData.telephone}
                      onChange={(e) => {
                        setProfileData({ ...profileData, telephone: e.target.value });
                        if (e.target.value !== user?.telephone) {
                          validateTelephone(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (profileData.telephone !== user?.telephone) {
                          validateTelephone(profileData.telephone);
                        }
                      }}
                      className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border text-sm md:text-base ${
                        telephoneError ? 'border-red-300' : 'border-gray-300'
                      } focus:border-sky-500 focus:ring-0 focus:outline-none transition-all`}
                      placeholder="06 12 34 56 78 ou +33612345678"
                    />
                  </div>
                  {telephoneError && (
                    <p className="text-sm text-red-600">
                      {telephoneError}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Laisser vide pour supprimer votre numéro de téléphone
                  </p>
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 md:py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm md:text-base"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </span>
                  ) : (
                    'Mettre à jour mon profil'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Section changement de mot de passe */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-sky-600" />
              Changer mon mot de passe
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-5 md:space-y-6">
              {/* Mot de passe actuel */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                      }
                    }}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border text-sm md:text-base ${
                      passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                    } focus:border-sky-500 focus:ring-0 focus:outline-none transition-all pr-10`}
                    placeholder="Votre mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.currentPassword}</p>
                )}
              </div>

              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({ ...passwordErrors, newPassword: '' });
                      }
                      if (passwordData.confirmNewPassword) {
                        if (e.target.value !== passwordData.confirmNewPassword) {
                          setPasswordErrors({ ...passwordErrors, confirmNewPassword: 'Les mots de passe ne correspondent pas' });
                        } else {
                          setPasswordErrors({ ...passwordErrors, confirmNewPassword: '' });
                        }
                      }
                    }}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border text-sm md:text-base ${
                      passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                    } focus:border-sky-500 focus:ring-0 focus:outline-none transition-all pr-10`}
                    placeholder="Au moins 8 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.newPassword}</p>
                )}
                <p className="text-xs text-gray-500">
                  Min. 8 caractères, majuscule, minuscule et chiffre
                </p>
              </div>

              {/* Confirmation nouveau mot de passe */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmNewPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, confirmNewPassword: e.target.value });
                      if (passwordErrors.confirmNewPassword) {
                        setPasswordErrors({ ...passwordErrors, confirmNewPassword: '' });
                      }
                      if (passwordData.newPassword !== e.target.value) {
                        setPasswordErrors({ ...passwordErrors, confirmNewPassword: 'Les mots de passe ne correspondent pas' });
                      }
                    }}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border text-sm md:text-base ${
                      passwordErrors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
                    } focus:border-sky-500 focus:ring-0 focus:outline-none transition-all pr-10`}
                    placeholder="Retapez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.confirmNewPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isPasswordLoading}
                className="w-full py-2.5 md:py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm md:text-base"
              >
                {isPasswordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise à jour...
                  </span>
                ) : (
                  'Changer mon mot de passe'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Section informations de sécurité */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-600" />
              Sécurité du compte
            </h2>

            <div className="space-y-4">
              {/* Statut du compte */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-100">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    user?.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm md:text-base">Statut du compte</p>
                    <p className="text-sm text-gray-600">
                      {user?.isActive ? 'Actif' : 'Inactif'}
                    </p>
                  </div>
                </div>
                <UserCheck className="w-5 h-5 text-sky-600" />
              </div>

              {/* Dernière connexion */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm md:text-base">Dernière connexion</p>
                    <p className="text-sm text-gray-600">
                      {securityInfo.lastLogin || 'Aujourd\'hui'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date de création */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm md:text-base">Compte créé le</p>
                    <p className="text-sm text-gray-600">
                      {securityInfo.accountCreated || 'Non disponible'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conseils de sécurité */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-sm md:text-base">Conseils de sécurité</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Utilisez des mots de passe uniques et complexes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Ne partagez jamais vos identifiants de connexion
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Déconnectez-vous des appareils publics après utilisation
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer léger */}
      <div className="px-4 max-w-4xl mx-auto mt-6 md:mt-8">
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Votre Application. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default UserProfile;