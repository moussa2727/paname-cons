import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Users,
  User,
  Calendar,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings2,
  AlertTriangle,
  CheckCircle,
  Shield,
  UserCheck,
  Clock,
  BarChart3,
  LogOut as LogOutIcon,
  UserX,
  Users as UsersIcon,
  Wrench
} from 'lucide-react';
import { toast } from 'react-toastify';

interface AdminSidebarProps {
  children: React.ReactNode;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ children }) => {
  const { logout, logoutAll, user, isMaintenanceMode, toggleMaintenanceMode, checkMaintenanceStatus } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutAllOpen, setIsLogoutAllOpen] = useState(false);
  const [isLogoutAllLoading, setIsLogoutAllLoading] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [logoutAllResult, setLogoutAllResult] = useState<{
    success: boolean;
    message: string;
    stats?: any;
  } | null>(null);
  const [showMaintenanceToggle, setShowMaintenanceToggle] = useState(false);

  // Détection précise des tailles d'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;

      if (mobile) {
        setIsCollapsed(false);
      } else if (tablet) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Vérifier le statut maintenance au montage
  useEffect(() => {
    if (user?.role === 'admin') {
      checkMaintenanceStatus();
    }
  }, [user, checkMaintenanceStatus]);

  const menuItems = [
    {
      name: 'Tableau de bord',
      path: '/gestionnaire/statistiques',
      icon: <LayoutDashboard className='w-5 h-5' />,
      basePath: '/gestionnaire/statistiques',
    },
    {
      name: 'Utilisateurs',
      path: '/gestionnaire/utilisateurs',
      icon: <Users className='w-5 h-5' />,
      basePath: '/gestionnaire/utilisateurs',
    },
    {
      name: 'Messages',
      path: '/gestionnaire/messages',
      icon: <MessageSquare className='w-5 h-5' />,
      basePath: '/gestionnaire/messages',
    },
    {
      name: 'Rendez-vous',
      path: '/gestionnaire/rendez-vous',
      icon: <Calendar className='w-5 h-5' />,
      basePath: '/gestionnaire/rendez-vous',
    },
    {
      name: 'Procédures',
      path: '/gestionnaire/procedures',
      icon: <FileText className='w-5 h-5' />,
      basePath: '/gestionnaire/procedures',
    },
    {
      name: 'Destinations',
      path: '/gestionnaire/destinations',
      icon: <MapPin className='w-5 h-5' />,
      basePath: '/gestionnaire/destinations',
    },
    {
      name: 'Mon Profil',
      path: '/gestionnaire/profil',
      icon: <User className='w-5 h-5' />,
      basePath: '/gestionnaire/profil',
    },
  ];

  const isActivePath = (basePath: string): boolean => {
    const currentPath = location.pathname;

    if (basePath === '/gestionnaire') {
      return (
        currentPath === '/gestionnaire' ||
        currentPath.startsWith('/gestionnaire/statistiques') ||
        (currentPath.startsWith('/gestionnaire/') &&
          !menuItems.some(
            item =>
              item.basePath !== '/gestionnaire' &&
              currentPath.startsWith(item.basePath)
          ))
      );
    }

    return currentPath.startsWith(basePath);
  };

  const getDisplayName = (): string => {
    if (!user) return 'Administrateur';

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];

    return 'Administrateur';
  };

  const getNameInitial = (): string => {
    const displayName = getDisplayName();
    return displayName.charAt(0).toUpperCase();
  };

  const handleLogout = () => {
    logout();
  };

  const handleLogoutAll = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Accès non autorisé - Admin seulement', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    setIsLogoutAllLoading(true);
    setLogoutAllResult(null);

    try {
      const result = await logoutAll();

      setLogoutAllResult({
        success: true,
        message: result.message,
        stats: result.stats,
      });

      setIsLogoutAllLoading(false);

      const autoCloseTimer = setTimeout(() => {
        setIsLogoutAllOpen(false);
        setTimeout(() => setLogoutAllResult(null), 300);
      }, 4000);

      return () => clearTimeout(autoCloseTimer);

    } catch (error: any) {
      console.error('Erreur lors de la déconnexion globale:', error);
      
      const errorMessage = error.message || 'Erreur lors de la déconnexion globale';
      
      setLogoutAllResult({
        success: false,
        message: `Échec: ${errorMessage}`,
      });

      setIsLogoutAllLoading(false);
      
      setTimeout(() => {
        setIsLogoutAllOpen(false);
        setTimeout(() => setLogoutAllResult(null), 300);
      }, 3000);
    }
  };

  const handleMaintenanceToggle = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Accès non autorisé', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    setIsMaintenanceLoading(true);
    try {
      const success = await toggleMaintenanceMode(!isMaintenanceMode);
      if (success) {
        // Rafraîchir le statut
        await checkMaintenanceStatus();
      }
    } catch (error) {
      console.error('Erreur lors du changement du mode maintenance:', error);
    } finally {
      setIsMaintenanceLoading(false);
      setShowMaintenanceToggle(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const formatLogoutDuration = (duration: string): string => {
    if (duration.includes('heure')) return duration;
    if (duration.includes('hour')) return duration.replace('hour', 'heure');
    if (duration.includes('h')) return `${duration} heures`;
    return duration;
  };

  // Ne rien afficher si pas admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      {/* Version Desktop et Tablet */}
      <div className='hidden md:flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/30'>
        {/* Sidebar */}
        <div
          className={`bg-white h-full fixed left-0 top-0 z-40 shadow-xl border-r border-slate-200 flex flex-col transition-all duration-300 ${
            isCollapsed
              ? 'w-0 opacity-0 -translate-x-full'
              : 'w-64 opacity-100 translate-x-0'
          }`}
        >
          {/* En-tête */}
          <div className='p-4 border-b border-slate-200 bg-gradient-to-r from-sky-500 to-sky-600'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <Link
                  to='/'
                  className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm'
                >
                  <Settings2 className='w-6 h-6 text-white' />
                </Link>
                <div>
                  <h1 className='text-lg font-bold text-white tracking-tight'>
                    Administration
                  </h1>
                  <p className='text-xs text-sky-100/80'>Paname Consulting</p>
                </div>
              </div>

              <button
                onClick={toggleSidebar}
                className='p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50'
                aria-label={
                  isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'
                }
              >
                <ChevronLeft className='w-4 h-4 text-white' />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className='flex-1 py-4'>
            <div className='px-2'>
              <ul className='space-y-1'>
                {menuItems.map(item => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center rounded-lg transition-all duration-200 group mx-2 ${
                        isActivePath(item.path)
                          ? 'bg-sky-50 text-sky-600 border border-sky-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <div
                        className={`p-3 ${isActivePath(item.path) ? 'text-sky-500' : 'text-slate-400 group-hover:text-slate-600'}`}
                      >
                        {item.icon}
                      </div>
                      <span className='font-medium text-sm'>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Section utilisateur et déconnexion */}
          <div className='p-4 border-t border-slate-200 space-y-3'>
            <div className='flex items-center space-x-3 px-3 py-2'>
              <div className='w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg'>
                {getNameInitial()}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-slate-800 truncate'>
                  {getDisplayName()}
                </p>
                <p className='text-xs text-slate-500 flex items-center gap-1'>
                  <Shield className='w-3 h-3' />
                  Administrateur
                </p>
              </div>
            </div>

            {/* Boutons de déconnexion */}
            <div className='space-y-2'>
              {/* Bouton Maintenance/Déconnexion tous */}
              <button
                onClick={() => setShowMaintenanceToggle(true)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 ${
                  isMaintenanceMode
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 focus:ring-amber-500/30'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 focus:ring-rose-500/30'
                }`}
                disabled={isMaintenanceLoading}
              >
                {isMaintenanceLoading ? (
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                ) : isMaintenanceMode ? (
                  <>
                    <Wrench className='w-4 h-4' />
                    <span className='font-medium text-sm'>EN MAINTENANCE</span>
                  </>
                ) : (
                  <>
                    <UserX className='w-4 h-4' />
                    <span className='font-medium text-sm'>Déconnecter tous</span>
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className='w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/30'
              >
                <LogOutIcon className='w-4 h-4' />
                <span className='font-medium text-sm'>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bouton flottant pour réouvrir la sidebar */}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className='fixed left-4 top-4 z-50 p-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50'
            aria-label='Ouvrir le menu'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        )}

        {/* Contenu principal */}
        <div
          className={`flex-1 transition-all duration-300 ${
            isCollapsed ? 'ml-0' : 'ml-64'
          }`}
        >
          <div className='p-4 md:p-6 lg:p-8'>{children}</div>
        </div>
      </div>

      {/* Version Mobile - Mobile First Design */}
      <div className='md:hidden flex flex-col h-screen bg-gradient-to-b from-slate-50 to-blue-50/20'>
        {/* Header Mobile */}
        <header className='sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'>
          <div className='px-4'>
            <div className='flex justify-between items-center h-16'>
              <div className='flex items-center space-x-3'>
                <Link
                  to='/'
                  className='w-10 h-10 bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-md'
                >
                  <Settings2 className='w-6 h-6 text-white' />
                </Link>
                <div>
                  <h1 className='text-lg font-bold text-slate-800'>Gestionnaire</h1>
                  <p className='text-xs text-slate-500'>Paname Consulting</p>
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                <button
                  onClick={() => setShowMaintenanceToggle(true)}
                  className={`p-2 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                    isMaintenanceMode
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white focus:ring-amber-500/30'
                      : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white focus:ring-rose-500/30'
                  }`}
                  title={isMaintenanceMode ? 'Mode maintenance actif' : 'Déconnecter tous'}
                  disabled={isMaintenanceLoading}
                >
                  {isMaintenanceMode ? (
                    <Wrench className='w-5 h-5' />
                  ) : (
                    <UserX className='w-5 h-5' />
                  )}
                </button>

                <button
                  onClick={toggleMobileMenu}
                  className='p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
                  aria-label='Menu'
                >
                  {isMobileMenuOpen ? (
                    <X className='w-6 h-6' />
                  ) : (
                    <Menu className='w-6 h-6' />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Menu Mobile */}
          {isMobileMenuOpen && (
            <div className='absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xl'>
              <div className='px-4 py-3 space-y-1'>
                {menuItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActivePath(item.path)
                        ? 'bg-sky-50 text-sky-600 border border-sky-100'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`${isActivePath(item.path) ? 'text-sky-500' : 'text-slate-400'}`}
                    >
                      {item.icon}
                    </div>
                    <span className='font-medium'>{item.name}</span>
                  </Link>
                ))}

                <div className='border-t border-slate-200 my-2'></div>

                <button
                  onClick={handleLogout}
                  className='w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors duration-200'
                >
                  <LogOutIcon className='w-5 h-5' />
                  <span className='font-medium'>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Overlay pour fermer le menu mobile */}
        {isMobileMenuOpen && (
          <div
            className='fixed inset-0 bg-black/20 z-40 md:hidden'
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Contenu principal mobile */}
        <main className='flex-1 p-4 overflow-auto'>
          <div className='bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm h-full'>
            {children}
          </div>
        </main>

        {/* Footer mobile avec info utilisateur */}
        <footer className='sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-full flex items-center justify-center text-white text-xs font-semibold'>
                {getNameInitial()}
              </div>
              <div>
                <p className='text-sm font-medium text-slate-800'>
                  {getDisplayName()}
                </p>
                <p className='text-xs text-slate-500'>Administrateur</p>
              </div>
            </div>
            <button
              onClick={() => setShowMaintenanceToggle(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                isMaintenanceMode
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white focus:ring-amber-500/30'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white focus:ring-rose-500/30'
              }`}
              disabled={isMaintenanceLoading}
            >
              {isMaintenanceMode ? 'EN MAINTENANCE' : 'Déconnecter tous'}
            </button>
          </div>
        </footer>
      </div>

      {/* Modal de confirmation */}
      {(isLogoutAllOpen || showMaintenanceToggle) && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100 opacity-100'>
            {/* En-tête avec condition pour mode maintenance */}
            <div className='p-5 border-b border-slate-200'>
              <div className='flex items-center space-x-3'>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isMaintenanceMode 
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100'
                    : 'bg-gradient-to-r from-rose-100 to-pink-100'
                }`}>
                  {isMaintenanceMode ? (
                    <Wrench className='w-5 h-5 text-amber-600' />
                  ) : (
                    <AlertTriangle className='w-5 h-5 text-rose-600' />
                  )}
                </div>
                <div>
                  <h2 className='text-lg font-bold text-slate-800'>
                    {isMaintenanceMode ? 'Désactiver maintenance' : 'Déconnexion globale'}
                  </h2>
                  <p className='text-xs text-slate-500'>
                    {isMaintenanceMode ? 'Rendre accessible aux utilisateurs' : 'Action administrative'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenu*/}
            <div className='p-5'>
              {logoutAllResult ? (
                <div
                  className={`text-center py-3 ${logoutAllResult.success ? 'text-green-600' : 'text-rose-600'}`}
                >
                  <div
                    className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${
                      logoutAllResult.success ? 'bg-green-100' : 'bg-rose-100'
                    }`}
                  >
                    {logoutAllResult.success ? (
                      <CheckCircle className='w-7 h-7 text-green-600' />
                    ) : (
                      <AlertTriangle className='w-7 h-7' />
                    )}
                  </div>
                  
                  <p className='font-medium text-base mb-2'>{logoutAllResult.message}</p>
                  
                  {logoutAllResult.success && logoutAllResult.stats && (
                    <div className='mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200'>
                      <div className='flex items-center justify-center space-x-2 mb-2'>
                        <BarChart3 className='w-3.5 h-3.5 text-slate-700' />
                        <p className='text-xs text-slate-700 font-medium'>
                          Résumé
                        </p>
                      </div>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div className='flex items-center space-x-2 text-slate-600'>
                          <UsersIcon className='w-3.5 h-3.5' />
                          <span>Déconnectés :</span>
                        </div>
                        <div className='font-semibold text-slate-800'>
                          {logoutAllResult.stats.usersLoggedOut}
                        </div>
                        
                        <div className='flex items-center space-x-2 text-slate-600'>
                          <Clock className='w-3.5 h-3.5' />
                          <span>Durée :</span>
                        </div>
                        <div className='font-semibold text-slate-800'>
                          {formatLogoutDuration(logoutAllResult.stats.duration)}
                        </div>
                        
                        <div className='flex items-center space-x-2 text-slate-600'>
                          <Shield className='w-3.5 h-3.5' />
                          <span>Admin :</span>
                        </div>
                        <div className='font-semibold text-green-600'>
                          {logoutAllResult.stats.adminPreserved ? (
                            <span className='flex items-center text-sm'>
                              <UserCheck className='w-3.5 h-3.5 mr-1' />
                              Oui
                            </span>
                          ) : (
                            <span className='flex items-center text-rose-600 text-sm'>
                              <UserX className='w-3.5 h-3.5 mr-1' />
                              Non
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className='text-center mb-4'>
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                      isMaintenanceMode
                        ? 'bg-gradient-to-br from-amber-100 to-yellow-100'
                        : 'bg-gradient-to-br from-sky-100 to-blue-100'
                    }`}>
                      {isMaintenanceMode ? (
                        <Wrench className='w-8 h-8 text-amber-600' />
                      ) : (
                        <Settings2 className='w-8 h-8 text-sky-600' />
                      )}
                    </div>
                    <h3 className='text-base font-semibold text-slate-800 mb-1.5'>
                      {isMaintenanceMode
                        ? 'Désactiver le mode maintenance ?'
                        : 'Déconnecter tous les utilisateurs ?'}
                    </h3>
                    <p className='text-sm text-slate-600'>
                      {isMaintenanceMode
                        ? 'Les utilisateurs pourront à nouveau accéder à l\'application.'
                        : 'Cette action est définitive et affectera tous les utilisateurs non-administrateurs.'}
                    </p>
                  </div>

                  <div className={`rounded-lg p-3 border mb-4 ${
                    isMaintenanceMode
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-100'
                      : 'bg-gradient-to-r from-sky-50 to-blue-50/50 border-sky-100'
                  }`}>
                    <div className='flex items-start space-x-2'>
                      {isMaintenanceMode ? (
                        <Wrench className='w-4 h-4 text-amber-600 mt-0.5' />
                      ) : (
                        <AlertTriangle className='w-4 h-4 text-sky-600 mt-0.5' />
                      )}
                      <div>
                        <p className={`text-xs font-medium mb-1 ${
                          isMaintenanceMode ? 'text-amber-800' : 'text-sky-800'
                        }`}>
                          {isMaintenanceMode
                            ? 'Conséquences'
                            : 'Détails de l\'action'}
                        </p>
                        <p className={`text-xs ${
                          isMaintenanceMode ? 'text-amber-600' : 'text-sky-600'
                        }`}>
                          {isMaintenanceMode
                            ? '• Accès restauré pour tous les utilisateurs<br/>• Fonctionnalités disponibles<br/>• Données sécurisées'
                            : '• Les administrateurs restent connectés<br/>• Seuls les utilisateurs sont déconnectés<br/>• Blocage de 24 heures pour les non-admin<br/>• Identités confidentielles préservées'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions - BOUTTONS PLUS PETITS */}
            <div className='flex space-x-2 p-4 border-t border-slate-200'>
              {!logoutAllResult && (
                <>
                  <button
                    onClick={() => {
                      setIsLogoutAllOpen(false);
                      setShowMaintenanceToggle(false);
                    }}
                    disabled={isLogoutAllLoading || isMaintenanceLoading}
                    className='flex-1 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm'
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      if (isMaintenanceMode) {
                        // Désactiver le mode maintenance
                        await handleMaintenanceToggle();
                      } else {
                        // Déconnecter tous les utilisateurs
                        await handleLogoutAll();
                      }
                    }}
                    disabled={isLogoutAllLoading || isMaintenanceLoading}
                    className={`flex-1 px-3 py-2 text-white rounded-lg hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 text-sm ${
                      isMaintenanceMode
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 focus:ring-amber-500/30'
                        : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 focus:ring-rose-500/30'
                    }`}
                  >
                    {(isLogoutAllLoading || isMaintenanceLoading) ? (
                      <div className='flex items-center justify-center space-x-1.5'>
                        <div className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        <span className='text-sm'>En cours...</span>
                      </div>
                    ) : isMaintenanceMode ? (
                      'Désactiver'
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                </>
              )}

              {logoutAllResult && (
                <button
                  onClick={() => {
                    setIsLogoutAllOpen(false);
                    setLogoutAllResult(null);
                    setShowMaintenanceToggle(false);
                  }}
                  className='flex-1 px-3 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:from-sky-600 hover:to-sky-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-sm'
                >
                  {logoutAllResult.success ? 'Fermer' : 'Compris'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;