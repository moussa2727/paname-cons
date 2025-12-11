/* eslint-disable no-undef */

import {
  Calendar,
  FileText,
  Home as HomeIcon,
  Info as InfoIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail as MailIcon,
  Menu,
  Phone as PhoneIcon,
  Settings as ToolsIcon,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header(): React.JSX.Element {
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [showTopBar] = useState(true);
  const [nav, setNav] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [blinkColor, setBlinkColor] = useState('text-gray-600');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogoClick = (): void => {
    if (!isMounted) return;
    if (location.pathname === '/') {
      window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        nav &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setNav(false);
      }

      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (nav) setNav(false);
        if (dropdownOpen) setDropdownOpen(false);
      }
    };

    document?.addEventListener('mousedown', handleClickOutside);
    document?.addEventListener('keydown', handleEscapeKey);

    return () => {
      document?.removeEventListener('mousedown', handleClickOutside);
      document?.removeEventListener('keydown', handleEscapeKey);
    };
  }, [nav, dropdownOpen]);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    setBlinkColor('text-gray-600');
    const blink = (): void => {
      setBlinkColor('text-sky-400');
      blinkTimeout = setTimeout(() => {
        setBlinkColor('text-gray-600');
      }, 2000);
    };

    const blinkInterval = setInterval(blink, 6000);

    return () => {
      clearInterval(blinkInterval);
      clearTimeout(blinkTimeout);
    };
  }, []);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
      window.sessionStorage?.removeItem('redirect_after_login');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    } finally {
      setIsLoggingOut(false);
      setDropdownOpen(false);
      if (nav) setNav(false);
    }
  };

  const handleProtectedNavigation = (path: string, isMobile: boolean = false): void => {
    if (!isAuthenticated) {
      window.sessionStorage?.setItem('redirect_after_login', path);
      navigate('/connexion', {
        state: {
          message: 'Veuillez vous connecter pour accéder à cette page',
          from: path,
        }
      });
    } else {
      navigate(path);
      if (isMobile && nav) setNav(false);
      if (!isMobile) setDropdownOpen(false);
    }
  };

  const navItems = [
    { name: 'Accueil', path: '/', icon: <HomeIcon className='w-5 h-5' /> },
    {
      name: 'Services',
      path: '/services',
      icon: <ToolsIcon className='w-5 h-5' />,
      className: blinkColor,
    },
    {
      name: 'À Propos',
      path: '/a-propos',
      icon: <InfoIcon className='w-5 h-5' />,
    },
    {
      name: 'Contact',
      path: '/contact',
      icon: <MailIcon className='w-5 h-5' />,
    },
  ];

  const userMenuItems = [
    {
      name: 'Tableau de bord',
      path: '/gestionnaire/statistiques',
      icon: <LayoutDashboard className='w-4 h-4' />,
      visible: user?.role === 'admin' || user?.isAdmin === true,
      requiresAuth: true,
    },
    {
      name: 'Ma Procédure',
      path: '/ma-procedure',
      icon: <FileText className='w-4 h-4' />,
      visible: user?.role === 'user',
      requiresAuth: true,
    },
    {
      name: 'Mes Rendez-Vous',
      path: '/mes-rendez-vous',
      icon: <Calendar className='w-4 h-4' />,
      visible: user?.role === 'user',
      requiresAuth: true,
    },
    {
      name: 'Mon Profil',
      path: '/mon-profil',
      icon: <UserIcon className='w-4 h-4' />,
      visible: true,
      requiresAuth: true,
    },
    {
      name: 'Déconnexion',
      action: handleLogout,
      icon: isLoggingOut ? (
        <div className='w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin'></div>
      ) : (
        <LogOut className='w-4 h-4' />
      ),
      visible: isAuthenticated,
      disabled: isLoggingOut,
      requiresAuth: true,
    },
  ];

  const getUserInitials = (): string => {
    if (!user) return '';
    const firstNameInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '';
    const lastNameInitial = user.lastName ? user.lastName.charAt(0).toUpperCase() : '';
    return `${firstNameInitial}${lastNameInitial}`;
  };

  const getUserDisplayName = (): string => {
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || '';
  };

  return (
    <header role='banner' className='fixed top-0 z-50 w-full'>
      <div
        className={`bg-sky-500 text-white text-sm transition-all duration-300 ${showTopBar ? 'h-10' : 'h-0 overflow-hidden'} hidden md:block`}
        aria-hidden={!showTopBar}
      >
        <div className='mx-auto px-4 h-full flex flex-row items-center justify-between'>
          <div className='flex items-center space-x-6'>
            <a
              href='tel:+22391830941'
              className='flex items-center group'
              aria-label='Numéro de téléphone Paname Consulting'
            >
              <PhoneIcon className='w-4 h-4 mr-2 group-hover:text-sky-200' />
              <span className='font-medium'>+223 91 83 09 41</span>
            </a>
            <a
              href='mailto:panameconsulting906@gmail.com'
              className='flex items-center group'
              aria-label='Adresse e-mail Paname Consulting'
            >
              <MailIcon className='w-4 h-4 mr-2 group-hover:text-sky-200' />
              <span className='font-medium'>panameconsulting906@gmail.com</span>
            </a>
          </div>
          <div className='flex items-center'>
            <span
              className='font-semibold bg-white/20 px-3 py-1 rounded-full'
              aria-label='Slogan de Paname Consulting: Le cap vers l excellence'
            >
              LE CAP VERS L'EXCELLENCE
            </span>
          </div>
        </div>
      </div>

      <nav
        className='bg-white backdrop-blur-md shadow-md transition-colors duration-300'
        role='navigation'
        aria-label='Menu principal'
      >
        <div className='px-4'>
          <div className='flex items-center justify-between py-3'>
            <div
              className='flex items-center group cursor-pointer'
              onClick={handleLogoClick}
              role='button'
              tabIndex={0}
              aria-label="Retour à l'accueil"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleLogoClick();
                }
              }}
            >
              <div className='w-16 h-16 rounded-full shadow-sm'>
                <img
                  src='/paname-consulting.jpg'
                  alt='Logo Paname Consulting'
                  className='w-full h-auto rounded'
                  width={64}
                  height={64}
                  loading='lazy'
                />
              </div>
            </div>

            <div className='hidden lg:flex items-center space-x-4'>
              <ul
                className='flex space-x-2'
                role='menubar'
                aria-label='Navigation principale'
              >
                {navItems.map(item => (
                  <li key={item.path} role='none'>
                    <Link
                      to={item.path}
                      role='menuitem'
                      aria-current={
                        location.pathname === item.path ? 'page' : undefined
                      }
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                        location.pathname === item.path
                          ? 'text-gray-600 font-medium border-b-2 border-sky-400'
                          : 'text-gray-600 hover:text-sky-400'
                      } ${item.className || ''}`}
                    >
                      {item.icon}
                      <span className='ml-2'>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {isAuthenticated && user ? (
                <div className='relative ml-4' ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className='flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-transform duration-200 hover:scale-105'
                    aria-label='Menu utilisateur'
                    aria-expanded={dropdownOpen}
                    aria-haspopup='true'
                    disabled={authLoading}
                  >
                    {getUserInitials() || <UserIcon className='w-5 h-5' />}
                  </button>

                  {dropdownOpen && (
                    <div
                      className='absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 animate-fadeIn'
                      role='menu'
                      aria-orientation='vertical'
                    >
                      <div className='px-4 py-2 border-b border-gray-100'>
                        <p className='text-sm font-medium text-gray-800 truncate'>
                          {getUserDisplayName()}
                        </p>
                        <p className='text-xs text-gray-500 truncate'>
                          {user?.email}
                        </p>
                      </div>

                      <div className='py-1'>
                        {userMenuItems
                          .filter(item => item.visible)
                          .map((item, index) =>
                            item.path ? (
                              <button
                                key={index}
                                onClick={() => handleProtectedNavigation(item.path)}
                                className='flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150'
                                role='menuitem'
                                disabled={item.disabled}
                                aria-disabled={item.disabled}
                              >
                                {item.icon}
                                <span className='ml-3'>{item.name}</span>
                              </button>
                            ) : (
                              <button
                                key={index}
                                onClick={() => {
                                  if (item.action) item.action();
                                }}
                                className='flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150'
                                role='menuitem'
                                disabled={item.disabled}
                                aria-disabled={item.disabled}
                              >
                                {item.icon}
                                <span className='ml-3'>{item.name}</span>
                              </button>
                            )
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='flex items-center space-x-2 ml-4'>
                  <Link
                    to='/connexion'
                    className='flex items-center px-4 py-2 text-sky-600 hover:bg-sky-50 border border-sky-200 transition-colors duration-200 rounded-full'
                    aria-label='Se connecter'
                    state={{ from: location.pathname }}
                  >
                    <LogIn className='w-5 h-5 mr-2' />
                    <span>Connexion</span>
                  </Link>
                  <Link
                    to='/inscription'
                    className='flex items-center px-4 py-2 text-white bg-sky-500 hover:bg-sky-600 transition-colors duration-200 rounded-full'
                    aria-label='Créer un compte'
                  >
                    <UserPlus className='w-5 h-5 mr-2' />
                    <span>Inscription</span>
                  </Link>
                </div>
              )}
            </div>

            <button
              ref={hamburgerRef}
              className='lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200'
              onClick={() => setNav(!nav)}
              aria-label={nav ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={nav}
              aria-controls='mobile-menu'
              disabled={authLoading}
            >
              {nav ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
            </button>
          </div>

          {nav && (
            <ul
              id='mobile-menu'
              className='lg:hidden pb-4'
              role='menu'
              aria-label='Navigation mobile'
              ref={mobileMenuRef}
            >
              <div className='bg-white rounded-lg shadow-lg border divide-y animate-slideDown'>
                {navItems.map(item => (
                  <li key={item.path} role='none'>
                    <Link
                      to={item.path}
                      onClick={() => setNav(false)}
                      role='menuitem'
                      aria-current={
                        location.pathname === item.path ? 'page' : undefined
                      }
                      className={`flex items-center px-4 py-3 transition-colors duration-150 ${
                        location.pathname === item.path
                          ? 'text-sky-500 font-bold bg-sky-50 border-l-4 border-sky-500'
                          : 'text-gray-600 hover:text-sky-400'
                      }`}
                    >
                      {item.icon}
                      <span className='ml-3'>{item.name}</span>
                    </Link>
                  </li>
                ))}

                {isAuthenticated && user && (
                  <div className='px-4 py-3 border-t'>
                    <div className='flex items-center mb-3'>
                      <div className='flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white font-medium mr-3'>
                        {getUserInitials() || <UserIcon className='w-5 h-5' />}
                      </div>
                      <div>
                        <p className='text-sm font-medium text-gray-800 truncate'>
                          {getUserDisplayName()}
                        </p>
                        <p className='text-xs text-gray-500 truncate'>
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    <div className='space-y-1'>
                      {userMenuItems
                        .filter(item => item.visible)
                        .map((item, index) =>
                          item.path ? (
                            <button
                              key={index}
                              onClick={() => handleProtectedNavigation(item.path, true)}
                              className='flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors duration-150'
                              role='menuitem'
                              disabled={item.disabled}
                              aria-disabled={item.disabled}
                            >
                              {item.icon}
                              <span className='ml-3'>{item.name}</span>
                            </button>
                          ) : (
                            <button
                              key={index}
                              onClick={() => {
                                if (item.action) item.action();
                              }}
                              className='flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors duration-150'
                              role='menuitem'
                              disabled={item.disabled}
                              aria-disabled={item.disabled}
                            >
                              {item.icon}
                              <span className='ml-3'>{item.name}</span>
                            </button>
                          )
                        )}
                    </div>
                  </div>
                )}

                {!isAuthenticated && (
                  <li className='px-4 py-2 space-y-2' role='none'>
                    <Link
                      to='/connexion'
                      onClick={() => setNav(false)}
                      className='flex items-center justify-center w-full px-4 py-2 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition-colors duration-200'
                      role='menuitem'
                      state={{ from: location.pathname }}
                    >
                      <LogIn className='w-5 h-5 mr-2' />
                      <span>Connexion</span>
                    </Link>
                    <Link
                      to='/inscription'
                      onClick={() => setNav(false)}
                      className='flex items-center justify-center w-full px-4 py-2 text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors duration-200 mt-2'
                      role='menuitem'
                    >
                      <UserPlus className='w-5 h-5 mr-2' />
                      <span>Inscription</span>
                    </Link>
                  </li>
                )}
              </div>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;