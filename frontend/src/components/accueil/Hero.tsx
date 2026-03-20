import { Link, useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  const countries = [
    { name: "Chine", slug: "chine" },
    { name: "France", slug: "france" },
    { name: "Chypre", slug: "chypre" },
    { name: "Maroc", slug: "maroc" },
    { name: "Turquie", slug: "turquie" },
    { name: "Tunisie", slug: "tunisie" },
    { name: "Espagne", slug: "espagne" },
    { name: "Russie", slug: "russie" },
  ];

  const handleDestinationClick = (countrySlug: string) => {
    navigate(`/documents/${countrySlug}`);
  };

  return (
    <>
      <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center bg-sky-200 overflow-hidden mt-16 lg:mt-28">
        {/* Fond décoratif */}
        <div className="absolute inset-0 z-0">
          <div className="absolute right-0 top-0 w-full lg:w-1/2 h-full opacity-20 lg:opacity-50">
            <img
              src="/images/Heroimage.avif"
              alt="Collaboration internationale"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-slate-50 via-slate-50/80 to-transparent" />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-30 md:gap-36 lg:gap-55 py-8 md:py-12">
            {/* Partie gauche : texte */}
            <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight">
                <span className="block text-sky-500 text-3xl md:text-4xl lg:text-5xl">
                  PANAME <span className="text-black">CONSULTING</span>
                </span>
                <span className="block text-2xl md:text-3xl lg:text-4xl text-slate-600 mt-2">
                  LE CAP VERS L'EXCELLENCE
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0">
                Depuis 2023, notre équipe multiculturelle accompagne les
                étudiants ambitieux vers les meilleures universités du monde. De
                la sélection du programme jusqu'à votre installation, nous
                transformons vos ambitions en réussites concrètes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/rendez-vous"
                  className="w-full sm:w-auto px-5 py-3 bg-sky-500 hover:bg-sky-600 hover:text-black text-white font-semibold rounded shadow-lg transition-colors duration-300 inline-block text-center min-w-[140px]"
                >
                  Rendez-Vous
                </Link>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-sky-600 hover:text-white text-black font-semibold rounded shadow-lg transition-colors duration-300 inline-block text-center min-w-[140px]"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Partie droite : carte Notre Impact */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-slate-800 mb-4 md:mb-6">
                  Notre Impact
                </h2>
                <p className="text-base md:text-lg text-center text-sky-700 font-medium mb-6 md:mb-8">
                  Chiffres clés depuis notre création
                </p>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {/* Carte 1 */}
                  <div className="bg-white/25 rounded p-3 md:p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow text-center">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-sky-500 mb-1">
                      3+
                    </div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-slate-700">
                      Années d'expérience
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                      Depuis 2023
                    </div>
                  </div>

                  {/* Carte 2 */}
                  <div className="bg-white/25 rounded p-3 md:p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow text-center">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-sky-500 mb-1">
                      8+
                    </div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-slate-700">
                      Pays partenaires
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                      À travers le monde
                    </div>
                  </div>

                  {/* Carte 3 */}
                  <div className="bg-white/25 rounded p-3 md:p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow text-center">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-sky-500 mb-1">
                      100%
                    </div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-slate-700">
                      Accompagnement
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                      Personnalisé
                    </div>
                  </div>

                  {/* Carte 4 */}
                  <div className="bg-white/25 rounded p-3 md:p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow text-center">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-sky-500 mb-1">
                      2 ans
                    </div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-slate-700">
                      D'expertise
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                      Formation continue
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Explorez nos destinations - Pleine largeur */}
      <section className="w-full bg-sky-600 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center text-white mb-2 sm:mb-3">
            Explorez nos Destinations
          </h2>
          <p className="text-center text-sky-100 mb-4 sm:mb-5 md:mb-6 text-xs sm:text-sm md:text-base max-w-2xl mx-auto">
            Découvrez les opportunités d'études dans nos pays partenaires
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 md:gap-3">
            {countries.map((country, index) => (
              <button
                key={index}
                onClick={() => handleDestinationClick(country.slug)}
                className="bg-white/20 text-white px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full text-xs sm:text-sm md:text-base font-medium backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-105 cursor-pointer border border-white/30 group"
              >
                <span className="flex items-center gap-1.5">
                  {country.name}
                  <svg
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
