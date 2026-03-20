import { Helmet } from "react-helmet-async";
import Hero from "../../components/accueil/Hero";
import AboutSection from "../../components/shared/AboutSection";
import Valeur from "../../components/accueil/Valeur";
import CtaSection from "../../components/shared/CtaSection";
import Partners from "../../components/accueil/Partners";
import Contact from "../../components/shared/Contact";

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Paname Consulting - Immigration et Études à l'Étranger</title>
        <meta
          name="description"
          content="Paname Consulting - Votre partenaire pour l'immigration, les études à l'étranger et les projets internationaux"
        />
        <meta
          name="keywords"
          content="paname consulting, immigration, études étranger, accompagnement étudiants, universités"
        />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />

        {/* Meta tags pour Microsoft Edge et IE */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-TileImage" content="/paname-consulting.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Paname Consulting - Immigration et Études à l'Étranger"
        />
        <meta
          property="og:description"
          content="Paname Consulting - Votre partenaire pour l'immigration, les études à l'étranger et les projets internationaux"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/paname-consulting.jpg" />
        <meta property="og:site_name" content="Paname Consulting" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Paname Consulting - Immigration et Études à l'Étranger"
        />
        <meta
          name="twitter:description"
          content="Paname Consulting - Votre partenaire pour l'immigration, les études à l'étranger et les projets internationaux"
        />
        <meta name="twitter:image" content="/images/paname-consulting.png" />

        {/* Performance et sécurité */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </Helmet>
      <div className="min-h-screen">
        <Hero />
        <AboutSection />
        <Valeur />
        <Partners />
        <Contact />
        <CtaSection />
      </div>
    </>
  );
};

export default HomePage;
