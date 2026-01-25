import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function ConditionsGenerales() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Conditions Générales d'Utilisation - Paname Consulting</title>
        <meta
          name='description'
          content="Conditions générales d'utilisation de Paname Consulting - Services d'orientation académique internationale"
        />
        {/* noindex, nofollow */}
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
      </Helmet>

      <div className='min-h-screen bg-gradient-to-br from-sky-50 to-sky-100 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          <div className='bg-white rounded-2xl shadow-xl overflow-hidden'>
            {/* Header */}
            <div className='bg-gradient-to-r from-sky-600 to-sky-400 px-8 py-6'>
              <h1 className='text-3xl font-bold text-white text-center'>
                Conditions Générales d'Utilisation
              </h1>
              <p className='text-sky-100 text-center mt-2'>
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>

            {/* Content */}
            <div className='px-8 py-8 space-y-8'>
              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  Préambule
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Les présentes conditions générales d'utilisation (CGU)
                  régissent l'accès et l'utilisation de la plateforme Paname
                  Consulting. En utilisant nos services, vous acceptez sans
                  réserve ces conditions.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  1. Définitions
                </h2>
                <div className='space-y-2'>
                  <p className='text-gray-700'>
                    <strong>Plateforme :</strong> Désigne le site web et les
                    services proposés par Paname Consulting
                  </p>
                  <p className='text-gray-700'>
                    <strong>Utilisateur :</strong> Toute personne accédant et
                    utilisant la plateforme
                  </p>
                  <p className='text-gray-700'>
                    <strong>Services :</strong> Ensemble des prestations
                    d'orientation académique et d'accompagnement proposées
                  </p>
                  <p className='text-gray-700'>
                    <strong>Compte :</strong> Espace personnel créé par
                    l'utilisateur sur la plateforme
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  2. Objet des Services
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Paname Consulting propose des services d'orientation
                  académique personnalisée, d'assistance aux procédures
                  d'admission internationale, de préparation aux visas étudiants
                  et d'accompagnement dans les démarches administratives pour
                  les études à l'étranger.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  3. Inscription et Création de Compte
                </h2>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    3.1 Conditions d'inscription
                  </h3>
                  <ul className='list-disc list-inside text-gray-700 ml-4 space-y-1'>
                    <li>Être majeur ou avoir l'autorisation parentale</li>
                    <li>Fournir des informations exactes et complètes</li>
                    <li>Disposer d'une adresse e-mail valide</li>
                    <li>Accepter les présentes CGU</li>
                  </ul>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    3.2 Sécurité du compte
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    L'utilisateur est responsable de la confidentialité de ses
                    identifiants et de toute activité réalisée depuis son
                    compte. Toute suspicion de compromission doit être
                    immédiatement signalée.
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  4. Obligations des Utilisateurs
                </h2>
                <ul className='list-disc list-inside text-gray-700 ml-4 space-y-2'>
                  <li>Fournir des informations véridiques et à jour</li>
                  <li>Respecter les délais et procédures indiqués</li>
                  <li>Ne pas utiliser la plateforme à des fins illégales</li>
                  <li>Respecter les droits de propriété intellectuelle</li>
                  <li>Ne pas perturber le bon fonctionnement du service</li>
                  <li>
                    Communiquer de manière professionnelle et respectueuse
                  </li>
                </ul>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  5. Services Proposés
                </h2>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    5.1 Orientation académique
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Conseil personnalisé sur le choix d'établissements, de
                    programmes et de destinations adaptés au profil et aux
                    objectifs de l'étudiant.
                  </p>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    5.2 Assistance administrative
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Aide à la préparation des dossiers d'admission, des demandes
                    de visa et des documents nécessaires pour les études à
                    l'étranger.
                  </p>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    5.3 Préparation aux entretiens
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Coaching et préparation pour les entretiens d'admission avec
                    les établissements partenaires.
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  6. Tarifs et Paiement
                </h2>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    6.1 Grille tarifaire
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Les tarifs des services sont disponibles sur demande ou lors
                    du premier rendez-vous. Ils varient selon le type de service
                    et la complexité de la procédure.
                  </p>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    6.2 Modalités de paiement
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Les paiements s'effectuent selon les modalités convenues
                    lors de la signature du contrat de services. Un acompte peut
                    être exigé pour démarrer les procédures.
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  7. Propriété Intellectuelle
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  L'ensemble du contenu de la plateforme (textes, images, logos,
                  logiciels) est la propriété exclusive de Paname Consulting et
                  est protégé par le droit de la propriété intellectuelle. Toute
                  reproduction ou utilisation non autorisée est interdite.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  8. Responsabilité
                </h2>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    8.1 Limitation de responsabilité
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Paname Consulting s'engage à fournir des services de qualité
                    mais ne peut garantir l'obtention d'admissions ou de visas,
                    qui dépendent des décisions finales des établissements et
                    autorités compétentes.
                  </p>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    8.2 Force majeure
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Paname Consulting ne peut être tenue responsable en cas
                    d'impossibilité d'exécuter ses obligations due à un cas de
                    force majeure.
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  9. Confidentialité
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Les informations personnelles des utilisateurs sont traitées
                  conformément à notre politique de confidentialité. Nous nous
                  engageons à ne pas divulguer vos données à des tiers sans
                  votre consentement, sauf obligation légale.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  10. Résiliation
                </h2>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    10.1 Par l'utilisateur
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    L'utilisateur peut résilier son compte à tout moment en nous
                    contactant par email ou via son espace personnel.
                  </p>
                </div>
                <div className='space-y-3'>
                  <h3 className='text-lg font-medium text-gray-800'>
                    10.2 Par Paname Consulting
                  </h3>
                  <p className='text-gray-700 leading-relaxed'>
                    Nous nous réservons le droit de suspendre ou résilier un
                    compte en cas de violation des présentes CGU ou
                    d'utilisation abusive de la plateforme.
                  </p>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  11. Litiges
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  En cas de litige, les parties s'engagent à rechercher une
                  solution amiable. À défaut, le litige sera soumis à la
                  compétence des tribunaux compétents.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  12. Modifications des CGU
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Paname Consulting se réserve le droit de modifier ces
                  conditions générales. Les modifications seront notifiées aux
                  utilisateurs et prendront effet dès leur publication sur la
                  plateforme.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  13. Contact
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Pour toute question concernant ces conditions générales,
                  contactez-nous :
                </p>
                <div className='bg-sky-50 rounded-lg p-4 space-y-2'>
                  <p className='text-gray-700'>
                    <strong>Email :</strong> panameconsulting906@gmail.com
                  </p>
                  <p className='text-gray-700'>
                    <strong>Téléphone :</strong> +223 91 83 09 41
                  </p>
                  <p className='text-gray-700'>
                    <strong>Adresse :</strong> Kalaban Coura, Imm.Bore en face
                    de l'hôtel Wassulu
                  </p>
                </div>
              </section>

              {/* Lien vers l'accueil */}
              <div className='mt-8 pt-6 border-t border-sky-200'>
                <div className='text-center'>
                  <Link
                    to='/'
                    className='inline-flex items-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors duration-200'
                  >
                    <svg
                      className='w-5 h-5 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                      />
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
