import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { UserHeader, usePageConfig } from '../../components/user/UserHeader';
import { useAuth } from '../../context/AuthContext';
import { userProfileService, UserUpdateData, PasswordUpdateData } from '../../api/user/Profile/userProfileApi';
import { Loader2, Mail, Phone, Lock, Eye, EyeOff, CheckCircle, XCircle, Shield } from 'lucide-react';

const UserProfile = () => {
  const { user, updateProfile, fetchWithAuth } = useAuth();
  const pageConfig = usePageConfig();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
  
  // États pour les informations du profil
  const [profileData, setProfileData] = useState({
    email: '',
    telephone: '',
  });
  
  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  
  // États pour la sécurité
  const [securityInfo, setSecurityInfo] = useState({
    lastLogin: '',
    accountCreated: '',
    sessions: 0,
  });
  
  // États pour la visibilité des mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // États pour la validation
  const [emailError, setEmailError] = useState('');
  const [telephoneError, setTelephoneError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Charger les données du profil
  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await userProfileService.getCurrentUser({ fetchWithAuth });
      
      if (userData) {
        setProfileData({
          email: userData.email || '',
          telephone: userData.telephone || '',
        });
        
        // Simuler des données de sécurité (à remplacer par un vrai appel API si disponible)
        if (userData.createdAt) {
          setSecurityInfo(prev => ({
            ...prev,
            accountCreated: new Date(userData.createdAt!).toLocaleDateString('fr-FR'),
            lastLogin: new Date().toLocaleDateString('fr-FR'),
            sessions: 1,
          }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Impossible de charger les informations du profil');
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  // Rafraîchir les données
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadUserProfile();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('Profil actualisé');
  }, [loadUserProfile]);

  // Validation de l'email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailError(isValid ? '' : 'Email invalide');
    return isValid;
  };

  // Validation du téléphone
  const validateTelephone = (telephone: string): boolean => {
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    const isValid = phoneRegex.test(telephone) || telephone === '';
    setTelephoneError(isValid ? '' : 'Numéro de téléphone invalide');
    return isValid;
  };

  // Validation du mot de passe
  const validatePassword = (password: string): void => {
    const errors: string[] = [];
    let strength = 0;

    if (password.length < 8) {
      errors.push('8 caractères minimum');
    } else {
      strength++;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Une minuscule');
    } else {
      strength++;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Une majuscule');
    } else {
      strength++;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Un chiffre');
    } else {
      strength++;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Un caractère spécial');
    } else {
      strength++;
    }

    setPasswordErrors(errors);
    setPasswordStrength(strength);
  };

  // Gérer la soumission du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(profileData.email) || !validateTelephone(profileData.telephone)) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: UserUpdateData = {};
      
      if (profileData.email !== user?.email) {
        updateData.email = profileData.email;
      }
      
      if (profileData.telephone !== user?.telephone) {
        updateData.telephone = profileData.telephone;
      }

      if (Object.keys(updateData).length > 0) {
        await userProfileService.updateProfile({ fetchWithAuth }, updateData);
        await updateProfile(); // Mettre à jour le contexte
      } else {
        toast.info('Aucune modification détectée');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la soumission du mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordErrors.length > 0) {
      toast.error('Le mot de passe ne respecte pas les exigences de sécurité');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const passwordUpdateData: PasswordUpdateData = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      };

      await userProfileService.updatePassword({ fetchWithAuth }, passwordUpdateData);
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordErrors([]);
      setPasswordStrength(0);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  // Effet initial
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Indicateur de force du mot de passe
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-200';
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return 'Non défini';
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 3) return 'Moyen';
    return 'Fort';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16 pb-8">
      <UserHeader
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        pageTitle={pageConfig.pageTitle}
        description={pageConfig.description}
        isLoading={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="px-4 max-w-4xl mx-auto">
        {/* Onglets de navigation */}
        <div className="flex overflow-x-auto gap-1 mb-6 no-scrollbar">
          {[
            { id: 'profile', label: 'Informations', icon: Mail },
            { id: 'password', label: 'Mot de passe', icon: Lock },
            { id: 'security', label: 'Sécurité', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-sky-300 hover:bg-sky-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenu conditionnel */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-600" />
                Informations personnelles
              </h2>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="w-4 h-4" />
                      Adresse email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => {
                          setProfileData({ ...profileData, email: e.target.value });
                          validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(profileData.email)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          emailError ? 'border-red-300' : 'border-gray-300'
                        } focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all`}
                        placeholder="votre@email.com"
                      />
                      {emailError && (
                        <div className="absolute right-3 top-3">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={profileData.telephone}
                        onChange={(e) => {
                          setProfileData({ ...profileData, telephone: e.target.value });
                          validateTelephone(e.target.value);
                        }}
                        onBlur={() => validateTelephone(profileData.telephone)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          telephoneError ? 'border-red-300' : 'border-gray-300'
                        } focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all`}
                        placeholder="06 12 34 56 78"
                      />
                      {telephoneError && (
                        <div className="absolute right-3 top-3">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {telephoneError && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {telephoneError}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Format accepté: 0612345678 ou +33612345678
                    </p>
                  </div>

                  {/* Bouton de soumission */}
                  <button
                    type="submit"
                    disabled={isLoading || !!emailError || !!telephoneError}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </span>
                    ) : (
                      'Enregistrer les modifications'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-sky-600" />
                Changer le mot de passe
              </h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Mot de passe actuel */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Nouveau mot de passe */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        validatePassword(e.target.value);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Indicateur de force */}
                  {passwordData.newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Force du mot de passe
                        </span>
                        <span className={`text-sm font-medium ${
                          passwordStrength <= 2 ? 'text-red-600' :
                          passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Exigences */}
                  {passwordData.newPassword && (
                    <div className="space-y-1">
                      {[
                        { text: '8 caractères minimum', check: passwordData.newPassword.length >= 8 },
                        { text: 'Une lettre minuscule', check: /[a-z]/.test(passwordData.newPassword) },
                        { text: 'Une lettre majuscule', check: /[A-Z]/.test(passwordData.newPassword) },
                        { text: 'Un chiffre', check: /[0-9]/.test(passwordData.newPassword) },
                        { text: 'Un caractère spécial', check: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) },
                      ].map((req, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {req.check ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-sm ${req.check ? 'text-green-600' : 'text-gray-500'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmNewPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        passwordData.newPassword && passwordData.newPassword !== passwordData.confirmNewPassword
                          ? 'border-red-300'
                          : 'border-gray-300'
                      } focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {passwordData.newPassword && passwordData.newPassword !== passwordData.confirmNewPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isLoading || passwordErrors.length > 0 || passwordData.newPassword !== passwordData.confirmNewPassword}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Modification...
                    </span>
                  ) : (
                    'Changer le mot de passe'
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-600" />
                Sécurité du compte
              </h2>

              <div className="space-y-6">
                {/* Informations de connexion */}
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
                  <h3 className="font-medium text-gray-900 mb-3">Activité récente</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Dernière connexion</span>
                      <span className="text-sm font-medium text-gray-900">
                        {securityInfo.lastLogin || 'Non disponible'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Compte créé le</span>
                      <span className="text-sm font-medium text-gray-900">
                        {securityInfo.accountCreated || 'Non disponible'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sessions actives</span>
                      <span className="text-sm font-medium text-gray-900">
                        {securityInfo.sessions || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conseils de sécurité */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Conseils de sécurité</h3>
                  <div className="space-y-3">
                    {[
                      'Utilisez un mot de passe unique et complexe',
                      'Activez l\'authentification à deux facteurs si disponible',
                      'Ne partagez jamais vos identifiants',
                      'Déconnectez-vous des appareils publics',
                      'Vérifiez régulièrement votre activité de connexion',
                    ].map((tip, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions de sécurité */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter de tous les appareils ?')) {
                        // Implémenter la déconnexion globale
                        toast.info('Fonctionnalité à implémenter');
                      }
                    }}
                    className="w-full py-3 px-4 bg-white text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all duration-200 shadow-sm"
                  >
                    Déconnecter tous les appareils
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informations générales */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h3 className="font-medium text-gray-900 mb-3">Résumé du compte</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Nom complet</span>
              <span className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Statut</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                user?.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user?.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rôle</span>
              <span className="text-sm font-medium text-gray-900">
                {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;