import { Helmet } from "react-helmet-async";
import CtaSection from "../../components/shared/CtaSection";
import AboutSection from "../../components/shared/AboutSection";
import { WhyUs } from "../../components/about/WhyUs";
import Mission from "../../components/about/Mission";
import FrenchSchool from "../../components/about/FrenchSchool";

const About = () => {
  return (
    <>
      <Helmet>
        <title>À Propos - Paname Consulting</title>
        <meta
          name="description"
          content="Découvrez l'histoire de Paname Consulting, notre mission et nos valeurs. Depuis 2023, nous accompagnons les étudiants vers l'excellence académique internationale."
        />
        <meta
          name="keywords"
          content="paname consulting, à propos, histoire, mission, valeurs, étudiants internationaux, accompagnement"
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
        <meta property="og:title" content="À Propos - Paname Consulting" />
        <meta
          property="og:description"
          content="Découvrez l'histoire de Paname Consulting, notre mission et nos valeurs. Depuis 2023, nous accompagnons les étudiants vers l'excellence académique internationale."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/paname-consulting.jpg" />
        <meta property="og:site_name" content="Paname Consulting" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="À Propos - Paname Consulting" />
        <meta
          name="twitter:description"
          content="Découvrez l'histoire de Paname Consulting, notre mission et nos valeurs. Depuis 2023, nous accompagnons les étudiants vers l'excellence académique internationale."
        />
        <meta name="twitter:image" content="/images/paname-consulting.jpg" />

        {/* Performance et sécurité */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </Helmet>
      <div className="min-h-screen mt-18">
        <AboutSection />
        <Mission />
        <WhyUs />

        <FrenchSchool />

        {/* CTA */}
        <CtaSection />
      </div>
    </>
  );
};

export default About;
