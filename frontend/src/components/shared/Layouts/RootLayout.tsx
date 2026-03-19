import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Footer from "../../../components/shared/ui/Footer";
import Header from "../../../components/shared/ui/Header";
import Loader from "../../../components/accueil/Loader";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const RootLayout = () => {
  const location = useLocation();
  const [showHomeLoader, setShowHomeLoader] = useState(
    location.pathname === "/",
  );

  useEffect(() => {
    // Nettoyer les timeouts précédents
    const timeoutId = window.setTimeout(() => {
      setShowHomeLoader(false);
    }, 3000);

    // Nettoyage lors du démontage ou changement de route
    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  // Afficher le loader si nécessaire
  if (location.pathname === "/" && showHomeLoader) {
    return <Loader />;
  }

  return (
    <>
      <Helmet>
        <title>Paname Consulting</title>
        <meta
          name="description"
          content="Paname Consulting - Votre partenaire expert pour l'immigration, les études à l'étranger et les projets internationaux"
        />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <Header />
        </header>
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <Footer />
        </footer>
      </div>
    </>
  );
};

export default RootLayout;
