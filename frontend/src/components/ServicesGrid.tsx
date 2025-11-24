import React, { useEffect, useCallback } from 'react';
import {
  FiKey,
  FiEdit,
  FiBookOpen,
  FiFileText,
  FiUsers,
  FiBriefcase,
} from 'react-icons/fi';
// AOS is now initialized globally in App.tsx

const ServicesGrid = () => {

  // Mémoization des services pour éviter les recréations inutiles
  const services = React.useMemo(() => [
    {
      icon: <FiKey className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: "Création d'un Compte Pastel",
      description: 'Nous créons votre compte Pastel rapidement et en toute sécurité.',
      keywords: 'compte pastel, création compte, sécurité'
    },
    {
      icon: <FiEdit className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Saisie des Informations Personnelles',
      description: 'Saisie précise et sécurisée de vos informations personnelles.',
      keywords: 'informations personnelles, saisie données'
    },
    {
      icon: <FiBookOpen className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Choix des Universités et Formations',
      description: 'Conseils personnalisés pour choisir les meilleures universités.',
      keywords: 'universités, formations, orientation'
    },
    {
      icon: <FiFileText className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Lettre de Motivation',
      description: 'Rédaction de lettres de motivation percutantes et personnalisées.',
      keywords: 'lettre motivation, rédaction'
    },
    {
      icon: <FiUsers className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Préparation aux Entretiens',
      description: 'Préparation efficace et personnalisée pour vos entretiens.',
      keywords: 'préparation entretiens, simulation'
    },
    {
      icon: <FiBriefcase className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Assistance Demande de Visa',
      description: 'Accompagnement complet pour votre demande de visa.',
      keywords: 'visa, demande visa, assistance'
    },
  ], []);

  // Handler pour les interactions tactiles
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.98)';
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(1)';
  }, []);

  return (
    <section 
      className='pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-sky-50/70 to-white'
      aria-labelledby="services-heading"
    >
      <div className='max-w-7xl mx-auto'>
        {/* En-tête avec meilleure sémantique SEO */}
        <header className='text-center mb-12 sm:mb-16'>
          <div
            className='inline-flex items-center justify-center bg-gradient-to-r from-sky-500 to-sky-600 text-white px-3 py-1 sm:px-4 sm:py-1 rounded-full mb-3 sm:mb-4'
            data-aos='zoom-in'
            data-aos-delay='50'
          >
            <span className='text-xs sm:text-sm font-medium'>Nos services</span>
          </div>
          <h1
            id="services-heading"
            className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4'
            data-aos='fade-up'
            data-aos-delay='100'
          >
            Accompagnement complet pour vos études à l'étranger
          </h1>
          <p
            className='text-gray-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed'
            data-aos='fade-up'
            data-aos-delay='150'
          >
            Parcours simplifié de la création de compte à l'obtention de votre visa
          </p>
        </header>

        {/* Grid des services optimisée mobile-first */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
          {services.map((service, index) => (
            <article
              key={index}
              className='group relative bg-white p-5 sm:p-6 lg:p-7 rounded-xl border border-gray-100 shadow-xs sm:shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden hover:border-sky-100 active:scale-98'
              data-aos='fade-up'
              data-aos-delay={Math.min(index * 80, 400)} // Délai maximum limité
              data-aos-offset='40'
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              role="article"
              aria-label={`Service: ${service.title}`}
            >
              {/* Background gradient optimisé */}
              <div 
                className='absolute inset-0 bg-gradient-to-br from-sky-50/50 to-white opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 -z-0'
                aria-hidden="true"
              />

              {/* Contenu principal */}
              <div className='relative z-10'>
                {/* Icône avec taille responsive */}
                <div className='mb-4 sm:mb-5'>
                  <div
                    className='inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full text-sky-600 group-hover:text-white border border-sky-100 group-hover:border-sky-200 group-hover:bg-gradient-to-r from-sky-500 to-sky-600 shadow-xs group-hover:shadow-sm transition-all duration-300'
                    data-aos='zoom-in'
                    data-aos-delay={Math.min(index * 80 + 200, 600)}
                    aria-hidden="true"
                  >
                    {service.icon}
                  </div>
                </div>

                {/* Titre avec hiérarchie SEO */}
                <h2 className='text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight'>
                  {service.title}
                </h2>
                
                {/* Description avec meilleure lisibilité */}
                <p className='text-gray-600 text-sm sm:text-base leading-relaxed sm:leading-loose'>
                  {service.description}
                </p>
              </div>

              {/* Indicateur visuel pour l'accessibilité */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-500/0 to-transparent group-hover:via-sky-500/50 transition-all duration-300"
                aria-hidden="true"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(ServicesGrid);