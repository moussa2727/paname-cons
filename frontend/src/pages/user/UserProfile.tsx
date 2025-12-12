// UserProfile.tsx - VERSION SIMPLIFIÉE (même logique que RendezVous)
import { useState, useEffect, FormEvent, ChangeEvent, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
import { toast } from 'react-toastify';

// Composant de chargement
const LoadingScreen = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

const API_URL = import.meta.env.VITE_API_URL;

const UserProfile = () => {
  const { 
    user, 
    isAuthenticated, 
    access_token, 
    refreshToken, 
    logout,
    updateProfile 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Configuration des pages
  const pageConfigs = {
    '/mon-profil': {
      title: 'Mon Profil',
      subtitle: 'Gérez vos informations personnelles',
      pageTitle: 'Mon Profil - Paname Consulting',
      description: 'Gérez vos informations personnelles avec Paname Consulting'
    },
    '/mes-rendez-vous': {
      title: 'Mes Rendez-vous',
      subtitle: 'Consultez et gérez vos rendez-vous',
      pageTitle: 'Mes Rendez-vous - Paname Consulting',
      description: 'Consultez et gérez vos rendez-vous avec Paname Consulting'
    },
    '/ma-procedure': {
      title: 'Ma Procédure',
      subtitle: 'Suivez l\'avancement de votre dossier',
      pageTitle: 'Ma Procédure - Paname Consulting',
      description: 'Suivez l\'avancement de votre dossier avec Paname Consulting'
    },
  };

  // Onglets de navigation
  const navTabs = [
    {
      id: 'profile',
      label: 'Profil',
      to: '/mon-profil',
      icon: User,
    },
    {
      id: 'rendezvous',
      label: 'RDV',
      to: '/mes-rendez-vous',
      icon: Calendar,
    },
    {
      id: 'procedures',
      label: 'Dossier',
      to: '/ma-procedure',
      icon: FileText,
    },
  ];

  // Obtenir la configuration de la page actuelle
  const getCurrentPageConfig = () => {
    const currentPath = location.pathname;
    if (pageConfigs[currentPath as keyof typeof pageConfigs]) {
      return pageConfigs[currentPath as keyof typeof pageConfigs];
    }
    
    for (const [path, config] of Object.entries(pageConfigs)) {
      if (currentPath.startsWith(path)) {
        return config;
      }
    }
    
    return pageConfigs['/mon-profil'];
  };

  const currentPage = getCurrentPageConfig();
  const activeTabId = navTabs.find(tab => location.pathname.startsWith(tab.to))?.id || 'profile';

  // === VÉRIFICATION D'AUTHENTIFICATION SIMPLE ===
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour accéder à votre profil');
      navigate('/connexion', {
        state: {
          redirectTo: '/mon-profil',
          message: 'Connectez-vous pour gérer votre profil',
        },
      });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen message="Vérification de l'authentification..." />;
  }

  // États du formulaire
  const [profileData, setProfileData] = useState({
    email: user.email || '',
    telephone: user.telephone || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ==================== VALIDATIONS ====================
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, '');
    return /^\+?[1-9]\d{1,14}$/.test(cleanedPhone);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && 
           /[a-z]/.test(password) && 
           /[A-Z]/.test(password) && 
           /\d/.test(password);
  };

  // ==================== MISE À JOUR DU PROFIL ====================
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !access_token) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      logout();
      navigate('/connexion');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!validateEmail(profileData.email)) {
      newErrors.email = "Format d'email invalide";
    }
    
    if (profileData.telephone && !validatePhone(profileData.telephone)) {
      newErrors.telephone = "Format de téléphone invalide (ex: +22812345678)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Vérifier si des modifications ont été faites
    if (profileData.email === user.email && profileData.telephone === user.telephone) {
      toast.info('Aucune modification détectée');
      return;
    }

    setIsLoading(true);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/user/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: profileData.email.trim().toLowerCase(),
            telephone: profileData.telephone.trim(),
          }),
        });
      };

      let response = await makeRequest(access_token);

      // Gestion du token expiré
      if (response.status === 401) {
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            const currentToken = localStorage.getItem('access_token');
            if (currentToken) {
              response = await makeRequest(currentToken);
            } else {
              throw new Error('Session expirée');
            }
          } else {
            throw new Error('Session expirée');
          }
        } catch (error) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
          navigate('/connexion');
          return;
        }
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la mise à jour du profil';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          if (errorMessage.includes('Email déjà utilisé')) {
            toast.error('Cet email est déjà utilisé par un autre compte');
            return;
          }
          
          toast.error(errorMessage);
          return;
        } catch {
          toast.error('Erreur serveur. Veuillez réessayer.');
          return;
        }
      }

      const result = await response.json();
      
      // Mettre à jour le contexte
      await updateProfile();
      
      setErrors({});
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== MISE À JOUR DU MOT DE PASSE ====================
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !access_token) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      logout();
      navigate('/connexion');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
    }
    
    if (!validatePassword(passwordData.newPassword)) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre';
    }
    
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Les mots de passe ne correspondent pas';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/user/change-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        });
      };

      let response = await makeRequest(access_token);

      // Gestion du token expiré
      if (response.status === 401) {
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            const currentToken = localStorage.getItem('access_token');
            if (currentToken) {
              response = await makeRequest(currentToken);
            } else {
              throw new Error('Session expirée');
            }
          } else {
            throw new Error('Session expirée');
          }
        } catch (error) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
          navigate('/connexion');
          return;
        }
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors du changement de mot de passe';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          if (errorMessage.includes('Mot de passe actuel incorrect')) {
            toast.error('Le mot de passe actuel est incorrect');
            return;
          }
          
          toast.error(errorMessage);
          return;
        } catch {
          toast.error('Erreur serveur. Veuillez réessayer.');
          return;
        }
      }

      const result = await response.json();
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      
      setErrors({});
      toast.success('Mot de passe modifié avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== GESTION DES CHANGEMENTS ====================
  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ==================== RECHARGEMENT DES DONNÉES ====================
  const refreshUserData = async () => {
    if (!isAuthenticated || !access_token) return;
    
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
  // ... (le reste du rendu est identique au composant original UserProfile.tsx)
  // Gardez le même JSX que dans votre composant UserProfile.tsx original

  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name="description" content={currentPage.description} />
      </Helmet>

      {/* Header fixe */}
      <header 
        ref={headerRef} 
        className='bg-white shadow-lg border-b border-gray-100 fixed top-0 left-0 right-0 z-50'
      >
        <div className='px-4 py-3'>
          {/* Barre supérieure */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => navigate('/')}
                className='p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200'
                title="Retour à l'accueil"
                aria-label="Retour à l'accueil"
              >
                <Home className='w-4 h-4 text-sky-600' />
              </button>
              <div className='flex flex-col'>
                <h1 className='text-base font-bold text-gray-900 leading-tight'>
                  {currentPage.title}
                </h1>
                <p className='text-xs text-gray-500'>
                  {currentPage.subtitle}
                </p>
              </div>
            </div>
            
            <button
              onClick={refreshUserData}
              disabled={isLoading}
              className='p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200 disabled:opacity-50'
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 text-sky-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <div className='overflow-x-auto pb-1 no-scrollbar'>
            <nav className='flex gap-1.5 min-w-max'>
              {navTabs.map(tab => {
                const isActive = activeTabId === tab.id;
                return (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 flex-shrink-0 relative ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-sky-300 hover:bg-sky-50 active:scale-95'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-gray-700'
                    }`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-sky-400 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Indicateur de statut */}
          <div className='mt-2 pt-2 border-t border-gray-100'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <div className='w-1.5 h-1.5 bg-emerald-500 rounded-full'></div>
                <span className='text-xs text-gray-600'>
                  Connecté: {user?.email}
                </span>
              </div>
              <span className='text-xs text-gray-500'>
                {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Effet de séparation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-100 to-transparent"></div>
      </header>

      {/* Contenu principal avec padding pour compenser le header fixe */}
      <div 
        className="min-h-screen bg-gradient-to-b from-sky-50 to-white"
        style={{ paddingTop: headerRef.current ? `${headerRef.current.offsetHeight}px` : '80px' }}
      >
        <div className='py-8 px-4 sm:px-6 lg:px-8'>
          <div className='max-w-4xl mx-auto'>
            {/* En-tête avec informations utilisateur */}
            <div className='text-center mb-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4'>
                <User className='w-8 h-8 text-sky-600' />
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
                      ? 'bg-sky-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-sky-600 hover:bg-sky-50'
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
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-sky-600 focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='votre@email.com'
                        />
                      </div>
                      {errors.email && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {errors.email}
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
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-sky-600 focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.telephone ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='+33 1 23 45 67 89'
                        />
                      </div>
                      {errors.telephone && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {errors.telephone}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3 pt-6 border-t border-gray-200'>
                      <button
                        type='button'
                        onClick={() => {
                          setProfileData({
                            email: user.email || '',
                            telephone: user.telephone || '',
                          });
                          setErrors({});
                        }}
                        disabled={isLoading || (profileData.email === user.email && profileData.telephone === user.telephone)}
                        className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                      >
                        Annuler
                      </button>
                      <button
                        type='submit'
                        disabled={
                          isLoading ||
                          (profileData.email === user.email && profileData.telephone === user.telephone) ||
                          !!errors.email ||
                          !!errors.telephone
                        }
                        className='flex-1 px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2'
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
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-sky-600 focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.currentPassword ? 'border-red-300' : 'border-gray-300'
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
                      {errors.currentPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {errors.currentPassword}
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
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-sky-600 focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.newPassword ? 'border-red-300' : 'border-gray-300'
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
                      {errors.newPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {errors.newPassword}
                        </p>
                      )}
                      {passwordData.newPassword && (
                        <div className='mt-2'>
                          <div className='flex gap-1'>
                            {[1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`flex-1 h-1 rounded-full ${
                                  validatePassword(passwordData.newPassword)
                                    ? 'bg-green-500'
                                    : i <= Math.min(passwordData.newPassword.length / 2, 4)
                                    ? 'bg-yellow-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className='mt-1 text-xs text-gray-500'>
                            Doit contenir 8+ caractères, majuscule, minuscule, chiffre
                          </p>
                        </div>
                      )}
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
                          className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-sky-600 focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
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
                      {errors.confirmNewPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {errors.confirmNewPassword}
                        </p>
                      )}
                      {passwordData.newPassword &&
                        passwordData.confirmNewPassword &&
                        passwordData.newPassword === passwordData.confirmNewPassword &&
                        !errors.confirmNewPassword && (
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
                        onClick={() => {
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmNewPassword: '',
                          });
                          setErrors({});
                        }}
                        disabled={isLoading || (!passwordData.currentPassword && !passwordData.newPassword && !passwordData.confirmNewPassword)}
                        className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                      >
                        Annuler
                      </button>
                      <button
                        type='submit'
                        disabled={
                          isLoading ||
                          !passwordData.currentPassword ||
                          !passwordData.newPassword ||
                          !passwordData.confirmNewPassword ||
                          !!errors.currentPassword ||
                          !!errors.newPassword ||
                          !!errors.confirmNewPassword
                        }
                        className='flex-1 px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2'
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
                  <div className='mt-8 p-4 bg-sky-50 border border-sky-200 rounded-xl'>
                    <h3 className='text-sm font-semibold text-sky-800 mb-2'>
                      Conseils de sécurité
                    </h3>
                    <ul className='text-sm text-sky-700 space-y-1'>
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