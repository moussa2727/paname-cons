import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { UserHeader } from "../../../components/shared/user/UserHeader";
import { usePageConfig } from "../../../hooks/UserHeader.hooks";
import Loader from "../../../components/shared/user/Loader";

type UserLayoutProps = {
  children: ReactNode;
};

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const currentPage = usePageConfig();

  // Si en cours de chargement, afficher un spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader loading={true} size="lg" />
      </div>
    );
  }

  // Si non authentifié, rediriger vers la connexion
  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name="description" content={currentPage.description} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-50">
        <UserHeader
          pageTitle={currentPage.pageTitle}
          description={currentPage.description}
        >
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  Connecté: {user?.email}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </UserHeader>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </>
  );
};

export default UserLayout;
