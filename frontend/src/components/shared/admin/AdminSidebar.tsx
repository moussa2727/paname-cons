import React, { useState, useCallback, memo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  ChevronDown,
  Calendar,
  Globe,
  FileText,
  Users,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../hooks/useAuth";
import { MessagesService } from "../../../services/message.service";

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  showLoadingBadge?: boolean;
  onClick?: () => void;
  children?: MenuItem[];
}

const IconWrapper = memo(
  ({
    icon: Icon,
    isActive,
    className = "",
  }: {
    icon: React.ElementType;
    isActive: boolean;
    className?: string;
  }) => (
    <Icon
      className={`w-4 h-4 transition-colors duration-200 ${className} ${
        isActive ? "text-sky-600" : "text-gray-500 group-hover:text-sky-500"
      }`}
    />
  ),
);

IconWrapper.displayName = "IconWrapper";

export default function AdminSidebar({
  isCollapsed,
  onToggle,
}: AdminSidebarProps) {
  const { user, logout, logoutAll } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);

  // Charger le compteur de messages non lus au montage et rafraîchir toutes les 30s
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const stats = await MessagesService.getStatistics();
        setUnreadCount(stats.unread);
      } catch (error) {
        console.error(
          "Erreur lors du chargement du compteur de messages:",
          error,
        );
      }
    };

    // Charger au montage
    loadUnreadCount();

    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(loadUnreadCount, 60000);

    return () => clearInterval(interval);
  }, []);

  // Rafraîchir manuellement quand on clique sur Messages
  const handleMessagesClick = useCallback(async () => {
    try {
      const stats = await MessagesService.getStatistics();
      setUnreadCount(stats.unread);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du compteur:", error);
    }
  }, []);

  const menuItems: MenuItem[] = [
    {
      href: "/gestionnaire/statistiques",
      icon: BarChart3,
      label: "Statistiques",
    },
    {
      href: "/gestionnaire/rendezvous",
      icon: Calendar,
      label: "Rendez-vous",
    },
    {
      href: "/gestionnaire/messages",
      icon: MessageSquare,
      label: "Messages",
      badge: unreadCount,
      onClick: handleMessagesClick,
    },
    {
      href: "/gestionnaire/destinations",
      icon: Globe,
      label: "Destinations",
    },
    {
      href: "/gestionnaire/utilisateurs",
      icon: Users,
      label: "Utilisateurs",
    },
    {
      href: "/gestionnaire/procedures",
      icon: FileText,
      label: "Procédures",
    },
    {
      href: "/gestionnaire/profil",
      icon: User,
      label: "Profil",
    },
  ];

  const handleLogout = useCallback(async () => {
    setShowLogoutModal(true);
  }, []);

  const handleLogoutAll = useCallback(async () => {
    setShowLogoutAllModal(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setShowLogoutModal(false);
    }
  }, [navigate, logout]);

  const confirmLogoutAll = useCallback(async () => {
    try {
      await logoutAll();
      navigate("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion globale:", error);
    } finally {
      setShowLogoutAllModal(false);
    }
  }, [navigate, logoutAll]);

  const toggleDropdown = useCallback((itemLabel: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemLabel)
        ? prev.filter((item) => item !== itemLabel)
        : [...prev, itemLabel],
    );
  }, []);

  const isItemActive = useCallback(
    (href: string) => {
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname],
  );

  const isDropdownActive = useCallback(
    (children: MenuItem[] | undefined) => {
      if (!children) return false;
      return children.some((child) => isItemActive(child.href));
    },
    [isItemActive],
  );

  // Animations simplifiées pour éviter le glitch au chargement
  const sidebarVariants = {
    expanded: {
      width: 260,
      transition: { duration: 0.2 } as const,
    },
    collapsed: {
      width: 0,
      transition: { duration: 0.2 } as const,
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const badgeVariants = {
    initial: { scale: 0 },
    animate: {
      scale: 1,
      transition: { duration: 0.3 } as const,
    },
    exit: { scale: 0 },
  };

  return (
    <>
      {/* Sidebar principale */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.aside
            key="sidebar"
            initial="expanded"
            animate="expanded"
            exit="collapsed"
            variants={sidebarVariants}
            className="fixed left-0 top-0 h-screen bg-linear-to-b from-sky-100 via-sky-50 to-blue-50 border-r border-sky-200 flex flex-col z-50 shadow-2xl shadow-sky-900/20 overflow-hidden"
          >
            {/* Header avec logo et titre */}
            <div className="relative px-4 py-5 border-b border-sky-200 bg-linear-to-r from-sky-50 to-blue-50">
              {/* Informations utilisateur - aligné à gauche */}
              {user && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-start space-y-3"
                >
                  {/* Icône settings en haut */}
                  <div className="relative flex items-center gap-3">
                    {/* Icône avec badge de statut */}
                    <div className="relative">
                      <Link
                        to="/"
                        className="w-10 h-10 bg-linear-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center shadow-md shadow-sky-500/30"
                      >
                        {user.role === "ADMIN" ? (
                          <Settings className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </Link>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></div>
                    </div>

                    {/* Texte aligné à gauche sous l'icône */}
                    <div className="flex flex-col items-start">
                      <h2 className="font-bold text-sky-900 text-sm leading-tight">
                        Gestionnaire
                      </h2>
                      <p className="text-xs text-sky-700 leading-tight">
                        Paname Consulting
                      </p>
                    </div>
                  </div>

                  {/* Informations utilisateur en dessous */}
                  <div className="text-start">
                    <div className="flex flex-col items-start gap-1 mt-1">
                      <span className="text-[10px] text-sky-600 truncate max-w-40">
                        {user.email}
                      </span>
                      <span className="text-[9px] font-medium text-sky-500 uppercase tracking-wider">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bouton de rétraction */}
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggle}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-linear-to-br from-sky-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 border-2 border-white group z-10"
                aria-label="Rétracter le menu"
              >
                <ChevronLeft
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isCollapsed ? "rotate-180" : ""
                  }`}
                />
              </motion.button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-200 scrollbar-track-transparent">
              {menuItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isActive = hasChildren
                  ? isDropdownActive(item.children)
                  : isItemActive(item.href);
                const isExpanded = expandedItems.includes(item.label);

                return (
                  <motion.div
                    key={item.href}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {hasChildren ? (
                      // Dropdown menu
                      <div>
                        <button
                          onClick={() => toggleDropdown(item.label)}
                          className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 w-full ${
                            isActive
                              ? "bg-sky-100 text-sky-700 shadow-sm border-l-2 border-sky-500"
                              : "hover:bg-sky-50 text-gray-600 hover:text-sky-700"
                          }`}
                        >
                          <div className="relative">
                            <IconWrapper icon={item.icon} isActive={isActive} />
                          </div>

                          <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            variants={contentVariants}
                            className="flex items-center justify-between flex-1 min-w-0"
                          >
                            <span className="text-sm font-medium truncate">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {isActive && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="w-1.5 h-1.5 bg-sky-500 rounded-full"
                                />
                              )}
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </motion.div>
                        </button>

                        {/* Dropdown content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: "auto", opacity: 1 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.1 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sky-100 pl-2">
                                {item.children?.map((child) => {
                                  const childIsActive = isItemActive(
                                    child.href,
                                  );
                                  return (
                                    <motion.div
                                      key={child.href}
                                      whileHover={{ x: 1 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Link
                                        to={child.href}
                                        className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                                          childIsActive
                                            ? "bg-sky-50 text-sky-600 border-l-2 border-sky-400"
                                            : "hover:bg-sky-50/60 text-gray-500 hover:text-sky-600"
                                        }`}
                                      >
                                        <IconWrapper
                                          icon={child.icon}
                                          isActive={childIsActive}
                                          className="w-3.5 h-3.5"
                                        />
                                        <motion.span
                                          initial="hidden"
                                          animate="visible"
                                          variants={contentVariants}
                                          className="text-sm font-medium truncate"
                                        >
                                          {child.label}
                                        </motion.span>
                                      </Link>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      // Regular menu item
                      <div
                        onClick={() => {
                          if (item.onClick) item.onClick();
                          navigate(item.href);
                        }}
                        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-sky-100 text-sky-700 shadow-sm border-l-2 border-sky-500"
                            : "hover:bg-sky-50 text-gray-600 hover:text-sky-700"
                        }`}
                      >
                        <div className="relative">
                          <IconWrapper icon={item.icon} isActive={isActive} />

                          {/* Badge pour notifications */}
                          {(item.badge && item.badge > 0) ||
                          item.showLoadingBadge ? (
                            <motion.span
                              initial="hidden"
                              animate="visible"
                              variants={badgeVariants}
                              className={`absolute -top-2 -right-2 min-w-4.5 h-4.5 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm ${
                                item.showLoadingBadge
                                  ? "bg-gray-400 animate-pulse"
                                  : "bg-rose-500 shadow-rose-500/30"
                              }`}
                            >
                              {item.showLoadingBadge
                                ? "⋯"
                                : item.badge! > 99
                                  ? "99+"
                                  : item.badge}
                            </motion.span>
                          ) : null}
                        </div>

                        <motion.div
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 1 }}
                          variants={contentVariants}
                          className="flex items-center justify-between flex-1 min-w-0"
                        >
                          <span className="text-sm font-medium truncate">
                            {item.label}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="w-1.5 h-1.5 bg-sky-500 rounded-full"
                            />
                          )}
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer avec déconnexion */}
            <div className="p-3 border-t border-sky-100 bg-white/80 backdrop-blur-sm">
              {/* Bouton déconnexion simple */}
              <motion.button
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-100 mb-2"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <motion.span
                  initial="hidden"
                  animate="visible"
                  variants={contentVariants}
                  className="text-sm font-medium text-rose-700"
                >
                  Déconnexion
                </motion.span>
              </motion.button>

              {/* Bouton déconnexion globale (admin seulement) */}
              {user?.role === "ADMIN" && (
                <motion.button
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogoutAll}
                  className="group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-100"
                >
                  <Shield className="w-4 h-4 text-orange-600" />
                  <motion.span
                    initial="hidden"
                    animate="visible"
                    variants={contentVariants}
                    className="text-sm font-medium text-orange-700"
                  >
                    Déconnecter tous
                  </motion.span>
                </motion.button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Bouton toggle seul quand sidebar est rétractée */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.button
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className="fixed left-3 top-3 z-50 p-2.5 bg-linear-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl shadow-lg shadow-sky-500/30 transition-all group"
            aria-label="Développer le menu"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay mobile */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggle}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Modal de confirmation déconnexion simple */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Déconnexion</h3>
                  <p className="text-sm text-gray-600">
                    Êtes-vous sûr de vouloir vous déconnecter ?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                >
                  Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmation déconnexion globale (admin seulement) */}
      <AnimatePresence>
        {showLogoutAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLogoutAllModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Déconnexion globale
                  </h3>
                  <p className="text-sm text-gray-600">
                    Déconnecter toutes les sessions utilisateurs actives ?
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Votre session admin sera préservée
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLogoutAllModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmLogoutAll}
                  className="flex-1 px-4 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  Déconnecter tous
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
