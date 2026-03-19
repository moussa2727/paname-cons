import { Heart, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";

function Valeur() {
  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-sky-800 sm:text-3xl">
            Nos Valeurs Fondamentales
          </h2>
          <p className="mt-4 text-lg text-sky-600">
            Des principes qui guident nos actions et façonnent notre avenir.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:gap-10 lg:gap-12 sm:grid-cols-2 lg:grid-cols-4 justify-between">
          <div className="bg-white rounded shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-sky-200 border border-transparent cursor-pointer">
            <div className="px-6 py-8 text-left">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-sky-500 text-white mb-4">
                <Heart className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-medium text-sky-900">
                  Passion
                </h3>
                <p className="mt-2 text-sm text-sky-600">
                  Nous sommes animés par une passion profonde pour ce que nous
                  faisons.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-sky-200 border border-transparent cursor-pointer">
            <div className="px-6 py-8 text-left">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-sky-500 text-white mb-4">
                <Lightbulb className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-medium text-sky-900">
                  Innovation
                </h3>
                <p className="mt-2 text-sm text-sky-600">
                  Nous recherchons constamment de nouvelles idées et des
                  solutions créatives.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-sky-200 border border-transparent cursor-pointer">
            <div className="px-6 py-8 text-left">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-sky-500 text-white mb-4">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-medium text-sky-900">
                  Intégrité
                </h3>
                <p className="mt-2 text-sm text-sky-600">
                  Nous agissons avec honnêteté, transparence et éthique.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-sky-200 border border-transparent cursor-pointer">
            <div className="px-6 py-8 text-left">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-sky-500 text-white mb-4">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-medium text-sky-900">
                  Excellence
                </h3>
                <p className="mt-2 text-sm text-sky-600">
                  Nous nous engageons à atteindre les plus hauts standards de
                  qualité.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Valeur;
