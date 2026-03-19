const AboutSection = () => {
  return (
    <section className="relative py-16 md:py-24 bg-white overflow-hidden font-['Inter',sans-serif]">
      {/* Décorations de fond épurées : seulement quelques accents légers */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-2xl -translate-y-1/2" />

      <div className="mx-auto px-6 relative z-10">
        {/* En-tête de section centré sur mobile, aligné à gauche sur desktop */}
        <div className="text-center lg:text-left max-w-3xl mb-12 lg:mb-16">
          <span className="text-sky-600 font-bold text-sm tracking-[0.2em] uppercase">
            Qui sommes-nous
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-3">
            Votre partenaire de confiance pour{" "}
            <br className="hidden md:block" />
            <span className="text-sky-600">une mobilité sans frontières</span>
          </h2>
          <div className="w-16 h-1 bg-sky-600 mt-4 mx-auto lg:ml-0 rounded-full"></div>
        </div>

        {/* Grille principale */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center lg:items-center">
          {/* COLONNE GAUCHE : Image (50% de la section) */}
          <div className="relative lg:w-1/2 shrink-0">
            {/* Fond sky pour la section image */}
            <div className="absolute inset-0 bg-sky-100 rounded-2xl -z-10"></div>

            {/* Étoiles décoratives en diagonale de part en part */}
            <div className="absolute top-2 right-2 text-sky-300/40 animate-pulse">
              ✦
            </div>
            <div className="absolute top-8 right-8 text-sky-400/35 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-14 right-14 text-sky-300/30 animate-pulse">
              ✦
            </div>
            <div className="absolute top-20 right-20 text-sky-400/45 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-26 right-26 text-sky-300/35 animate-pulse">
              ✦
            </div>
            <div className="absolute top-32 right-32 text-sky-400/40 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-38 right-38 text-sky-300/50 animate-pulse">
              ✦
            </div>
            <div className="absolute top-44 right-44 text-sky-400/30 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-50 right-50 text-sky-300/45 animate-pulse">
              ✦
            </div>
            <div className="absolute top-56 right-56 text-sky-400/35 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-62 right-62 text-sky-300/40 animate-pulse">
              ✦
            </div>
            <div className="absolute top-68 right-68 text-sky-400/50 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-74 right-74 text-sky-300/35 animate-pulse">
              ✦
            </div>
            <div className="absolute top-80 right-80 text-sky-400/45 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-86 right-86 text-sky-300/40 animate-pulse">
              ✦
            </div>
            <div className="absolute top-92 right-92 text-sky-400/35 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-98 right-98 text-sky-300/50 animate-pulse">
              ✦
            </div>
            <div className="absolute top-104 right-104 text-sky-400/30 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-110 right-110 text-sky-300/45 animate-pulse">
              ✦
            </div>
            <div className="absolute top-116 right-116 text-sky-400/35 animate-pulse-slow">
              ✧
            </div>
            <div className="absolute top-122 right-122 text-sky-300/40 animate-pulse">
              ✦
            </div>
            <div className="absolute top-128 right-128 text-sky-400/50 animate-pulse-slow">
              ✧
            </div>

            {/* Conteneur d'image : Taille doublée */}
            <div className="relative z-10 mx-auto rounded-2xl w-48 sm:w-56 h-56 md:w-64 md:h-64 lg:w-96 lg:h-96 xl:w-md xl:h-112 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="/images/CEOPANAME.webp"
                alt="Photo de Sangare Damini"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>

            {/* Décoration minimaliste (un simple cadre fin) */}
            <div className="absolute -bottom-3 -right-3 w-full h-full border border-slate-200 rounded-2xl z-0" />

            {/* Badge CEO discret */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 text-center min-w-[160px] z-20">
              <p className="font-bold text-slate-900 text-sm">Sangare Damini</p>
              <p className="text-sky-600 text-[10px] font-black uppercase">
                Fondateur & CEO
              </p>
            </div>
          </div>

          {/* COLONNE DROITE : Texte et Valeurs (50% de la section) */}
          <div className="lg:w-1/2 space-y-8">
            <div className="space-y-4 text-center lg:text-left">
              <p className="text-lg text-slate-700 leading-relaxed font-semibold italic">
                "Notre mission : vous offrir un accompagnement sur mesure pour
                vos projets d'études à l'étranger, dans un monde en constante
                mutation."
              </p>

              <div className="space-y-3">
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  <span className="font-semibold text-sky-700">
                    Paname Consulting
                  </span>{" "}
                  est né d'un constat simple : les étudiants francophones
                  rencontrent trop d'obstacles dans leur projet d'études à
                  l'étranger. Notre fondateur, fort de son expérience
                  internationale, a créé une solution d'accompagnement
                  sur-mesure, de la sélection de la destination jusqu'à
                  l'installation sur place.
                </p>

                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  Aujourd'hui,{" "}
                  <span className="font-semibold text-sky-700">
                    PANAME CONSULTING
                  </span>{" "}
                  est votre passerelle vers l'international, portée par une
                  équipe multiculturelle passionnée par l'éducation et
                  l'accompagnement. Nous sommes engagés à{" "}
                  <span className="font-semibold text-slate-800 bg-sky-50 px-1.5 py-0.5 rounded">
                    briser les barrières de la mobilité internationale
                  </span>{" "}
                  en offrant à chaque talent un accompagnement d'excellence,
                  humain et personnalisé, transformant ainsi vos ambitions
                  globales en réussites concrètes.
                </p>

                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  Nous transformons l'éducation en opportunités mondiales grâce
                  à un accompagnement sur-mesure pour vos projets en{" "}
                  <span className="font-medium text-sky-600">France</span>,{" "}
                  <span className="font-medium text-sky-600">Canada</span>,{" "}
                  <span className="font-medium text-sky-600">Turquie</span> et
                  bien d'autres destinations.
                </p>
              </div>
            </div>

            <div className="pl-6 border-l-4 border-sky-600 py-2">
              <p className="text-slate-600 italic text-sm md:text-base">
                "L'éducation est le passeport pour l'avenir, car demain
                appartient à ceux qui s'y préparent aujourd'hui." :
                <b>" Malcolm X "</b>
              </p>
            </div>
          </div>
        </div>
        {/* Citation Finale épurée */}
        <div className="relative p-8 mt-12 rounded bg-linear-to-br from-sky-100 to-sky-200 text-slate-800 overflow-hidden">
          <svg
            className="absolute top-4 left-4 w-12 h-12 text-slate-400/20"
            fill="currentColor"
            viewBox="0 0 32 32"
          >
            <path d="M10 8v8H6v4h4v4h4v-8h-4V8h-4zm12 0v8h-4v4h4v4h4v-8h-4V8h-4z" />
          </svg>
          <p className="relative z-10 text-lg italic font-light leading-relaxed">
            "Ensemble, transformons vos ambitions en réussites concrètes, mettez
            le cap vers l'excellence."
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-8 h-0.5 bg-sky-700" />
            <span className="text-sky-600 text-sm font-bold uppercase tracking-widest">
              Paname Consulting Team
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
