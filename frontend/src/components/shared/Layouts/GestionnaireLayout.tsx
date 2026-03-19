import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../hooks/useAuth";
import AdminSidebar from "../../../components/shared/admin/AdminSidebar";
import Loader from "../../../components/shared/admin/Loader";

const GestionnaireLayout = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Si en cours de chargement, afficher un spinner
  if (isLoading) {
    return <Loader />;
  }

  // Si non authentifié, rediriger vers la connexion
  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  // Si authentifié mais pas ADMIN, rediriger vers le profil user
  if (user?.role !== "ADMIN") {
    return <Navigate to="/user/mon-profil" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Administration - Paname Consulting</title>
        <meta
          name="description"
          content="Panneau d'administration de Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex bg-linear-to-br from-sky-50 via-white to-blue-50">
        {/* Sidebar avec tonalité sky/blue */}
        <AdminSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

        {/* Main Content avec design amélioré */}
        <main
          className={`flex-1 transition-all duration-300 overflow-x-hidden ${
            isCollapsed ? "ml-20" : "ml-70"
          }`}
        >
          <div className="p-4 md:p-6 lg:p-8 overflow-x-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default GestionnaireLayout;
