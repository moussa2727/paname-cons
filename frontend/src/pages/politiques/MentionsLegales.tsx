import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function MentionsLegales() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Mentions Légales - Paname Consulting</title>
        <meta name="description" content="Mentions légales de Paname Consulting - Informations légales et coordonnées" />
         {/* noindex, nofollow */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-sky-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-400 px-8 py-6">
              <h1 className="text-3xl font-bold text-white text-center">
                Mentions Légales
              </h1>
              <p className="text-sky-100 text-center mt-2">
                Conformément aux dispositions légales
              </p>
            </div>

            {/* Content */}
            <div className="px-8 py-8 space-y-8">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Éditeur du Site
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700">
                    <strong>Raison sociale :</strong> PANAME CONSULTING
                  </p>
                  <p className="text-gray-700">
                    <strong>Nom :</strong> Damini Sangaré
                  </p>
                  <p className="text-gray-700">
                    <strong>Activité principale :</strong> Conseil en orientation académique internationale
                  </p>
                  <p className="text-gray-700">
                    <strong>Adresse :</strong> Kalaban Coura, Imm.Bore en face de l'hôtel Wassulu, Bamako, Mali
                  </p>
                  <p className="text-gray-700">
                    <strong>Téléphone :</strong> +223 91 83 09 41
                  </p>
                  <p className="text-gray-700">
                    <strong>Email :</strong> panameconsulting906@gmail.com
                  </p>
                </div>
              </section>



              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Propriété Intellectuelle
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  L'ensemble du contenu de ce site web, incluant mais non limité aux textes, 
                  images, graphismes, logos, vidéos, sons, logiciels et éléments de design, 
                  est la propriété exclusive de Paname Consulting ou de ses partenaires et est 
                  protégé par les lois en vigueur sur la propriété intellectuelle.
                </p>
                <p className="text-gray-700 leading-relaxed mt-3">
                  Toute reproduction, distribution, modification, adaptation, transmission ou 
                  publication, même partielle, de ces éléments est strictement interdite sans 
                  l'autorisation écrite préalable de Paname Consulting.
                </p>
              </section>



              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Liens Hypertextes
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Ce site peut contenir des liens vers des sites tiers. Paname Consulting 
                  n'exerce aucun contrôle sur ces sites et décline toute responsabilité 
                  quant à leur contenu, leurs politiques de confidentialité ou leurs pratiques.
                </p>
                <p className="text-gray-700 leading-relaxed mt-3">
                  La mise en place de liens vers ce site nécessite l'autorisation écrite 
                  préalable de Paname Consulting.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Limitation de Responsabilité
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Paname Consulting s'efforce de fournir des informations exactes et à jour 
                  sur ce site. Cependant, nous ne garantissons pas l'exhaustivité, la 
                  précision ou l'actualité des informations présentées.
                </p>
                <p className="text-gray-700 leading-relaxed mt-3">
                  En conséquence, l'utilisateur reconnaît utiliser ces informations sous 
                  sa responsabilité exclusive et décline toute responsabilité contre Paname 
                  Consulting pour tout dommage direct ou indirect résultant de leur utilisation.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Droit Applicable et Juridiction
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Les présentes mentions légales sont régies par le droit malien. Tout litige 
                  relatif à l'utilisation du site sera de la compétence exclusive des tribunaux 
                  de Bamako, Mali.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Modifications
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Paname Consulting se réserve le droit de modifier ces mentions légales 
                  à tout moment. Les modifications entreront en vigueur dès leur publication 
                  sur cette page.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2">
                  Contact
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Pour toute question concernant ces mentions légales ou pour exercer 
                  vos droits, vous pouvez nous contacter :
                </p>
                <div className="bg-sky-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700">
                    <strong>Email :</strong> panameconsulting906@gmail.com
                  </p>
                  <p className="text-gray-700">
                    <strong>Téléphone :</strong> +223 91 83 09 41
                  </p>
                  <p className="text-gray-700">
                    <strong>Adresse :</strong> Kalaban Coura, Imm.Bore en face de l'hôtel Wassulu, Bamako, Mali
                  </p>
                  <p className="text-gray-700">
                    <strong>Horaires :</strong> Du lundi au vendredi, 8h00 - 18h00 (GMT)
                  </p>
                </div>
              </section>

              {/* Lien vers l'accueil */}
              <div className="mt-8 pt-6 border-t border-sky-200">
                <div className="text-center">
                  <Link 
                    to="/" 
                    className="inline-flex items-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Retour à l'accueil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
