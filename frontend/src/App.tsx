import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { lazy } from "react";
import ErrorBoundary from "./components/shared/ui/ErrorBoundary";

// Layouts
import RootLayout from "./components/shared/Layouts/RootLayout";
import UserLayout from "./components/shared/Layouts/UserLayout";
import GestionnaireLayout from "./components/shared/Layouts/GestionnaireLayout";
import AuthLayout from "./components/shared/Layouts/AuthLayout";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/shared/ui/ScrollToTop";

const Notfound = lazy(() => import("./Notfound"));

// Pages publiques
const Home = lazy(() => import("./pages/(main)/Home"));
const Services = lazy(() => import("./pages/(main)/Services"));
const Contact = lazy(() => import("./pages/(main)/Contact"));
const About = lazy(() => import("./pages/(main)/About"));
const PDFViewer = lazy(() => import("./pages/(main)/PDFViewer"));

// Pages auth
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Pages user
const Profile = lazy(() => import("./pages/user/profile/MonProfile"));
const Maprocedure = lazy(() => import("./pages/user/procedures/Maprocedure"));
const MesRendezVous = lazy(
  () => import("./pages/user/rendezvous/MesRendezVous"),
);
const UserRendezVous = lazy(() => import("./pages/user/rendezvous/RendezVous"));

// Pages gestionnaire
const Statistiques = lazy(
  () => import("./pages/gestionnaire/statistiques/Statistiques"),
);
const Utilisateurs = lazy(
  () => import("./pages/gestionnaire/utilisateurs/Utilisateurs"),
);
const Destinations = lazy(
  () => import("./pages/gestionnaire/destinations/Destinations"),
);
const AdminRendezvous = lazy(
  () => import("./pages/gestionnaire/rendezvous/Rendezvous"),
);
const Messages = lazy(() => import("./pages/gestionnaire/messages/Messages"));
const Profil = lazy(() => import("./pages/gestionnaire/profil/Profil"));
const Procedures = lazy(
  () => import("./pages/gestionnaire/procedures/Procedures"),
);
const ProcedureDetail = lazy(
  () => import("./pages/gestionnaire/procedures/[id]"),
);

// ─── App : fournit le Router et le Toaster ──────────────────────────────────
function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <ErrorBoundary>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<RootLayout />}>
              <Route index element={<Home />} />
              <Route path="services" element={<Services />} />
              <Route path="contact" element={<Contact />} />
              <Route path="a-propos" element={<About />} />
            </Route>

            {/* Auth */}
            <Route
              path="/connexion"
              element={
                <AuthLayout>
                  <Login />
                </AuthLayout>
              }
            />
            <Route
              path="/inscription"
              element={
                <AuthLayout>
                  <Register />
                </AuthLayout>
              }
            />
            <Route
              path="/mot-de-passe-oublie"
              element={
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/reinitialiser-mot-de-passe"
              element={
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              }
            />

            {/* PDF */}
            <Route
              path="/documents/:documentName"
              element={
                <ErrorBoundary>
                  <PDFViewer />
                </ErrorBoundary>
              }
            />

            {/* Rendez-vous public */}
            <Route path="/rendez-vous" element={<UserRendezVous />} />

            {/* User */}
            <Route
              path="/user"
              element={
                <UserLayout>
                  <Outlet />
                </UserLayout>
              }
            >
              <Route path="mon-profil" element={<Profile />} />
              <Route path="mes-procedures" element={<Maprocedure />} />
              <Route path="mes-rendezvous" element={<MesRendezVous />} />
            </Route>

            {/* Gestionnaire */}
            <Route path="/gestionnaire" element={<GestionnaireLayout />}>
              <Route path="statistiques" element={<Statistiques />} />
              <Route path="utilisateurs" element={<Utilisateurs />} />
              <Route path="destinations" element={<Destinations />} />
              <Route path="rendezvous" element={<AdminRendezvous />} />
              <Route path="procedures" element={<Procedures />} />
              <Route path="procedures/:id" element={<ProcedureDetail />} />
              <Route path="messages" element={<Messages />} />
              <Route path="profil" element={<Profil />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Notfound />} />
          </Routes>
        </ErrorBoundary>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          // Style par défaut
          style: {
            background: "#363636",
            color: "#fff",
          },
          // Style pour les succès (VERT)
          success: {
            duration: 3000,
            style: {
              background: "#10b981", // Vert
              color: "#fff",
            },
            iconTheme: {
              primary: "#fff", // Icône blanche
              secondary: "#10b981", // Fond vert
            },
          },
          // Style pour les erreurs (ROUGE)
          error: {
            duration: 4000,
            style: {
              background: "#ef4444", // Rouge
              color: "#fff",
            },
            iconTheme: {
              primary: "#fff", // Icône blanche
              secondary: "#ef4444", // Fond rouge
            },
          },
          // Style personnalisé pour les warnings (ORANGE)
          custom: {
            duration: 3500,
            style: {
              background: "#f97316", // Orange
              color: "#fff",
            },
            iconTheme: {
              primary: "#fff", // Icône blanche
              secondary: "#f97316", // Fond orange
            },
          },
        }}
      />
    </>
  );
}

export default App;
