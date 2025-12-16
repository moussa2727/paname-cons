import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Helmet } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';

// ==================== COMPOSANTS COMMUNS ====================
// Composants réutilisables dans toute l'application
import Header from './components/Header';
import Footer from './components/Footer';
import Loader from './components/Loader';

// ==================== PAGES PUBLIQUES ====================
// Accessibles sans connexion, avec header et footer
import Accueil from './pages/Accueil';              // Page d'accueil
import Contact from './pages/Contact';              // Page contact
import Propos from './pages/Propos';                // Page à propos
import Services from './pages/Services';            // Page services
import NotFound from './pages/Notfound';            // Page 404
import RendezVous from './pages/user/rendezvous/RendezVous'; // Page rendez-vous (PUBLIQUE)

// ==================== PAGES D'AUTHENTIFICATION ====================
// Pages de connexion, inscription, récupération mot de passe
import Connexion from './pages/Connexion';               // Connexion utilisateur
// import Inscription from './pages/Inscription';           // Inscription nouveau compte
// import MotdePasseoublie from './pages/MotdePasseoublie'; // Mot de passe oublié

// ==================== PAGES ADMIN (CHARGEMENT LAZY) ====================
// Chargées uniquement lorsqu'elles sont nécessaires (optimisation performances)
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement')); // Gestion utilisateurs
const AdminLayout = lazy(() => import('./AdminLayout'));                     // Layout admin
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));     // Messages contact
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));       // Profil admin
const AdminProcedure = lazy(() => import('./pages/admin/AdminProcedure'));   // Gestion procédures
const AdminDestinations = lazy(() => import('./pages/admin/AdminDestinations')); // Gestion destinations
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));   // Tableau de bord admin
const AdminRendezVous = lazy(() => import('./pages/admin/AdminRendez-Vous')); // Gestion rendez-vous admin

// ==================== COMPOSANT DE SÉCURITÉ ====================
// Restreint l'accès aux pages admin
import RequireAdmin from './context/RequireAdmin';

// ==================== PAGES UTILISATEUR ====================
// Pages privées nécessitant une connexion utilisateur
// import MesRendezVous from './pages/user/rendezvous/MesRendezVous'; // Liste des rendez-vous de l'utilisateur
// import UserProfile from './pages/user/UserProfile';               // Profil utilisateur
// import UserProcedure from './pages/user/UserProcedure';           // Suivi de procédure utilisateur
// import ResetPassword from './components/auth/ResetPassword';      // Réinitialisation mot de passe

// ==================== LAYOUTS ====================

// Layout pour les pages publiques (avec header et footer)
const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <Header />
      <main className='flex-1 mt-20'>{children}</main>
      <Footer />
    </div>
  );
};

// Layout minimal (sans header ni footer - pour formulaires, espace utilisateur/admin)
const MinimalLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <main className='flex-1'>{children}</main>
    </div>
  );
};

function App() {
  const location = useLocation();
  const [navigationKey, setNavigationKey] = useState(0);
  const { isLoading, isAuthenticated, user } = useAuth();
  const [isAOSInitialized, setIsAOSInitialized] = useState(false);

  // Fonction pour scroll vers le haut de la page
  const safeScrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (typeof globalThis.window === 'undefined') return;

    try {
      globalThis.window.scrollTo({
        top: 0,
        behavior: behavior,
      });
    } catch {
      globalThis.window.scrollTo(0, 0);
    }
  }, []);

  // Scroll vers le haut à chaque changement de route
  useEffect(() => {
    safeScrollToTop();

    const handlePopState = () => {
      safeScrollToTop('auto');
      setNavigationKey(prev => prev + 1);
    };

    globalThis.window.addEventListener('popstate', handlePopState);
    return () => {
      globalThis.window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, safeScrollToTop]);

  // Initialisation des animations AOS (scroll animations)
  useEffect(() => {
    if (typeof globalThis.window === 'undefined' || isAOSInitialized) return;

    AOS.init({
      duration: 600,
      once: true,
      easing: 'ease-out-cubic',
      offset: 50,
    });

    setIsAOSInitialized(true);
  }, [isAOSInitialized]);

  // Afficher un loader pendant le chargement de l'authentification
  if (isLoading) {
    return <Loader />;
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>
          Paname Consulting - Études à l'Étranger, Voyages d'Affaires & demandes
          de Visas
        </title>
        <meta
          name='description'
          content="Paname Consulting : expert en accompagnement étudiant à l'étranger, organisation de voyages d'affaires et demandes de visa. Conseil personnalisé pour votre réussite internationale."
        />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=5" 
        />
        <link rel="icon" href="/paname-consulting.ico" sizes="any" />
        <link rel="icon" href="/paname-consulting.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/paname-consulting.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta property="og:url" content="https://panameconsulting.vercel.app" />
      </Helmet>

      <div key={navigationKey}>
        <Routes>
          {/* ==================== PAGES PUBLIQUES (Accessibles sans connexion) ==================== */}
          
          {/* Page d'accueil - Présentation de l'entreprise */}
          <Route
            path='/'
            element={
              <PublicLayout>
                <Accueil />
              </PublicLayout>
            }
          />

          {/* Page services - Détail des services proposés */}
          <Route
            path='/services'
            element={
              <PublicLayout>
                <Services />
              </PublicLayout>
            }
          />

          {/* Page contact - Formulaire de contact */}
          <Route
            path='/contact'
            element={
              <PublicLayout>
                <Contact />
              </PublicLayout>
            }
          />

          {/* Page à propos - Histoire et valeurs de l'entreprise */}
          <Route
            path='/a-propos'
            element={
              <PublicLayout>
                <Propos />
              </PublicLayout>
            }
          />

          {/* ==================== FORMULAIRES D'AUTHENTIFICATION ==================== */}
          
          {/* Page connexion - Connexion à un compte existant */}
          <Route
            path='/connexion-admin'
            element={
              // Si déjà connecté, redirection selon le rôle
              isAuthenticated ? (
                <Navigate
                  to={user?.role === 'admin' || user?.isAdmin === true 
                    ? '/gestionnaire/statistiques' 
                    : '/'}
                  replace
                />
              ) : (
                <MinimalLayout>
                  <Connexion />
                </MinimalLayout>
              )
            }
          />

          {/* Page inscription - Création d'un nouveau compte */}
          {/* <Route
            path='/inscription'
            element={
              isAuthenticated ? (
                <Navigate
                  to={user?.role === 'admin' || user?.isAdmin === true 
                    ? '/gestionnaire/statistiques' 
                    : '/'}
                  replace
                />
              ) : (
                <MinimalLayout>
                  <Inscription />
                </MinimalLayout>
              )
            }
          /> */}

          {/* Page mot de passe oublié - Récupération de compte */}
          {/* <Route
            path='/mot-de-passe-oublie'
            element={
              isAuthenticated ? (
                <Navigate
                  to={user?.role === 'admin' || user?.isAdmin === true 
                    ? '/gestionnaire/statistiques' 
                    : '/'}
                  replace
                />
              ) : (
                <MinimalLayout>
                  <MotdePasseoublie />
                </MinimalLayout>
              )
            }
          /> */}

          {/* Réinitialisation mot de passe - Formulaire après clic sur lien email */}
          {/* <Route
            path='/reset-password'
            element={
              <MinimalLayout>
                <ResetPassword />
              </MinimalLayout>
            }
          /> */}

          {/* ==================== PAGES UTILISATEUR (Privées - nécessitent connexion) ==================== */}
          
          {/* Mes rendez-vous - Consultation des rendez-vous passés et à venir */}
          {/* <Route
            path='/mes-rendez-vous'
            element={
              isAuthenticated ? (
                <MinimalLayout>
                  <MesRendezVous />
                </MinimalLayout>
            ) : (
              // Redirection vers la page de connexion si non authentifié
              <Navigate
                to='/connexion'
                replace
                state={{ from: location.pathname }}
              />
            )
          }
          /> */}

          {/* Mon profil - Gestion des informations personnelles */}
          {/* <Route
            path='/mon-profil'
            element={
              isAuthenticated ? (
                <MinimalLayout>
                  <UserProfile />
                </MinimalLayout>
              ) : (
                <Navigate
                  to='/connexion'
                  replace
                  state={{ from: location.pathname }}
                />
              )
            }
          /> */}

          {/* Ma procédure - Suivi des procédures d'admission */}
          {/* <Route
            path='/ma-procedure'
            element={
              isAuthenticated ? (
                <MinimalLayout>
                  <UserProcedure />
                </MinimalLayout>
              ) : (
                <Navigate
                  to='/connexion'
                  replace
                  state={{ from: location.pathname }}
                />
              )
            }
          /> */}

          {/* ==================== PAGE RENDEZ-VOUS (PUBLIQUE) ==================== */}
          
          {/* Page rendez-vous - Création d'un rendez-vous (Publique - accessible sans connexion) */}
          <Route
            path='/rendez-vous'
            element={
              <MinimalLayout>
                <RendezVous />
              </MinimalLayout>
            }
          />

          {/* ==================== PAGES ADMIN (Privées - Requiert rôle admin) ==================== */}
          
          {/* Route parent pour l'espace admin avec layout spécifique */}
          <Route
            path='/gestionnaire/*'
            element={
              <RequireAdmin>
                <Suspense fallback={<Loader />}>
                  <AdminLayout />
                </Suspense>
              </RequireAdmin>
            }
          >
            {/* Redirection par défaut vers le tableau de bord admin */}
            <Route index element={<Navigate to='statistiques' replace />} />
            
            {/* Sous-routes de l'espace admin */}
            <Route path='utilisateurs' element={<UsersManagement />} />      {/* Gestion des comptes utilisateurs */}
            <Route path='statistiques' element={<AdminDashboard />} />       {/* Statistiques et indicateurs */}
            <Route path='messages' element={<AdminMessages />} />            {/* Messages reçus via le formulaire contact */}
            <Route path='procedures' element={<AdminProcedure />} />         {/* Gestion des procédures d'admission */}
            <Route path='profil' element={<AdminProfile />} />               {/* Profil administrateur */}
            <Route path='destinations' element={<AdminDestinations />} />    {/* Gestion des destinations proposées */}
            <Route path='rendez-vous' element={<AdminRendezVous />} />       {/* Gestion des rendez-vous (vue admin) */}
          </Route>

          {/* ==================== PAGE 404 ==================== */}
          
          <Route path='*' element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;