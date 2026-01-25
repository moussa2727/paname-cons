import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function PolitiqueConfidentialite() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Politique de Confidentialité - Paname Consulting</title>
        <meta
          name='description'
          content='Politique de confidentialité de Paname Consulting - Protection de vos données personnelles'
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
                Politique de Confidentialité
              </h1>
              <p className='text-sky-100 text-center mt-2'>
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>

            {/* Content */}
            <div className='px-8 py-8 space-y-8'>
              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  Introduction
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Paname Consulting, s'engage à protéger la vie privée de ses
                  utilisateurs. Cette politique de confidentialité explique
                  comment nous collectons, utilisons, stockons et protégeons vos
                  informations personnelles lorsque vous utilisez notre
                  plateforme de services éducatifs internationaux.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  1. Données Collectées
                </h2>
                <div className='space-y-3'>
                  <div>
                    <h3 className='text-lg font-medium text-gray-800'>
                      1.1 Informations personnelles
                    </h3>
                    <ul className='list-disc list-inside text-gray-700 ml-4 space-y-1'>
                      <li>Nom, prénom et adresse e-mail</li>
                      <li>Numéro de téléphone</li>
                      <li>Date de naissance</li>
                      <li>Adresse postale</li>
                      <li>Informations académiques et professionnelles</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className='text-lg font-medium text-gray-800'>
                      1.2 Données techniques
                    </h3>
                    <ul className='list-disc list-inside text-gray-700 ml-4 space-y-1'>
                      <li>Adresse IP</li>
                      <li>Type de navigateur et système d'exploitation</li>
                      <li>Données de navigation et cookies</li>
                      <li>Informations sur l'utilisation de nos services</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  2. Utilisation des Données
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Vos données personnelles sont utilisées pour :
                </p>
                <ul className='list-disc list-inside text-gray-700 ml-4 space-y-2'>
                  <li>Fournir nos services d'orientation académique</li>
                  <li>Gérer vos rendez-vous et procédures administratives</li>
                  <li>Communiquer avec vous concernant vos demandes</li>
                  <li>
                    Améliorer nos services et votre expérience utilisateur
                  </li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                  <li>Assurer la sécurité de notre plateforme</li>
                </ul>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  3. Protection des Données
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Nous mettons en œuvre des mesures de sécurité techniques et
                  organisationnelles appropriées pour protéger vos données
                  contre :
                </p>
                <ul className='list-disc list-inside text-gray-700 ml-4 space-y-2'>
                  <li>L'accès non autorisé</li>
                  <li>
                    La modification, la destruction ou la perte accidentelle
                  </li>
                  <li>La divulgation non autorisée</li>
                  <li>Le traitement illicite</li>
                </ul>
                <p className='text-gray-700 leading-relaxed mt-3'>
                  Toutes les transmissions de données sont cryptées via SSL/TLS.
                </p>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  4. Partage des Données
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Nous ne partageons vos données personnelles qu'avec :
                </p>
                <ul className='list-disc list-inside text-gray-700 ml-4 space-y-2'>
                  <li>
                    Les établissements d'enseignement partenaires (avec votre
                    consentement)
                  </li>
                  <li>
                    Les autorités consulaires ou d'immigration (si nécessaire
                    pour vos procédures)
                  </li>
                  <li>
                    Nos prestataires de services techniques (hébergement, email,
                    etc.)
                  </li>
                  <li>Les autorités compétentes en cas d'obligation légale</li>
                </ul>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  5. Vos Droits
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Conformément à la réglementation applicable, vous disposez des
                  droits suivants :
                </p>
                <ul className='list-disc list-inside text-gray-700 ml-4 space-y-2'>
                  <li>
                    <strong>Droit d'accès :</strong> Consulter vos données
                    personnelles
                  </li>
                  <li>
                    <strong>Droit de rectification :</strong> Mettre à jour vos
                    informations
                  </li>
                  <li>
                    <strong>Droit de suppression :</strong> Demander la
                    suppression de vos données
                  </li>
                  <li>
                    <strong>Droit de limitation :</strong> Limiter le traitement
                    de vos données
                  </li>
                </ul>
              </section>

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  6. Contact
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Pour toute question concernant cette politique de
                  confidentialité ou l'exercice de vos droits, vous pouvez nous
                  contacter :
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

              <section className='space-y-4'>
                <h2 className='text-2xl font-semibold text-sky-700 border-b border-sky-200 pb-2'>
                  7. Modifications
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  Nous nous réservons le droit de modifier cette politique de
                  confidentialité. Les modifications seront publiées sur cette
                  page avec la date de mise à jour.
                </p>
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
