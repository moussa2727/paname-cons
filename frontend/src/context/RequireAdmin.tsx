import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';

interface RequireAdminProps {
  children: React.ReactNode;
  fallbackPath?: string;
  requiredRole?: 'admin';
}

const RequireAdmin = ({ 
  children, 
  fallbackPath = '/',
  requiredRole = 'admin'
}: RequireAdminProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Éviter le rendu côté serveur avec des incohérences
  if (!isClientSide) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/connexion" 
        replace 
        state={{ 
          from: location.pathname,
          message: 'Authentification requise pour accéder à cette page',
          isAdminRoute: true
        }} 
      />
    );
  }

  // Vérifier si l'utilisateur a le rôle requis
  const hasRequiredRole = user?.role === requiredRole;

  if (!hasRequiredRole) {
    // Si l'utilisateur n'a pas les droits, on le redirige
    return (
      <Navigate 
        to={fallbackPath} 
        replace 
        state={{ 
          from: location.pathname,
          message: 'Accès refusé. Vous ne disposez pas des droits nécessaires.'
        }} 
      />
    );
  }

  // Validation robuste du rôle admin
  const isAdmin = Boolean(
    user?.role === 'admin' || 
    user?.isAdmin === true
  );

  if (!isAdmin) {
    console.warn(`Tentative d'accès non autorisé à ${location.pathname} par l'utilisateur ${user?.email}`);
    
    return (
      <Navigate 
        to={fallbackPath} 
        replace 
        state={{ 
          error: 'Accès réservé aux administrateurs',
          from: location.pathname
        }} 
      />
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;