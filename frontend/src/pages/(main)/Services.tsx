import { Helmet } from "react-helmet-async";
import CtaSection from "../../components/shared/CtaSection";
import DestinationQuiz from "../../components/services/DestinationQuiz";
import ServicesGrid from "../../components/services/ServicesGrid";
import Destination from "../../components/services/Destination";

const Services = () => {
  return (
    <>
      <Helmet>
        <title>Services - Paname Consulting</title>
        <meta
          name="description"
          content="Découvrez tous les services de Paname Consulting : immigration, études à l'étranger, orientation universitaire et plus"
        />
        <meta
          name="keywords"
          content="services, consulting, immigration, études, orientation, universités"
        />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />

        {/* Microsoft Edge / IE */}
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
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Open Graph */}
        <meta property="og:title" content="Services - Paname Consulting" />
        <meta
          property="og:description"
          content="Découvrez tous les services de Paname Consulting : immigration, études à l'étranger, orientation universitaire et plus"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/paname-consulting.png" />
        <meta property="og:site_name" content="Paname Consulting" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Services - Paname Consulting" />
        <meta
          name="twitter:description"
          content="Découvrez tous les services de Paname Consulting : immigration, études à l'étranger, orientation universitaire et plus"
        />
        <meta name="twitter:image" content="/images/paname-consulting.png" />

        {/* Performance et sécurité */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </Helmet>
      <div className="min-h-screen mt-18">
        <ServicesGrid />
        <Destination />
        <DestinationQuiz />
        <CtaSection />
      </div>
    </>
  );
};

export default Services;
