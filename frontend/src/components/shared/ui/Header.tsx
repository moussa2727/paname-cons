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
} from "lucide-react";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

function Header(): React.JSX.Element {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [showTopBar, setShowTopBar] = useState(true);
  const [nav, setNav] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  const handleLogoClick = (): void => {
    if (location.pathname === "/") {
      window?.scrollTo?.({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
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
      if (event.key === "Escape") {
        if (nav) setNav(false);
        if (dropdownOpen) setDropdownOpen(false);
      }
    };

    document?.addEventListener("mousedown", handleClickOutside);
    document?.addEventListener("keydown", handleEscapeKey);

    return () => {
      document?.removeEventListener("mousedown", handleClickOutside);
      document?.removeEventListener("keydown", handleEscapeKey);
    };
  }, [nav, dropdownOpen]);

  useEffect(() => {
    const handleScroll = (): void => {
      const currentScrollY = window.scrollY;

      if (currentScrollY === 0) {
        setShowTopBar(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowTopBar(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowTopBar(true);
      }

      setIsScrolled(currentScrollY > 50);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      const isProduction = import.meta.env.PROD;
      document.cookie =
        "redirect_after_login=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;" +
        (isProduction ? "secure; " : "") +
        "sameSite=none";
    } catch (error) {
      console.error("Header - Logout failed:", error);
    } finally {
      setDropdownOpen(false);
      setNav(false);
    }
  };

  const handleProtectedNavigation = (path: string): void => {
    if (!isAuthenticated) {
      const encodedPath = encodeURIComponent(path);
      const isProduction = import.meta.env.PROD;
      document.cookie = `redirect_after_login=${encodedPath}; max-age=${5 * 60}; path=/; ${isProduction ? "secure; " : ""}sameSite=none`;
      navigate("/connexion", {
        state: {
          message: "Veuillez vous connecter pour accéder à cette page",
          from: path,
        },
      });
    } else {
      navigate(path);
      setNav(false);
      setDropdownOpen(false);
    }
  };

  const navItems = [
    { name: "Accueil", path: "/", icon: <HomeIcon className="w-5 h-5" /> },
    {
      name: "Services",
      path: "/services",
      icon: <ToolsIcon className="w-5 h-5" />,
    },
    {
      name: "À Propos",
      path: "/a-propos",
      icon: <InfoIcon className="w-5 h-5" />,
    },
    {
      name: "Contact",
      path: "/contact",
      icon: <MailIcon className="w-5 h-5" />,
    },
  ];

  const getUserInitials = useCallback((): string => {
    if (!user) return "";
    const firstNameInitial = user.firstName
      ? user.firstName.charAt(0).toUpperCase()
      : "";
    const lastNameInitial = user.lastName
      ? user.lastName.charAt(0).toUpperCase()
      : "";
    return `${firstNameInitial}${lastNameInitial}`;
  }, [user]);

  const getUserDisplayName = (): string => {
    if (!user) return "";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "";
  };

  const adminMenuItems = [
    {
      name: "Tableau de bord",
      path: "/gestionnaire/statistiques",
      icon: <LayoutDashboard className="w-4 h-4" />,
      visible: true,
    },
    {
      name: "Rendez-vous",
      path: "/gestionnaire/rendezvous",
      icon: <Calendar className="w-4 h-4" />,
      visible: true,
    },
    {
      name: "Déconnexion",
      action: handleLogout,
      icon: <LogOut className="w-4 h-4" />,
      visible: true,
      disabled: false,
    },
  ];

  const normalUserMenuItems = [
    {
      name: "Ma Procédure",
      path: "/user/mes-procedures",
      icon: <FileText className="w-4 h-4" />,
      visible: true,
    },
    {
      name: "Mes Rendez-Vous",
      path: "/user/mes-rendezvous",
      icon: <Calendar className="w-4 h-4" />,
      visible: true,
    },
    {
      name: "Mon Profil",
      path: "/user/mon-profil",
      icon: <UserIcon className="w-4 h-4" />,
      visible: true,
    },
    {
      name: "Déconnexion",
      action: handleLogout,
      icon: <LogOut className="w-4 h-4" />,
      visible: true,
      disabled: false,
    },
  ];

  const currentMenuItems = useMemo(() => {
    return isAdmin ? adminMenuItems : normalUserMenuItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
        location.pathname === "/"
          ? isScrolled
            ? "bg-white shadow-md"
            : "bg-gray-100/50 backdrop-blur-xl"
          : "bg-white shadow-md"
      }`}
    >
      {/* Top Bar - Desktop seulement */}
      <div
        className={`bg-sky-500 text-white text-sm transition-all duration-300 ${
          showTopBar ? "h-10" : "h-0 overflow-hidden"
        } hidden md:block`}
        aria-hidden={!showTopBar}
      >
        <div className="mx-auto px-4 h-full flex flex-row items-center justify-between">
          <div className="flex items-center space-x-6">
            <a
              href="tel:+22391830941"
              className="flex items-center font-medium hover:text-sky-100 transition-colors"
              aria-label="Numéro de téléphone Paname Consulting"
            >
              <PhoneIcon className="w-4 h-4 mr-2" />
              <span>+223 91 83 09 41</span>
            </a>
            <a
              href="mailto:panameconsulting906@gmail.com"
              className="flex items-center font-medium hover:text-sky-100 transition-colors"
              aria-label="Adresse e-mail Paname Consulting"
            >
              <MailIcon className="w-4 h-4 mr-2" />
              <span>panameconsulting906@gmail.com</span>
            </a>
          </div>
          <div className="flex items-center">
            <span
              className="font-semibold bg-white/20 px-3 py-1 rounded-full"
              aria-label="Slogan de Paname Consulting: Le cap vers l excellence"
            >
              LE CAP VERS L'EXCELLENCE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav
        className="bg-white shadow-md sm:py-1"
        role="navigation"
        aria-label="Menu principal"
      >
        <div className="px-4">
          <div className="flex items-center justify-between py-4 lg:py-1 md:py-0">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
              aria-label="Retour à l'accueil"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleLogoClick();
                }
              }}
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full hover:scale-105 transition-transform hover:shadow-xl">
                <img
                  src="/images/paname-consulting.jpg"
                  alt="Logo Paname Consulting"
                  className="w-full h-auto rounded-full"
                  width={64}
                  height={64}
                  loading="lazy"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <ul
                className="flex space-x-2"
                role="menubar"
                aria-label="Navigation principale"
              >
                {navItems.map((item) => (
                  <li key={item.path} role="none">
                    <Link
                      to={item.path}
                      role="menuitem"
                      aria-current={
                        location.pathname === item.path ? "page" : undefined
                      }
                      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm md:text-base hover:bg-gray-50 ${
                        location.pathname === item.path
                          ? "text-sky-600 border-b-2 border-sky-500"
                          : "text-gray-600 hover:text-sky-500"
                      }`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Avatar / boutons auth */}
              {isAuthenticated && user ? (
                <div className="relative ml-2 md:ml-4" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-sky-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200 hover:scale-105 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Menu utilisateur"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    disabled={false}
                  >
                    {getUserInitials()}
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 md:w-56 bg-white rounded-lg shadow-xl py-1 z-50 border border-gray-200"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <div className="px-3 md:px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {user?.email}
                        </p>
                        {isAdmin && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800">
                              Administrateur
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="py-2">
                        {currentMenuItems
                          .filter((item) => item.visible)
                          .map((item, index) =>
                            item.path ? (
                              <button
                                key={index}
                                onClick={() =>
                                  handleProtectedNavigation(item.path)
                                }
                                className="flex w-full items-center px-3 md:px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 transition-all duration-150 font-medium"
                              >
                                <span className="shrink-0 text-gray-400">
                                  {item.icon}
                                </span>
                                <span className="ml-3 truncate">
                                  {item.name}
                                </span>
                                {isAdmin && item.name === "Tableau de bord" && (
                                  <span className="ml-auto text-xs text-sky-500 font-semibold">
                                    ADMIN
                                  </span>
                                )}
                              </button>
                            ) : (
                              <button
                                key={index}
                                onClick={() => {
                                  if (item.action) item.action();
                                }}
                                className="flex w-full items-center px-3 md:px-4 py-2.5 text-red-600 hover:bg-red-50 transition-all duration-150 font-medium mt-2 border-t border-gray-100"
                              >
                                <span className="shrink-0">{item.icon}</span>
                                <span className="ml-3 truncate">
                                  {item.name}
                                </span>
                              </button>
                            ),
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 md:space-x-4 ml-4 md:ml-8">
                  <Link
                    to="/connexion"
                    className="flex items-center w-full sm:w-auto px-5 py-2.5 text-sm font-medium bg-sky-400 hover:bg-sky-500 rounded shadow text-white"
                    aria-label="Se connecter"
                    state={{ from: location.pathname }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Connexion</span>
                    <span className="sm:hidden">Login</span>
                  </Link>
                  <Link
                    to="/inscription"
                    className="flex items-center w-full sm:w-auto px-5 py-2.5 text-sm font-medium bg-sky-500 hover:bg-sky-600 rounded shadow text-white"
                    aria-label="Créer un compte"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Inscription</span>
                    <span className="sm:hidden">Sign up</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Bouton hamburger mobile */}
            <button
              ref={hamburgerRef}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              onClick={() => setNav(!nav)}
              aria-label={nav ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={nav}
              aria-controls="mobile-menu"
            >
              {nav ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* MOBILE MENU */}
          {nav && (
            <div
              id="mobile-menu"
              className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-40 border-t"
              ref={mobileMenuRef}
            >
              <div className="p-4">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setNav(false)}
                      className={`flex items-center px-3 py-3 rounded-lg transition-all duration-150 font-medium ${
                        location.pathname === item.path
                          ? "bg-sky-50 text-sky-600 border-l-4 border-sky-500"
                          : "text-gray-600 hover:bg-gray-50 hover:text-sky-500"
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          location.pathname === item.path
                            ? "text-sky-500"
                            : "text-gray-400"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="ml-3 flex-1 font-medium">
                        {item.name}
                      </span>
                      {location.pathname === item.path && (
                        <span className="text-xs font-semibold text-sky-500 bg-sky-100 px-2 py-0.5 rounded">
                          Actif
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {!isAuthenticated && (
                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                    <Link
                      to="/connexion"
                      onClick={() => setNav(false)}
                      className="flex items-center justify-center w-full px-4 py-3 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition-all duration-200 font-medium"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Connexion
                    </Link>
                    <Link
                      to="/inscription"
                      onClick={() => setNav(false)}
                      className="flex items-center justify-center w-full px-4 py-3 text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-all duration-200 font-medium"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Inscription
                    </Link>
                  </div>
                )}

                {isAuthenticated && (
                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-800">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    {currentMenuItems
                      .filter((item) => item.visible)
                      .map((item, index) =>
                        item.path ? (
                          <button
                            key={index}
                            onClick={() => {
                              handleProtectedNavigation(item.path);
                              setNav(false);
                            }}
                            className="flex w-full items-center px-3 py-3 text-gray-700 hover:bg-gray-50 hover:text-sky-600 rounded-lg transition-all duration-150 font-medium"
                          >
                            <span className="shrink-0 text-gray-400">
                              {item.icon}
                            </span>
                            <span className="ml-3 flex-1 text-left">
                              {item.name}
                            </span>
                            <span className="text-gray-400">→</span>
                          </button>
                        ) : (
                          <button
                            key={index}
                            onClick={() => {
                              if (item.action) item.action();
                            }}
                            className="flex w-full items-center px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 font-medium"
                          >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="ml-3 flex-1 text-left">
                              {item.name}
                            </span>
                            <span className="text-gray-400">→</span>
                          </button>
                        ),
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
