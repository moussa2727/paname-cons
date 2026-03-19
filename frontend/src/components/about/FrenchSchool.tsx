import React from "react";
import {
  GraduationCap,
  Building2,
  Calendar,
  CheckCircle2,
  Euro,
  School,
  Landmark,
  Layers,
} from "lucide-react";

const FrenchSchool: React.FC = () => {
  const formationsData = [
    {
      id: "publiques",
      title: "Universités Publiques",
      icon: <Landmark className="w-8 h-8 text-sky-600" />,
      description:
        "Formations de qualité à tarifs accessibles (170€ à 3 770€/an)",
      bgColor: "from-[#f9fafb] to-white",
      borderColor: "border-sky-200",
      iconBg: "bg-sky-100",
      items: [
        {
          label: "Licence",
          price: "170€ à 2 770€/an",
          icon: <GraduationCap className="w-5 h-5 text-sky-500" />,
        },
        {
          label: "Master",
          price: "270€ à 3 770€/an",
          icon: <GraduationCap className="w-5 h-5 text-sky-500" />,
        },
        {
          label: "Candidatures",
          period: "Oct à Jan",
          icon: <Calendar className="w-5 h-5 text-sky-500" />,
        },
      ],
    },
    {
      id: "privees",
      title: "Écoles Privées",
      icon: <Building2 className="w-8 h-8 text-sky-600" />,
      description: "Programmes spécialisés et professionnalisants",
      bgColor: "from-[#f9fafb] to-white",
      borderColor: "border-sky-200",
      iconBg: "bg-sky-100",
      items: [
        {
          label: "Bachelor 1 & 2",
          price: "dès 5 000€/an",
          icon: <Layers className="w-5 h-5 text-sky-500" />,
        },
        {
          label: "Bachelor 3 à Master",
          price: "dès 8 000€/an",
          icon: <Layers className="w-5 h-5 text-sky-500" />,
        },
        {
          label: "Candidatures",
          period: "2 mois avant rentrée",
          icon: <Calendar className="w-5 h-5 text-sky-500" />,
        },
      ],
    },
  ];

  return (
    <div className="bg-[#f9fafb] via-[#f9fafb] to-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header décoratif */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-sky-100 rounded-full mb-4">
            <School className="w-8 h-8 text-sky-600" />
          </div>
          <h1 className="text-4xl font-bold text-sky-900 mb-3">
            Etudes en France
          </h1>
          <p className="text-lg text-sky-600 max-w-2xl mx-auto">
            Découvrez toutes les opportunités de formation qui s'offrent à vous
          </p>
        </div>

        {/* Cartes principales */}
        <div className="grid md:grid-cols-2 gap-8">
          {formationsData.map((formation) => (
            <div
              key={formation.id}
              className={`bg-linear-to-br ${formation.bgColor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border ${formation.borderColor} overflow-hidden group`}
            >
              {/* En-tête de la carte */}
              <div className="p-6 border-b border-sky-100">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 ${formation.iconBg} rounded-xl group-hover:scale-110 transition-transform duration-300`}
                  >
                    {formation.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-sky-900">
                      {formation.title}
                    </h2>
                    <p className="text-sky-600 text-sm mt-1">
                      {formation.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Liste des items */}
              <div className="p-6 space-y-4">
                {formation.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 bg-[#fafafa] rounded-lg p-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      {item.icon || (
                        <CheckCircle2 className="w-5 h-5 text-sky-500" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-sky-800">
                        {item.label}
                      </span>
                      <div className="flex items-center space-x-2">
                        {item.price && (
                          <span className="inline-flex items-center px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
                            <Euro className="w-3 h-3 mr-1" />
                            {item.price}
                          </span>
                        )}
                        {item.period && (
                          <span className="inline-flex items-center px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
                            <Calendar className="w-3 h-3 mr-1" />
                            {item.period}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Badge décoratif */}
              <div className="px-6 pb-6">
                <div className="inline-flex items-center space-x-1 text-xs text-sky-500 bg-[#f0f9ff] px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Formation reconnue par l'État</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FrenchSchool;
