// UserProfile.tsx - VERSION SIMPLIFIÉE
import { useState, useEffect, FormEvent, useRef } from 'react';
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
import { userProfileService, type AuthFunctions } from '../../api/user/Profile/userProfileApi';
import { toast } from 'react-toastify';

// Configuration commune
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

const UserProfile = () => {
  const { 
    user, 
    updateProfile, 
    isLoading: authLoading,
    fetchWithAuth,
    isAuthenticated
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // === VÉRIFICATION SIMPLE D'AUTHENTIFICATION ===
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    navigate('/connexion');
    return null;
  }

  // États simplifiés
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    telephone: user?.telephone || '',
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

  // === UTILITAIRES ===
  const getCurrentPageConfig = () => {
    const currentPath = location.pathname;
    for (const [path, config] of Object.entries(pageConfigs)) {
      if (currentPath.startsWith(path)) return config;
    }
    return pageConfigs['/mon-profil'];
  };

  const currentPage = getCurrentPageConfig();
  const activeTabId = navTabs.find(tab => location.pathname.startsWith(tab.to))?.id || 'profile';

  // === EFFETS ===
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
  }, [user]);

  // === VALIDATIONS SIMPLES ===
  const validateProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = "Format d'email invalide";
    }
    
    if (profileData.telephone && profileData.telephone.trim().length < 5) {
      newErrors.telephone = 'Le téléphone doit contenir au moins 5 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (!passwordData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'La confirmation est requise';
    } else if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === GESTION DES FORMULAIRES ===
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) return;
    
    setIsLoading(true);
    
    try {
      const authFunctions: AuthFunctions = { fetchWithAuth };
      await userProfileService.updateProfile(authFunctions, profileData);
      
      await updateProfile();
      toast.success('Profil mis à jour avec succès');
      
      // Réinitialiser les erreurs
      setErrors({});
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setIsLoading(true);
    
    try {
      const authFunctions: AuthFunctions = { fetchWithAuth };
      const result = await userProfileService.updatePassword(authFunctions, passwordData);
      
      if (result.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        toast.success(result.message || 'Mot de passe modifié avec succès');
        setErrors({});
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // === RENDU ===
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
              onClick={updateProfile}
              disabled={isLoading}
              className='p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200 disabled:opacity-50'
              title="Actualiser"
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
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-700'}`}>
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div 
        className="min-h-screen bg-gradient-to-b from-sky-50 to-white"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        <div className='py-8 px-4'>
          <div className='max-w-4xl mx-auto'>
            {/* En-tête */}
            <div className='text-center mb-8'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4'>
                <User className='w-8 h-8 text-sky-600' />
              </div>
              <h1 className='text-2xl font-bold text-gray-800 mb-2'>
                Bonjour, {user.firstName} {user.lastName}
              </h1>
              <div className='inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full'>
                <Mail className='w-4 h-4' />
                <span>{user.email}</span>
              </div>
            </div>

            {/* Navigation des onglets */}
            <div className='flex space-x-1 mb-6'>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'bg-sky-500 text-white'
                    : 'text-gray-600 hover:bg-sky-50'
                }`}
              >
                Informations personnelles
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium ${
                  activeTab === 'password'
                    ? 'bg-sky-500 text-white'
                    : 'text-gray-600 hover:bg-sky-50'
                }`}
              >
                Sécurité
              </button>
            </div>

            {/* Contenu des onglets */}
            <div className='bg-white rounded-2xl shadow-sm p-6'>
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Adresse email
                    </label>
                    <input
                      type='email'
                      value={profileData.email}
                      onChange={e => setProfileData({...profileData, email: e.target.value})}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent'
                    />
                    {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email}</p>}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Téléphone
                    </label>
                    <input
                      type='tel'
                      value={profileData.telephone}
                      onChange={e => setProfileData({...profileData, telephone: e.target.value})}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent'
                    />
                    {errors.telephone && <p className='text-red-500 text-sm mt-1'>{errors.telephone}</p>}
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading}
                    className='w-full px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50'
                  >
                    {isLoading ? 'Mise à jour...' : 'Enregistrer'}
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Mot de passe actuel
                    </label>
                    <div className='relative'>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-10'
                      />
                      <button
                        type='button'
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2'
                      >
                        {showCurrentPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                    </div>
                    {errors.currentPassword && <p className='text-red-500 text-sm mt-1'>{errors.currentPassword}</p>}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Nouveau mot de passe
                    </label>
                    <div className='relative'>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-10'
                      />
                      <button
                        type='button'
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2'
                      >
                        {showNewPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                    </div>
                    {errors.newPassword && <p className='text-red-500 text-sm mt-1'>{errors.newPassword}</p>}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Confirmer le mot de passe
                    </label>
                    <div className='relative'>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmNewPassword}
                        onChange={e => setPasswordData({...passwordData, confirmNewPassword: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-10'
                      />
                      <button
                        type='button'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2'
                      >
                        {showConfirmPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                    </div>
                    {errors.confirmNewPassword && <p className='text-red-500 text-sm mt-1'>{errors.confirmNewPassword}</p>}
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading}
                    className='w-full px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50'
                  >
                    {isLoading ? 'Modification...' : 'Modifier le mot de passe'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;