export const WhyUs = () => {
  return (
    <section className="py-20 bg-white">
      <div className="px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-sky-800 mb-4">
            Pourquoi choisir Paname Consulting ?
          </h2>
          <p className="text-lg text-sky-600 max-w-2xl mx-auto">
            Nous vous accompagnons à chaque étape de votre projet d'études à
            l'étranger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Avantage 1 */}
          <div className="text-left p-6 border border-gray-100 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-sky-300 cursor-pointer">
            <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white animate-pulse transition duration-100 ease-in-out"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Accompagnement personnalisé
            </h3>
            <p className="text-gray-600">
              Un conseiller dédié pour vous guider du choix de la destination à
              votre arrivée.
            </p>
          </div>

          {/* Avantage 2 */}
          <div className="text-left p-6 border border-gray-100 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-sky-300 cursor-pointer">
            <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white animate-pulse transition duration-200 ease-in-out"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Large choix de destinations
            </h3>
            <p className="text-gray-600">
              Plus de 15 destinations à travers le monde pour réaliser vos rêves
              d'études.
            </p>
          </div>

          {/* Avantage 3 */}
          <div className="text-left p-6 border border-gray-100 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-sky-300 cursor-pointer">
            <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white animate-pulse transition duration-300 ease-in-out"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Excellence
            </h3>
            <p className="text-gray-600">
              Nous visons l'excellence dans chaque aspect de notre
              accompagnement.
            </p>
          </div>

          {/* Avantage 4 */}
          <div className="text-left p-6 border border-gray-100 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-sky-300 cursor-pointer">
            <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white animate-pulse transition duration-400 ease-in-out"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Réseau d'anciens étudiants
            </h3>
            <p className="text-gray-600">
              Bénéficiez des conseils et retours d'expérience de nos anciens
              étudiants.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
