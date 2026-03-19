const services = [
  {
    id: 1,
    title: "Orientation et choix de destination",
    description:
      "Nous vous aidons à choisir la destination et le programme qui correspondent le mieux à votre profil, vos objectifs académiques et votre budget.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
    features: [
      "Analyse de votre profil académique",
      "Identification de vos objectifs",
      "Sélection des destinations adaptées",
      "Comparaison des programmes",
      "Conseils personnalisés",
    ],
  },
  {
    id: 2,
    title: "Accompagnement administratif",
    description:
      "Nous vous guidons à travers toutes les démarches administratives pour une inscription en toute sérénité dans l'établissement de votre choix.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    features: [
      "Aide à la constitution du dossier",
      "Vérification des documents requis",
      "Suivi des inscriptions",
      "Traduction de documents",
      "Gestion des délais",
    ],
  },
  {
    id: 3,
    title: "Préparation aux tests de langue",
    description:
      "Bénéficiez de ressources et de conseils pour réussir vos tests de langue (TOEFL, IELTS, TCF, DALF, etc.) et atteindre le niveau requis au de notre partenaire ghanéen qui propose des cours dédiés.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    ),
    features: [
      "Tests blancs",
      "Ressources d'entraînement",
      "Conseils méthodologiques",
      "Simulations d'examen",
      "Suivi de progression",
    ],
  },
  {
    id: 4,
    title: "Recherche de logement",
    description:
      "Nous vous aidons à trouver un logement adapté à vos besoins et à votre budget dans votre pays d'accueil.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    features: [
      "Recherche personnalisée",
      "Vérification des annonces",
      "Aide à la réservation",
      "Conseils sur les quartiers",
      "Assistance à l'installation",
    ],
  },
  {
    id: 5,
    title: "Obtention du visa",
    description:
      "Nous vous accompagnons dans toutes les étapes de votre demande de visa étudiant, de la constitution du dossier à l'entretien consulaire.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
    features: [
      "Préparation du dossier",
      "Simulation d'entretien",
      "Suivi de la demande",
      "Conseils personnalisés",
      "Assistance en cas de problème",
    ],
  },
  {
    id: 6,
    title: "Accueil et intégration",
    description:
      "Nous vous aidons à préparer votre arrivée et à vous intégrer dans votre nouveau pays d'accueil.",
    icon: (
      <svg
        className="w-12 h-12 text-sky-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    features: [
      "Guide de préparation au départ",
      "Informations pratiques",
      "Aide à l'ouverture de compte bancaire",
      "Conseils pour les transports",
      "Mise en relation avec d'autres étudiants",
    ],
  },
];

export const ServicesGrid = () => {
  return (
    <section className="py-20">
      <div className="mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Des services adaptés à vos besoins
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Que vous soyez au début de votre réflexion ou déjà engagé dans vos
            démarches, nous avons la solution qu'il vous faut.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 border border-sky-100"
            >
              <div className="p-8">
                <div className="mb-6">{service.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-gray-600"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
