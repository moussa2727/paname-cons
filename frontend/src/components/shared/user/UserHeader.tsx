import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { navTabs } from "./UserHeader.config"; // Import from config file

interface UserHeaderProps {
  pageTitle: string;
  description: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  children?: ReactNode;
}

export const UserHeader = ({
  isLoading = false,
  onRefresh,
  children,
}: UserHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTabId =
    navTabs.find(
      (tab) =>
        location.pathname === tab.to ||
        location.pathname.startsWith(tab.to + "/"),
    )?.id || "rendezvous";

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 fixed top-0 left-0 right-0 z-50">
      <div className="px-4 py-3">
        {/* Barre supérieure */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200"
              title="Retour à l'accueil"
              aria-label="Retour à l'accueil"
            >
              <Home className="w-4 h-4 text-sky-600" />
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200 disabled:opacity-50"
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw
                className={`w-4 h-4 text-sky-600 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <nav className="flex gap-1.5 min-w-max">
            {navTabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shrink-0 relative ${
                    isActive
                      ? "bg-linear-to-r from-sky-500 to-sky-600 text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-sky-300 hover:bg-sky-50 active:scale-95"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <tab.icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-white" : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isActive ? "text-white" : "text-gray-700"
                    }`}
                  >
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

        {/* Contenu additionnel */}
        {children && <div className="mt-3">{children}</div>}
      </div>

      {/* Effet de séparation */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-sky-100 to-transparent"></div>
    </header>
  );
};
export type { UserHeaderProps };
