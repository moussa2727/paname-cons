import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LogOutIcon,
  SettingsIcon
} from 'lucide-react';

interface AdminSidebarProps {
  children: React.ReactNode;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ children }) => {
  const { logout, user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLogoutAllOpen, setIsLogoutAllOpen] = useState(false);

  // Détection précise des tailles d'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      if (mobile) {
        setIsCollapsed(false);
      } else if (tablet) {
        // Sur tablette, la sidebar est réduite par défaut
        setIsCollapsed(true);
      } else {
        // Sur desktop, on garde l'état précédent
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const menuItems = [
    {
      name: 'Tableau de bord',
      path: '/gestionnaire',
      icon: <LayoutDashboard className='w-5 h-5' />,
    },
    {
      name: 'Utilisateurs',
      path: '/gestionnaire/utilisateurs',
      icon: <Users className='w-5 h-5' />,
    },
    {
      name: 'Messages',
      path: '/gestionnaire/messages',
      icon: <MessageSquare className='w-5 h-5' />,
    },
    {
      name: 'Rendez-vous',
      path: '/gestionnaire/rendez-vous',
      icon: <Calendar className='w-5 h-5' />,
    },
    {
      name: 'Procédures',
      path: '/gestionnaire/procedures',
      icon: <FileText className='w-5 h-5' />,
    },
    {
      name: 'Destinations',
      path: '/gestionnaire/destinations',
      icon: <MapPin className='w-5 h-5' />,
    },
    {
      name: 'Mon Profil',
      path: '/gestionnaire/profil',
      icon: <User className='w-5 h-5' />,
    },
  ];

  // Fonction pour obtenir le nom d'affichage sécurisé selon AuthContext
  const getDisplayName = (): string => {
    if (!user) return 'Administrateur';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) return user.firstName;
    
    if (user.email) return user.email.split('@')[0];
    
    return 'Administrateur';
  };

  // Fonction pour obtenir l'initiale du nom
  const getNameInitial = (): string => {
    const displayName = getDisplayName();
    return displayName.charAt(0).toUpperCase();
  };

  // Déconnexion simple - session actuelle uniquement
  const handleLogout = () => {
    logout('/', false);
  };

  // Déconnexion de toutes les sessions (admin seulement)
  const handleLogoutAll = async () => {
    if (!token) {
      console.error('Token non disponible pour la déconnexion globale');
      return;
    }

    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la déconnexion globale');
      }

      const result = await response.json();
      console.log('Déconnexion globale réussie:', result);
      
      logout('/', false);
      
    } catch (error) {
      console.error('Erreur lors de la déconnexion globale:', error);
      logout('/', false);
    } finally {
      setIsLogoutAllOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  // Ne rien afficher si pas admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      {/* Version Desktop et Tablet - Sidebar */}
      <div className='hidden md:flex min-h-screen bg-slate-50'>
        {/* Sidebar */}
        <div 
          className={`bg-white h-screen fixed left-0 top-0 z-40 shadow-xl border-r border-slate-200/60 flex flex-col transition-all duration-300 ${
            isCollapsed ? 'w-0 opacity-0' : 'w-64 opacity-100'
          }`}
        >
          {/* En-tête avec bouton de réduction */}
          <div className='p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-sky-500'>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isCollapsed && (
                <div className='flex items-center space-x-3'>
                  <Link to='/' className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                     <SettingsIcon className='w-5 h-5' />
                  </Link>
                  <div>
                    <h1 className='text-lg font-bold text-white'>Gestionnaire</h1>
                  </div>
                </div>
              )}
              
              <button
                onClick={toggleSidebar}
                className={`p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent ${
                  isCollapsed ? 'transform scale-110' : ''
                }`}
                aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
              >
                {isCollapsed ? (
                  <ChevronRight className='w-4 h-4 text-white' />
                ) : (
                  <ChevronLeft className='w-4 h-4 text-white' />
                )}
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className='flex-1 overflow-y-auto py-6'>
            <div className='px-3'>
              <ul className='space-y-2'>
                {menuItems.map(item => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center rounded-xl transition-all duration-200 group ${
                        isCollapsed ? 'justify-center px-3 py-4' : 'space-x-4 px-4 py-3'
                      } ${
                        isActivePath(item.path)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      } focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent`}
                      title={isCollapsed ? item.name : ''}
                    >
                      <div className={`${isActivePath(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} ${
                        isCollapsed ? 'transform scale-110' : ''
                      }`}>
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <span className='font-medium truncate'>{item.name}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Section utilisateur et déconnexion */}
          <div className='p-4 border-t border-slate-200 space-y-3'>
            {!isCollapsed && (
              <div className='flex items-center space-x-3 px-3 py-2 text-slate-600'>
                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                  {getNameInitial()}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-slate-800 truncate'>{getDisplayName()}</p>
                  <p className='text-xs text-slate-500'>Administrateur</p>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className='flex justify-center'>
                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                  {getNameInitial()}
                </div>
              </div>
            )}
            
            {/* Boutons de déconnexion */}
            <div className={`space-y-2 ${isCollapsed ? 'px-0' : 'px-1'}`}>
              {/* Déconnexion simple */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center rounded-xl transition-colors duration-200 border border-slate-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus:ring-0 focus:outline-none focus:border-orange-300 ${
                  isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-4 py-3'
                }`}
                title={isCollapsed ? 'Déconnexion' : ''}
              >
                <LogOut className='w-4 h-4' />
                {!isCollapsed && <span className='font-medium text-sm'>Déconnexion</span>}
              </button>

              {/* Déconnexion de toutes les sessions */}
              <button
                onClick={() => setIsLogoutAllOpen(true)}
                className={`w-full flex items-center rounded-xl transition-colors duration-200 border border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:ring-0 focus:outline-none focus:border-red-300 ${
                  isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-4 py-3'
                }`}
                title={isCollapsed ? 'Déconnecter tous' : ''}
              >
                <LogOutIcon className='w-4 h-4' />
                {!isCollapsed && <span className='font-medium text-sm'>Déconnecter tous</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Bouton flottant pour réouvrir la sidebar quand elle est rétractée */}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className='fixed left-4 top-4 z-50 p-1 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-500 transition-all duration-200 focus:ring-none focus:outline-none border border-transparent'
            aria-label='Ouvrir le menu'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        )}

        {/* Contenu principal avec marge adaptative */}
        <div className={`flex-1 transition-all duration-300 ${
          isCollapsed ? 'ml-0' : 'ml-64'
        }`}>
          <div className='p-4 md:p-6 lg:p-8'>
            {children}
          </div>
        </div>
      </div>

      {/* Version Mobile */}
      <div className='md:hidden min-h-screen bg-slate-50'>
        {/* Header Mobile */}
        <header className='bg-white shadow-lg border-b border-slate-200/60 sticky top-0 z-50 backdrop-blur-sm bg-white/95'>
          <div className='px-4'>
            <div className='flex justify-between items-center h-16'>
              {/* Logo et titre */}
              <div className='flex items-center space-x-3'>
                <Link to='/' className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                     <SettingsIcon className='w-5 h-5' />
                  </Link>
                <h1 className='text-lg font-bold text-slate-800'>Gestionnaire</h1>
              </div>

              {/* Boutons côté droit */}
              <div className='flex items-center space-x-2'>
               

                {/* Menu Mobile Toggle */}
                <button
                  onClick={toggleMobileMenu}
                  className='p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent'
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

          {/* Menu Mobile déroulant */}
          {isMobileMenuOpen && (
            <div className='bg-white border-t border-slate-200/60 shadow-xl absolute top-16 left-0 right-0 z-50 backdrop-blur-sm bg-white/95 max-h-[85vh] overflow-y-auto'>
              <div className='px-4 py-4 space-y-2'>
                {/* Navigation */}
                <div className='space-y-1'>
                  {menuItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                        isActivePath(item.path)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      } focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent`}
                    >
                      <div className={`${isActivePath(item.path) ? 'text-white' : 'text-slate-500'} w-6 h-6 flex items-center justify-center`}>
                        {item.icon}
                      </div>
                      <span className='font-medium text-base'>{item.name}</span>
                    </Link>
                  ))}
                </div>
                
                {/* Séparateur */}
                <div className='border-t border-slate-200 my-3'></div>
                
                {/* Boutons de déconnexion Mobile */}
                <div className='space-y-2'>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className='flex items-center space-x-4 w-full px-4 py-4 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors duration-200 border border-slate-300 hover:border-orange-300 focus:ring-0 focus:outline-none focus:border-orange-300'
                  >
                    <LogOut className='w-6 h-6' />
                    <span className='font-medium text-base'>Déconnexion</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLogoutAllOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className='flex items-center space-x-4 w-full px-4 py-4 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors duration-200 border border-slate-300 hover:border-red-300 focus:ring-0 focus:outline-none focus:border-red-300'
                  >
                    <LogOutIcon className='w-6 h-6' />
                    <span className='font-medium text-base'>Déconnecter tous</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Overlay pour fermer le menu mobile */}
        {isMobileMenuOpen && (
          <div 
            className='fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden'
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Contenu principal mobile avec padding adaptatif */}
        <div className='p-4'>
          <div className='bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[calc(100vh-8rem)]'>
            {children}
          </div>
        </div>
      </div>

      {/* Modal de confirmation déconnexion globale */}
      {isLogoutAllOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Déconnexion globale</h2>
              <button
                onClick={() => setIsLogoutAllOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600 text-center mb-2">
                Êtes-vous sûr de vouloir déconnecter tous les utilisateurs ?
              </p>
              <p className="text-sm text-slate-500 text-center">
                Cette action déconnectera tous les utilisateurs (sauf les administrateurs) du système.
              </p>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsLogoutAllOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutAll}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-red-300 border border-transparent"
              >
                Déconnecter tous
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;