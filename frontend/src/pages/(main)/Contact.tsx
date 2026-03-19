import { Helmet } from "react-helmet-async";
import Contact from "../../components/shared/Contact";
import Faq from "../../components/contact/Faq";
import CtaSection from "../../components/shared/CtaSection";

const ContactPage = () => {
  return (
    <>
      <Helmet>
        <title>Contact - Paname Consulting</title>
        <meta
          name="description"
          content="Contactez Paname Consulting pour toute demande d'information sur nos services d'accompagnement d'étudiants internationaux. Formulaire de contact et coordonnées."
        />
        <meta
          name="keywords"
          content="contact, paname consulting, formulaire, email, téléphone, accompagnement étudiants"
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
        <meta
          name="msapplication-TileImage"
          content="/images/paname-consulting.png"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Contact - Paname Consulting" />
        <meta
          property="og:description"
          content="Contactez Paname Consulting pour toute demande d'information sur nos services d'accompagnement d'étudiants internationaux. Formulaire de contact et coordonnées."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/paname-consulting.jpg" />
        <meta property="og:site_name" content="Paname Consulting" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact - Paname Consulting" />
        <meta
          name="twitter:description"
          content="Contactez Paname Consulting pour toute demande d'information sur nos services d'accompagnement d'étudiants internationaux. Formulaire de contact et coordonnées."
        />
        <meta name="twitter:image" content="/images/paname-consulting.jpg" />

        {/* Performance et sécurité */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </Helmet>
      <div className="min-h-screen mt-23">
        {/* Section Contact - Utilisation du composant shared */}
        <Contact />
        <Faq />
        <CtaSection />
      </div>
    </>
  );
};

export default ContactPage;
