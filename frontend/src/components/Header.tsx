import {
  Calendar,
  FileText,
  Home as HomeIcon,
  Info as InfoIcon,
  LayoutDashboard,
  Mail as MailIcon,
  Menu,
  Phone as PhoneIcon,
  Settings as ToolsIcon,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Header(): React.JSX.Element {
  const [showTopBar] = useState(true);
  const [nav, setNav] = useState(false);
  const [blinkColor, setBlinkColor] = useState('text-gray-600');
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLUListElement>(null);
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
    };

    const handleEscapeKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (nav) setNav(false);
      }
    };

    document?.addEventListener('mousedown', handleClickOutside);
    document?.addEventListener('keydown', handleEscapeKey);

    return () => {
      document?.removeEventListener('mousedown', handleClickOutside);
      document?.removeEventListener('keydown', handleEscapeKey);
    };
  }, [nav]);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const blink = (): void => {
      setBlinkColor('text-sky-500');
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

  return (
    <header role='banner' className='fixed top-0 z-50 w-full font-sans'>
      {/* Top Bar - Desktop seulement */}
      <div
        className={`bg-sky-500 text-white text-sm transition-all duration-300 ${showTopBar ? 'h-10' : 'h-0 overflow-hidden'} hidden md:block`}
        aria-hidden={!showTopBar}
      >
        <div className='mx-auto px-4 h-full flex flex-row items-center justify-between'>
          <div className='flex items-center space-x-6'>
            <a
              href='tel:+22391830941'
              className='flex items-center font-medium hover:text-sky-100 transition-colors'
              aria-label='Numéro de téléphone'
            >
              <PhoneIcon className='w-4 h-4 mr-2' />
              <span>+223 91 83 09 41</span>
            </a>
            <a
              href='mailto:panameconsulting906@gmail.com'
              className='flex items-center font-medium hover:text-sky-100 transition-colors'
              aria-label='Adresse e-mail'
            >
              <MailIcon className='w-4 h-4 mr-2' />
              <span>panameconsulting906@gmail.com</span>
            </a>
          </div>
          <div className='flex items-center'>
            <span
              className='font-semibold bg-white/20 px-3 py-1 rounded-full'
              aria-label='Slogan: Le cap vers l excellence'
            >
              LE CAP VERS L'EXCELLENCE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav
        className='bg-white shadow-md py-2 sm:py-0' 
        role='navigation'
        aria-label='Menu principal'
      >
        <div className='px-4'>
          <div className='flex items-center justify-between py-2'>
            {/* Logo */}
            <div
              className='flex items-center cursor-pointer'
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
              <div className='w-12 h-12 md:w-16 md:h-16 rounded-full shadow-sm'>
                <img
                  src='/paname-consulting.jpg'
                  alt='Logo'
                  className='w-full h-auto rounded'
                  width={64}
                  height={64}
                  loading='lazy'
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className='hidden lg:flex items-center space-x-4'>
              {/* Navigation principale */}
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
                      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm md:text-base hover:bg-gray-50 ${
                        location.pathname === item.path
                          ? 'text-sky-600 border-b-2 border-sky-500'
                          : 'text-gray-600 hover:text-sky-500'
                      } ${item.className || ''}`}
                    >
                      {item.icon}
                      <span className='ml-2'>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bouton hamburger mobile */}
            <button
              ref={hamburgerRef}
              className='lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-all duration-200'
              onClick={() => setNav(!nav)}
              aria-label={nav ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={nav}
              aria-controls='mobile-menu'
            >
              {nav ? (
                <X className='w-6 h-6 text-gray-700' />
              ) : (
                <Menu className='w-6 h-6 text-gray-700' />
              )}
            </button>
          </div>

          {/* MOBILE MENU - DESIGN MOBILE FIRST */}
          {nav && (
            <div
              id='mobile-menu'
              className='lg:hidden fixed inset-0 bg-black/50 z-40 mt-16'
              onClick={() => setNav(false)}
            >
              <ul
                className='absolute right-0 top-0 w-4/5 max-w-sm h-full bg-white shadow-lg overflow-y-auto'
                role='menu'
                aria-label='Navigation mobile'
                ref={mobileMenuRef}
                onClick={(e) => e.stopPropagation()}
              >
                {/* En-tête mobile */}
                <div className='sticky top-0 bg-white border-b z-10'>
                  <div className='px-4 py-3 flex items-center justify-between bg-gray-50'>
                    <div className='text-gray-600 text-sm'>
                      <p className='font-medium'>Bienvenue</p>
                      <p className='text-xs'>Paname Consulting</p>
                    </div>
                  </div>
                </div>

                {/* CONTENU DU MENU MOBILE - Mobile First */}
                <div className='p-4 space-y-6'>
                  {/* SECTION: NAVIGATION PRINCIPALE */}
                  <div className='space-y-2'>
                    <h3 className='text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 px-2'>
                      Navigation
                    </h3>
                    {navItems.map(item => (
                      <div key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setNav(false)}
                          role='menuitem'
                          aria-current={
                            location.pathname === item.path ? 'page' : undefined
                          }
                          className={`flex items-center px-3 py-3 rounded-lg transition-all duration-150 font-medium ${
                            location.pathname === item.path
                              ? 'bg-sky-50 text-sky-600 border-l-4 border-sky-500'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-sky-500'
                          }`}
                        >
                          <span className={`flex-shrink-0 ${
                            location.pathname === item.path ? 'text-sky-500' : 'text-gray-400'
                          }`}>
                            {item.icon}
                          </span>
                          <span className='ml-3 flex-1 font-medium'>{item.name}</span>
                          {location.pathname === item.path && (
                            <span className='text-xs font-semibold text-sky-500 bg-sky-100 px-2 py-0.5 rounded'>
                              Actif
                            </span>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </ul>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;