
import { ExternalLink, MapPin, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion} from 'framer-motion';

const partners = [
  {
    id: 1,
    name: 'Supemir',
    location: 'Casablanca, Maroc',
    image: '/supemir.webp',
    link: 'https://www.supemir.com/',
    description: 'École supérieure de commerce et de management renommée au Maroc.',
    category: 'IT et MANAGEMENT',
    since: '2025',
  },
  {
    id: 2,
    name: "L'École Multimédia",
    location: 'Paris, France',
    image: '/Ecolemultimediafrance.webp',
    link: 'https://www.ecole-multimedia.com/',
    description: 'École pionnière dans la formation aux métiers du digital à Paris.',
    category: 'DIGITAL & MULTIMEDIA',
    since: '2025',
  },
  {
    id: 3,
    name: 'International Institute Ford Ghana',
    location: 'Accra, Ghana',
    image: '/internationalinstitute.png',
    link: 'https://visionfordgh.com/',
    description: "Institut international de formation innovant au Ghana et en Afrique de l'Ouest.",
    category: 'FORMATION EN ANGLAIS',
    since: '2025',
  },
  {
    id: 4,
    name: 'Université de Chongqing',
    location: 'Chongqing, Chine',
    image: '/universitechiongqing.png',
    link: 'https://english.cqu.edu.cn/',
    description: 'Université prestigieuse classée parmi les meilleures institutions de recherche en Chine.',
    category: 'RECHERCHE & INNOVATION',
    since: '2025',
  },
  {
    id: 5,
    name: 'HECF',
    location: 'Fès, Maroc',
    image: '/hecf.webp',
    link: 'https://hecf.ac.ma/',
    description: 'HECF Fès, institut international de formation avec des programmes innovants.',
    category: 'RECHERCHE & INNOVATION',
    since: '2026',
  },
  {
    id: 6,
    name: 'SUP\'MANAGEMENT',
    location: 'Fès, Maroc',
    image: '/supmanagement.webp',
    link: 'https://www.supmanagement.ma/',
    description: 'Sup\'Management, école de management internationale innovante.',
    category: 'RECHERCHE & INNOVATION',
    since: '2026',
  },
  {
    id: 7,
    name: 'Univers France Succès',
    location: 'Sarcelles, France',
    image: '/francesucces.webp',
    link: 'https://universfrancesucces.com/',
    description: 'Organisme d\'accompagnement international pour études en France et Afrique.',
    category: 'RECHERCHE & INNOVATION',
    since: '2026',
  },
  {
    id: 8,
    name: 'Inted Group',
    location: 'Paris, France',
    image: '/inted.webp',
    link: 'https://www.intedgroup.com/',
    description: 'Groupe international de formation basé à Paris avec programmes innovants.',
    category: 'RECHERCHE & INNOVATION',
    since: '2025',
  }
];

const Partners = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nombre de cartes visibles selon la taille d'écran
  const getVisibleCards = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  };

  const [visibleCards, setVisibleCards] = useState(getVisibleCards());

  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, partners.length - visibleCards);

  // Navigation
  const nextSlide = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  };

  // Défilement automatique continu
  useEffect(() => {
    if (partners.length <= visibleCards || isPaused) return;

    intervalRef.current = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, visibleCards, isPaused]);

  // Pause au survol
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Aller à un slide spécifique
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section 
      className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-sky-50 via-white to-blue-50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
          <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          transition={{ duration: 0.6 }}
          className='text-center mb-16 sm:mb-20'
        >
          <motion.h2
            id='partners-heading'
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className='text-4xl sm:text-5xl font-bold text-gray-900 mb-4'
          >
            Nos Institutions{' '}
            <span className='text-transparent bg-clip-text bg-linear-to-r from-sky-600 to-sky-600'>
              Partenaires
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className='text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed'
          >
            Collaborations exclusives avec des établissements d'excellence
            internationale pour offrir des opportunités éducatives et
            professionnelles uniques.
          </motion.p>
        </motion.div>


        {/* Container du carrousel */}
        <div 
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Boutons de navigation */}
          <motion.button
            onClick={prevSlide}
            className="absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
            aria-label="Partenaire précédent"
            whileHover={{ scale: 1.1, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
          </motion.button>

          <motion.button
            onClick={nextSlide}
            className="absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
            aria-label="Partenaire suivant"
            whileHover={{ scale: 1.1, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
          </motion.button>

          {/* Zone du carrousel */}
          <div className="overflow-hidden px-2">
            <motion.div
              className="flex"
              animate={{
                x: `-${currentIndex * (100 / visibleCards)}%`
              }}
              transition={{
                type: "tween",
                duration: 0.5,
                ease: "easeInOut"
              }}
            >
              {partners.map((partner, index) => (
                <div
                  key={partner.id}
                  className="shrink-0 px-3"
                  style={{ width: `${100 / visibleCards}%` }}
                >
                  <motion.div 
                    className="group bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 h-full relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)"
                    }}
                  >
                    {/* Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5 bg-white/90 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-200/50">
                        <Globe className="w-3.5 h-3.5" />
                        {partner.category}
                      </span>
                    </div>

                    {/* Image */}
                    <div className="relative h-48 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden">
                      <motion.div 
                        className="h-full w-full"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <img
                          src={partner.image}
                          alt={`Logo de ${partner.name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </motion.div>
                      <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
                    </div>

                    {/* Contenu */}
                    <div className="p-6">
                      <motion.h3 
                        className="text-xl font-bold text-gray-900 mb-2 line-clamp-1"
                        whileHover={{ color: "#0369a1" }}
                      >
                        {partner.name}
                      </motion.h3>

                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-sky-500 mr-2 shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {partner.location}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                        {partner.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        {partner.since && (
                          <div className="text-xs text-gray-500">
                            Depuis <span className="font-semibold text-sky-600">{partner.since}</span>
                          </div>
                        )}
                        {/* <div className="inline-flex items-center gap-1.5 bg-linear-to-r from-sky-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          <Star className="w-3 h-3" />
                          Actif
                        </div> */}
                      </div>

                      {/* Bouton */}
                      <motion.a
                        href={partner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-sky-50 text-sky-700 font-medium py-2.5 px-4 rounded-xl border border-sky-200/50"
                        whileHover={{ 
                          backgroundColor: "#e0f2fe",
                          scale: 1.02
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span>Visiter le site</span>
                        <ExternalLink className="w-4 h-4" />
                      </motion.a>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Indicateurs de slide */}
          <div className="flex justify-center items-center gap-2 mt-10">
            {Array.from({ length: Math.min(10, maxIndex + 1) }).map((_, index) => (
              <motion.button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full ${
                  index === currentIndex
                    ? 'w-8 bg-linear-to-r from-sky-500 to-blue-500'
                    : 'w-2 bg-gray-300'
                }`}
                aria-label={`Aller au partenaire ${index + 1}`}
                whileHover={{ 
                  backgroundColor: index !== currentIndex ? "#9ca3af" : undefined,
                  scale: 1.2
                }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  width: index === currentIndex ? 32 : 8
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;