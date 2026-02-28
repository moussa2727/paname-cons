import React from 'react';
import { 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  Compass
} from 'lucide-react';

interface MissionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const MissionCard: React.FC<MissionCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border-l-4 border-sky-500 group">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center text-white group-hover:bg-sky-600 transition-colors">
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};

const Mission: React.FC = () => {
  const missions = [
    {
      title: "Accompagnement pour études à l'étranger",
      description: "Conseils personnalisés et accompagnement dans vos démarches pour étudier dans les meilleures universités internationales.",
      icon: <GraduationCap className="w-6 h-6" />
    },
    {
      title: "Organisation de voyages d'affaires",
      description: "Planification complète de vos déplacements professionnels à l'international avec un service premium.",
      icon: <Briefcase className="w-6 h-6" />
    },
    {
      title: "Assistance dans les démarches de visa",
      description: "Accompagnement expert pour vos demandes de visa, avec suivi personnalisé et optimisation des dossiers.",
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      title: "Services touristiques sur mesure",
      description: "Création d'expériences uniques et personnalisées pour vos voyages touristiques à l'international.",
      icon: <Compass className="w-6 h-6" />
    }
  ];

  return (
    <section className="py-16 bg-white/60">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full mb-4">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm font-semibold"> Notre Mission </span>
          </div>
         
          <p className="text-lg text-gray-600">
            Faciliter l'accès aux opportunités internationales à travers des services 
            d'accompagnement personnalisés et sur mesure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {missions.map((mission, index) => (
            <MissionCard
              key={index}
              title={mission.title}
              description={mission.description}
              icon={mission.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Mission;