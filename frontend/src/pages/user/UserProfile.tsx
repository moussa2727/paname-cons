import { useState, useEffect, FormEvent, FC, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  FileText,
  Calendar,
  Home,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { userProfileService } from '../../api/user/Profile/userProfileApi';
import { toast } from 'react-toastify';

/* global fetch */

const UserProfile = () => {
  const { 
    user, 
    access_token, 
    isAuthenticated, 
    logout, 
    updateProfile, 
    isLoading: authLoading 
  } = useAuth();
  const navigate = useNavigate();

  // États optimisés avec useMemo
  const initialProfileData = useMemo(() => ({
    email: user?.email || '',
    telephone: user?.telephone || '',
  }), [user?.email, user?.telephone]);

  const initialPasswordData = useMemo(() => ({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  }), []);

  const [profileData, setProfileData] = useState(initialProfileData);
  const [passwordData, setPasswordData] = useState(initialPasswordData);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Gestion des erreurs et états touchés
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});

  // ==================== VÉRIFICATION D'ACCÈS ====================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }

    if (user && !user.isActive) {
      logout();
      return;
    }
  }, [isAuthenticated, user, navigate, logout]);

  // ==================== SYNC DES DONNÉES AVEC LE CONTEXTE ====================
  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
  }, [user]);

  // ==================== VALIDATIONS ====================
  const validateProfileField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Format d'email invalide";
        }
        break;
      case 'telephone':
        if (value && value.trim().length < 5) {
          return 'Le téléphone doit contenir au moins 5 caractères';
        }
        break;
      default:
        return '';
    }
    return '';
  }, []);

  const validatePasswordField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'currentPassword':
        if (!value.trim()) return 'Le mot de passe actuel est requis';
        break;
      case 'newPassword':
        if (!value.trim()) return 'Le nouveau mot de passe est requis';
        if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
        }
        break;
      case 'confirmNewPassword':
        if (!value.trim()) return 'La confirmation du mot de passe est requise';
        if (value !== passwordData.newPassword) return 'Les mots de passe ne correspondent pas';
        break;
      default:
        return '';
    }
    return '';
  }, [passwordData.newPassword]);

  // ==================== GESTION DES CHANGEMENTS ====================
  const handleProfileChange = useCallback((field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setProfileTouched(prev => ({ ...prev, [field]: true }));

    const error = validateProfileField(field, value);
    setProfileErrors(prev => ({ ...prev, [field]: error }));
  }, [validateProfileField]);

  const handlePasswordChange = useCallback((field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordTouched(prev => ({ ...prev, [field]: true }));

    const error = validatePasswordField(field, value);
    setPasswordErrors(prev => ({ ...prev, [field]: error }));
  }, [validatePasswordField]);

  // ==================== GESTION DU PROFIL ====================
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!access_token || !user) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    // Validation
    const errors: Record<string, string> = {};
    let hasValidData = false;

    if (profileData.email !== undefined && profileData.email.trim() !== '') {
      hasValidData = true;
      const emailError = validateProfileField('email', profileData.email);
      if (emailError) errors.email = emailError;
    }

    if (profileData.telephone !== undefined && profileData.telephone.trim() !== '') {
      hasValidData = true;
      const telephoneError = validateProfileField('telephone', profileData.telephone);
      if (telephoneError) errors.telephone = telephoneError;
    }

    if (!hasValidData) {
      errors.email = 'Au moins un champ (email ou téléphone) doit être modifié';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    if (!hasProfileChanges()) {
      toast.info('Aucune modification détectée');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ UTILISATION OPTIMISÉE DU SERVICE API
      const updatedUser = await userProfileService.updateProfile(access_token, {
        email: profileData.email,
        telephone: profileData.telephone,
      });

      // ✅ MISE À JOUR DU CONTEXTE AUTH
      await updateProfile();
      
      // ✅ MISE À JOUR LOCALE DES DONNÉES
      setProfileData({
        email: updatedUser.email || user.email,
        telephone: updatedUser.telephone || user.telephone,
      });

      setProfileTouched({});
      setProfileErrors({});

      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      const err = error as Error;
      
      if (err.message.includes('Session expirée') || err.message.includes('401')) {
        toast.error('Session expirée, redirection...');
        setTimeout(() => logout(), 2000);
      } else {
        toast.error(err.message || 'Erreur lors de la mise à jour du profil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== GESTION DU MOT DE PASSE ====================
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!access_token) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    // Validation
    const errors: Record<string, string> = {};
    Object.keys(passwordData).forEach(key => {
      const error = validatePasswordField(
        key,
        passwordData[key as keyof typeof passwordData]
      );
      if (error) errors[key] = error;
    });

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // ✅ UTILISATION DU SERVICE API POUR LE MOT DE PASSE
      const result = await userProfileService.updatePassword(access_token, passwordData);

      if (result.success) {
        setPasswordData(initialPasswordData);
        setPasswordTouched({});
        setPasswordErrors({});
        
        toast.success(result.message || 'Mot de passe modifié avec succès');
      }
    } catch (error) {
      const err = error as Error;
      
      if (err.message.includes('Session expirée') || err.message.includes('401')) {
        toast.error('Session expirée, redirection...');
        setTimeout(() => logout(), 2000);
      } else {
        toast.error(err.message || 'Erreur lors de la modification du mot de passe');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== FONCTIONS UTILITAIRES ====================
  const resetProfileForm = useCallback(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
    setProfileErrors({});
    setProfileTouched({});
  }, [user]);

  const resetPasswordForm = useCallback(() => {
    setPasswordData(initialPasswordData);
    setPasswordErrors({});
    setPasswordTouched({});
  }, [initialPasswordData]);

  const hasProfileChanges = useCallback(() => {
    if (!user) return false;
    return (
      profileData.email !== user.email ||
      profileData.telephone !== user.telephone
    );
  }, [user, profileData.email, profileData.telephone]);

  const isPasswordFormEmpty = useCallback(() => {
    return (
      !passwordData.currentPassword &&
      !passwordData.newPassword &&
      !passwordData.confirmNewPassword
    );
  }, [passwordData]);

  // ==================== COMPOSANT INTERNE ====================
  interface PasswordStrengthIndicatorProps {
    password: string;
  }

  const PasswordStrengthIndicator: FC<PasswordStrengthIndicatorProps> = ({ password }) => {
    if (!password) return null;

    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;

    return (
      <div className='mt-2 space-y-1'>
        <div className='flex items-center gap-2 text-xs'>
          <div className={`w-2 h-2 rounded-full ${strength >= 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={checks.length ? 'text-green-600' : 'text-gray-500'}>
            8 caractères minimum
          </span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <div className={`w-2 h-2 rounded-full ${strength >= 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={checks.lowercase && checks.uppercase ? 'text-green-600' : 'text-gray-500'}>
            Minuscule et majuscule
          </span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <div className={`w-2 h-2 rounded-full ${strength >= 3 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={checks.number ? 'text-green-600' : 'text-gray-500'}>
            Au moins un chiffre
          </span>
        </div>
      </div>
    );
  };

  // ==================== FONCTION DE RECHARGEMENT ====================
  const refreshUserData = async () => {
    if (!access_token) return;
    
    setIsLoading(true);
    try {
      await updateProfile();
      toast.success('Données utilisateur rafraîchies');
    } catch (error) {
      toast.error('Erreur lors du rafraîchissement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== RENDERING ====================
  if (!isAuthenticated || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Votre Profil utilisateur - Paname Consulting</title>
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
        <meta name='yandexbot' content='noindex, nofollow' />
        <meta name='duckduckbot' content='noindex, nofollow' />
        <meta name='baidu' content='noindex, nofollow' />
        <meta name='naver' content='noindex, nofollow' />
        <meta name='seznam' content='noindex, nofollow' />
      </Helmet>
      
      <div className='min-h-screen bg-gray-50'>
        {/* Header avec bouton de rafraîchissement */}
        <header className='bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50'>
          <div className='px-4 py-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <button
                  onClick={() => navigate('/')}
                  className='p-2 hover:bg-gray-100 rounded-xl transition-colors'
                  title="Retour à l'accueil"
                >
                  <Home className='w-5 h-5 text-gray-600' />
                </button>
                <h1 className='text-lg font-semibold text-gray-800'>
                  Mon Profil
                </h1>
              </div>
              <button
                onClick={refreshUserData}
                disabled={isLoading}
                className='p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50'
                title="Rafraîchir les données"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Navigation */}
            <div className='mt-3'>
              <nav className='flex space-x-1'>
                {[
                  {
                    id: 'profile',
                    label: 'Profil',
                    to: '/user-profile',
                    icon: User,
                    active: true,
                  },
                  {
                    id: 'rendezvous',
                    label: 'Rendez-vous',
                    to: '/user-rendez-vous',
                    icon: Calendar,
                  },
                  {
                    id: 'procedures',
                    label: 'Procédures',
                    to: '/user-procedure',
                    icon: FileText,
                  },
                ].map(tab => (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab.active
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    <tab.icon className='w-4 h-4' />
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <div className='py-8 px-4 sm:px-6 lg:px-8'>
          <div className='max-w-4xl mx-auto'>
            {/* En-tête avec informations utilisateur */}
            <div className='text-center mb-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4'>
                <User className='w-8 h-8 text-blue-600' />
              </div>
              <h1 className='text-2xl font-bold text-gray-800 mb-2'>
                Bonjour, {user?.firstName} {user?.lastName}
              </h1>
              <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
                Gérez vos informations personnelles et votre sécurité
              </p>
              <div className='mt-4 inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full'>
                <Mail className='w-4 h-4' />
                <span>{user?.email}</span>
                {user?.telephone && (
                  <>
                    <span className='mx-2'>•</span>
                    <Phone className='w-4 h-4' />
                    <span>{user.telephone}</span>
                  </>
                )}
              </div>
            </div>

            {/* Navigation des onglets */}
            <div className='flex space-x-1 mb-8 bg-white p-1 rounded-2xl shadow-sm border border-gray-200'>
              {[
                {
                  id: 'profile',
                  label: 'Informations personnelles',
                  icon: User,
                },
                { id: 'password', label: 'Sécurité', icon: Lock },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'profile' | 'password')}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all flex-1 ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  disabled={isLoading}
                >
                  <tab.icon className='w-4 h-4' />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu des onglets */}
            <div className='bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200'>
              {/* Informations personnelles */}
              {activeTab === 'profile' && (
                <div className='p-8'>
                  <div className='mb-8'>
                    <h2 className='text-2xl font-bold text-gray-800 mb-2'>
                      Informations personnelles
                    </h2>
                    <p className='text-gray-600'>
                      Mettez à jour votre adresse email et votre numéro de téléphone
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit} className='space-y-6'>
                    {/* Champ Email */}
                    <div>
                      <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
                        Adresse email
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Mail className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          type='email'
                          id='email'
                          value={profileData.email}
                          onChange={e => handleProfileChange('email', e.target.value)}
                          disabled={isLoading}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            profileErrors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='votre@email.com'
                        />
                      </div>
                      {profileTouched.email && profileErrors.email && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {profileErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Champ Téléphone */}
                    <div>
                      <label htmlFor='telephone' className='block text-sm font-medium text-gray-700 mb-2'>
                        Numéro de téléphone
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Phone className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          type='tel'
                          id='telephone'
                          value={profileData.telephone}
                          onChange={e => handleProfileChange('telephone', e.target.value)}
                          disabled={isLoading}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            profileErrors.telephone ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='+33 1 23 45 67 89'
                        />
                      </div>
                      {profileTouched.telephone && profileErrors.telephone && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {profileErrors.telephone}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3 pt-6 border-t border-gray-200'>
                      <button
                        type='button'
                        onClick={resetProfileForm}
                        disabled={!hasProfileChanges() || isLoading}
                        className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                      >
                        Annuler
                      </button>
                      <button
                        type='submit'
                        disabled={
                          !hasProfileChanges() ||
                          isLoading ||
                          Object.keys(profileErrors).some(key => profileErrors[key])
                        }
                        className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2'
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Mise à jour...
                          </>
                        ) : (
                          'Enregistrer les modifications'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sécurité - Mot de passe */}
              {activeTab === 'password' && (
                <div className='p-8'>
                  <div className='mb-8'>
                    <h2 className='text-2xl font-bold text-gray-800 mb-2'>
                      Sécurité du compte
                    </h2>
                    <p className='text-gray-600'>
                      Modifiez votre mot de passe pour renforcer la sécurité de votre compte
                    </p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className='space-y-6'>
                    {/* Mot de passe actuel */}
                    <div>
                      <label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                        Mot de passe actuel
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Lock className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          id='currentPassword'
                          value={passwordData.currentPassword}
                          onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                          disabled={isLoading}
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='Votre mot de passe actuel'
                        />
                        <button
                          type='button'
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50'
                          disabled={isLoading}
                        >
                          {showCurrentPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                        </button>
                      </div>
                      {passwordTouched.currentPassword && passwordErrors.currentPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.currentPassword}
                        </p>
                      )}
                    </div>

                    {/* Nouveau mot de passe */}
                    <div>
                      <label htmlFor='newPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                        Nouveau mot de passe
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Lock className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id='newPassword'
                          value={passwordData.newPassword}
                          onChange={e => handlePasswordChange('newPassword', e.target.value)}
                          disabled={isLoading}
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='Votre nouveau mot de passe'
                        />
                        <button
                          type='button'
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50'
                          disabled={isLoading}
                        >
                          {showNewPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                        </button>
                      </div>
                      {passwordTouched.newPassword && passwordErrors.newPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.newPassword}
                        </p>
                      )}
                      <PasswordStrengthIndicator password={passwordData.newPassword} />
                    </div>

                    {/* Confirmation */}
                    <div>
                      <label htmlFor='confirmNewPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Lock className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id='confirmNewPassword'
                          value={passwordData.confirmNewPassword}
                          onChange={e => handlePasswordChange('confirmNewPassword', e.target.value)}
                          disabled={isLoading}
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            passwordErrors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='Confirmez votre nouveau mot de passe'
                        />
                        <button
                          type='button'
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50'
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                        </button>
                      </div>
                      {passwordTouched.confirmNewPassword && passwordErrors.confirmNewPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.confirmNewPassword}
                        </p>
                      )}
                      {passwordTouched.confirmNewPassword &&
                        passwordData.newPassword &&
                        passwordData.confirmNewPassword &&
                        passwordData.newPassword === passwordData.confirmNewPassword && (
                          <p className='mt-2 text-sm text-green-600 flex items-center gap-1'>
                            <CheckCircle className='w-4 h-4' />
                            Les mots de passe correspondent
                          </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3 pt-6 border-t border-gray-200'>
                      <button
                        type='button'
                        onClick={resetPasswordForm}
                        disabled={isPasswordFormEmpty() || isLoading}
                        className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                      >
                        Annuler
                      </button>
                      <button
                        type='submit'
                        disabled={
                          isPasswordFormEmpty() ||
                          isLoading ||
                          Object.keys(passwordErrors).some(key => passwordErrors[key])
                        }
                        className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2'
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Mise à jour...
                          </>
                        ) : (
                          'Modifier le mot de passe'
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Conseils de sécurité */}
                  <div className='mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl'>
                    <h3 className='text-sm font-semibold text-blue-800 mb-2'>
                      Conseils de sécurité
                    </h3>
                    <ul className='text-sm text-blue-700 space-y-1'>
                      <li>• Utilisez un mot de passe unique et complexe</li>
                      <li>• Évitez les mots de passe que vous utilisez sur d'autres sites</li>
                      <li>• Changez régulièrement votre mot de passe</li>
                      <li>• Ne partagez jamais votre mot de passe</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;