import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Languages,
  BookOpen,
  GraduationCap,
  MapPin,
  Sparkles,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Types
interface Question {
  id: string;
  question: string;
  icon: React.ReactElement;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface Destination {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  score: number;
  matchPercentage: number;
  flag: string;
}

// Composant de carte de destination optimisé
const DestinationCard: React.FC<{ destination: Destination; rank: number }> = React.memo(({ destination, rank }) => (
  <div className={`relative border rounded-xl p-4 text-left flex flex-col h-full transition-all duration-300 hover:shadow-lg ${
    rank === 1
      ? 'border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 shadow-md'
      : 'border-gray-200 bg-white shadow-sm'
  }`}>
    {/* Badge de rang */}
    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
      rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'
    }`}>
      #{rank}
    </div>

    {/* En-tête avec drapeau et score */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <span className="text-xl">{destination.flag}</span>
        <h3 className="text-lg font-bold text-gray-900">
          {destination.name}
        </h3>
      </div>
      <div className="flex items-center bg-sky-100 px-2 py-1 rounded-full">
        <Sparkles className="h-3 w-3 text-sky-600 mr-1" />
        <span className="text-xs font-medium text-sky-600">
          {destination.matchPercentage}%
        </span>
      </div>
    </div>

    {/* Description */}
    <p className="text-gray-600 text-sm mb-3 flex-grow">
      {destination.description}
    </p>

    {/* Avantages */}
    <div className="mt-2">
      <h4 className="font-semibold text-sky-600 text-sm mb-2 flex items-center">
        <BadgeCheck className="h-4 w-4 mr-1" />
        Points forts :
      </h4>
      <ul className="space-y-1">
        {destination.advantages.slice(0, 3).map((advantage, i) => (
          <li key={i} className="flex items-start">
            <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mr-2 mt-1.5 flex-shrink-0"></div>
            <span className="text-gray-700 text-xs">{advantage}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
));

const DestinationQuiz: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Destination[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Questions compactes
  const questions: Question[] = useMemo(() => [
    {
      id: 'budget',
      question: 'Budget annuel pour les études ?',
      icon: <Banknote className='w-6 h-6 text-sky-600' />,
      options: [
        { value: '2-3M', label: '2-3M FCFA' },
        { value: '3-5M', label: '3-5M FCFA' },
        { value: '5-10M', label: '5-10M FCFA' },
        { value: '10M+', label: '10M+ FCFA' },
      ],
    },
    {
      id: 'language',
      question: 'Préférence linguistique ?',
      icon: <Languages className='w-6 h-6 text-sky-600' />,
      options: [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'Anglais' },
        { value: 'bilingue', label: 'Bilingue' },
        { value: 'other', label: 'Autre' },
      ],
    },
    {
      id: 'field',
      question: 'Domaine de formation ?',
      icon: <BookOpen className='w-6 h-6 text-sky-600' />,
      options: [
        { value: 'info', label: 'Informatique' },
        { value: 'med', label: 'Médecine' },
        { value: 'engineering', label: 'Ingénierie' },
        { value: 'finance', label: 'Finance' },
      ],
    },
    {
      id: 'degree',
      question: "Niveau d'études ?",
      icon: <GraduationCap className='w-6 h-6 text-sky-600' />,
      options: [
        { value: 'bachelor', label: 'Licence' },
        { value: 'master', label: 'Master' },
        { value: 'phd', label: 'Doctorat' },
        { value: 'short', label: 'Courte' },
      ],
    },
  ], []);

  // Destinations avec les pays demandés
  const destinations: Destination[] = useMemo(() => [
    {
      id: 'france',
      name: 'France',
      description: 'Excellence académique avec des universités renommées et un environnement francophone idéal.',
      advantages: [
        'Grandes écoles et universités prestigieuses',
        'Frais universitaires très accessibles',
        'Système de bourses développé',
        'Vie étudiante riche et dynamique',
        'Diplômes internationalement reconnus'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇫🇷'
    },
    {
      id: 'russie',
      name: 'Russie',
      description: 'Formation de qualité avec des coûts abordables et une riche tradition académique.',
      advantages: [
        'Universités réputées en médecine et sciences',
        'Coûts de formation très compétitifs',
        'Programmes en anglais disponibles',
        'Logement étudiant subventionné',
        'Diplômes reconnus en Europe'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇷🇺'
    },
    {
      id: 'maroc',
      name: 'Maroc',
      description: 'Proximité culturelle et géographique avec des coûts très abordables.',
      advantages: [
        'Coûts de vie et études très compétitifs',
        'Environnement francophone familier',
        'Proximité géographique pour les africains',
        'Développement économique rapide',
        'Culture riche et accueillante'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇲🇦'
    },
    {
      id: 'algerie',
      name: 'Algérie',
      description: 'Destination économique avec un système éducatif en développement.',
      advantages: [
        'Coûts extrêmement abordables',
        'Environnement francophone',
        'Proximité culturelle et géographique',
        'Universités en développement constant',
        'Frais de scolarité très bas'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇩🇿'
    },
    {
      id: 'tunisie',
      name: 'Tunisie',
      description: 'Qualité de formation reconnue avec des coûts modérés.',
      advantages: [
        'Rapport qualité-prix excellent',
        'Environnement francophone',
        'Système éducatif bien structuré',
        'Coûts de vie raisonnables',
        'Diplômes reconnus en Afrique'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇹🇳'
    },
    {
      id: 'chine',
      name: 'Chine',
      description: 'Croissance économique rapide avec des programmes internationaux et bourses.',
      advantages: [
        'Bourses gouvernementales nombreuses',
        'Croissance économique exceptionnelle',
        'Programmes en anglais disponibles',
        'Universités de rang mondial',
        'Expérience culturelle unique'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇨🇳'
    }
  ], []);

  // Logique de scoring mise à jour
  const calculateResults = useCallback((answers: Record<string, string>): Destination[] => {
    const scoredDestinations = destinations.map(d => ({ ...d, score: 0 }));

    // Règles de scoring pour les nouvelles destinations
    Object.entries(answers).forEach(([questionId, answer]) => {
      scoredDestinations.forEach(dest => {
        if (questionId === 'budget') {
          if (answer === '2-3M' && ['maroc', 'algerie', 'tunisie'].includes(dest.id)) dest.score += 3;
          if (answer === '3-5M' && ['maroc', 'tunisie', 'russie'].includes(dest.id)) dest.score += 2;
          if (answer === '5-10M' && ['france', 'russie', 'chine'].includes(dest.id)) dest.score += 2;
          if (answer === '10M+' && ['france', 'chine'].includes(dest.id)) dest.score += 3;
        }
        
        if (questionId === 'language') {
          if (answer === 'fr' && ['france', 'maroc', 'algerie', 'tunisie'].includes(dest.id)) dest.score += 3;
          if (answer === 'en' && ['chine', 'russie'].includes(dest.id)) dest.score += 3;
          if (answer === 'bilingue' && ['russie', 'chine'].includes(dest.id)) dest.score += 4;
        }

        if (questionId === 'field') {
          if (answer === 'med' && ['russie', 'france'].includes(dest.id)) dest.score += 3;
          if (answer === 'engineering' && ['france', 'chine', 'russie'].includes(dest.id)) dest.score += 3;
          if (answer === 'info' && ['chine', 'france'].includes(dest.id)) dest.score += 3;
          if (answer === 'finance' && ['france', 'maroc'].includes(dest.id)) dest.score += 2;
        }

        if (questionId === 'degree') {
          if (answer === 'master' && ['france', 'russie'].includes(dest.id)) dest.score += 3;
          if (answer === 'phd' && ['france', 'chine'].includes(dest.id)) dest.score += 3;
          if (answer === 'bachelor' && ['maroc', 'tunisie', 'algerie'].includes(dest.id)) dest.score += 2;
          if (answer === 'short' && ['maroc', 'tunisie'].includes(dest.id)) dest.score += 3;
        }
      });
    });

    const maxPossibleScore = 16;
    return scoredDestinations
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(d => ({
        ...d,
        matchPercentage: Math.min(95, Math.max(60, Math.round((d.score / maxPossibleScore) * 100)))
      }));
  }, [destinations]);

  // Gestion des réponses
  const handleAnswer = useCallback(async (questionId: string, answer: string) => {
    setSelectedOption(answer);
    
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    await new Promise(resolve => setTimeout(resolve, 200));

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setIsCalculating(true);
      setTimeout(() => {
        const topDestinations = calculateResults(newAnswers);
        setResults(topDestinations);
        setIsCalculating(false);
      }, 1200);
    }
  }, [answers, currentStep, questions.length, calculateResults]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setSelectedOption(null);
    }
  }, [currentStep]);

  const progress = ((currentStep + 1) / questions.length) * 100;

  // Écran de résultats
  if (results.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* En-tête compact */}
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-md mb-3">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Vos destinations idéales
            </h1>
            <p className="text-gray-600 max-w-md mx-auto text-sm">
              Basé sur vos préférences, voici les pays les plus adaptés
            </p>
          </div>

          {/* Grille des résultats responsive */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 mb-6">
            {results.map((destination, index) => (
              <DestinationCard 
                key={destination.id} 
                destination={destination} 
                rank={index + 1} 
              />
            ))}
          </div>

          {/* Actions compactes */}
          <div className="text-center space-y-3">
            <Link
              to="/rendez-vous"
              className="inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
            >
              Discuter avec un conseiller
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
            
            <button
              onClick={() => {
                setCurrentStep(0);
                setAnswers({});
                setResults([]);
                setSelectedOption(null);
              }}
              className="block mx-auto text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 text-sm"
            >
              ↻ Refaire le test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement
  if (isCalculating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          {/* Loader principal */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            {/* Cercle externe */}
            <div className="absolute inset-0 border-3 border-blue-200 rounded-full"></div>
            {/* Cercle progressif */}
            <div className="absolute inset-0 border-3 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            {/* Points animés */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>

          {/* Texte */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800">Calcul en cours</h3>
            <p className="text-gray-600 text-sm">Veuillez patienter...</p>
          </div>
        </div>
      </div>
    );
  }

  // Interface du questionnaire compact
  const currentQuestion = questions[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        {/* Barre de progression compacte */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2 text-xs font-medium text-blue-600">
            <span>Question {currentStep + 1}/{questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Carte de question compacte */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {/* En-tête compact */}
          <div className="p-5 text-center border-b border-gray-100">
            <div className="flex justify-center mb-40">
              {currentQuestion.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options compactes - ESPACE RÉDUIT */}
          <div className="p-4 space-y-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                  selectedOption === option.value
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full border mr-3 ${
                    selectedOption === option.value
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedOption === option.value && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">
                    {option.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation compacte - ESPACE RÉDUIT */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between rounded-b-xl">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center text-sm font-medium ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Retour
            </button>
            
            <div className="text-xs text-gray-500 font-medium">
              {currentStep + 1}/{questions.length}
            </div>
          </div>
        </div>

        {/* Indicateur de progression en bas - ESPACE RÉDUIT */}
        <div className="text-center mt-3">
          <div className="flex justify-center space-x-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-6 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DestinationQuiz);