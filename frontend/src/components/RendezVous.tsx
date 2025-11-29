import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  CheckCircle,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre: string;
  date: string;
  time: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RendezVous: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    destination: '',
    destinationAutre: '',
    niveauEtude: '',
    filiere: '',
    filiereAutre: '',
    date: '',
    time: '',
  });

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDestinationOther, setShowDestinationOther] = useState(false);
  const [showFiliereOther, setShowFiliereOther] = useState(false);

  const destinations = [
    'Algérie',
    'Turquie',
    'Maroc',
    'France',
    'Tunisie',
    'Chine',
    'Russie',
    'Autre',
  ];

  const niveauxEtude = [
    'Bac',
    'Bac+1',
    'Bac+2',
    'Licence',
    'Master I',
    'Master II',
    'Doctorat',
  ];

  const filieres = [
    'Informatique',
    'Médecine',
    'Ingénierie',
    'Droit',
    'Commerce',
    'Autre',
  ];

  const stepRef = useRef<HTMLDivElement>(null);

  // Redirection si non authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un rendez-vous');
      navigate('/connexion', {
        state: { from: location.pathname },
        replace: true,
      });
      return;
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Pré-remplissage des données utilisateur
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        telephone: user.telephone || '',
      }));
    }
  }, [isAuthenticated, user]);

  // Gestion de la destination présélectionnée
  useEffect(() => {
    const preselectedDestination = location.state?.preselectedDestination;
    if (
      preselectedDestination &&
      destinations.includes(preselectedDestination)
    ) {
      setFormData(prev => ({ ...prev, destination: preselectedDestination }));
    }
  }, [location.state]);

  // Gestion des champs "Autre"
  useEffect(() => {
    setShowDestinationOther(formData.destination === 'Autre');
    setShowFiliereOther(formData.filiere === 'Autre');
  }, [formData.destination, formData.filiere]);

  // Vérification si une date est passée
  const isDatePassed = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  // Vérification si un horaire est passé
  const isTimePassed = (timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);

    if (selectedDate.toDateString() !== today.toDateString()) {
      return false;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    return selectedTime < today;
  };

  // Récupération des dates disponibles
  const fetchAvailableDates = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingDates(true);
    try {
      const response = await fetch(
        `${API_URL}/api/rendezvous/available-dates`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erreur ${response.status} lors du chargement des dates`
        );
      }

      const dates = await response.json();

      // Filtrer les dates passées et trier
      const filteredDates = dates
        .filter((date: string) => !isDatePassed(date))
        .sort(
          (a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

      setAvailableDates(filteredDates);
    } catch (error: unknown) {
      console.error('❌ Erreur chargement dates:', error);
      toast.error('Impossible de charger les dates disponibles');
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, [isAuthenticated]);

  // Récupération des créneaux disponibles
  const fetchAvailableSlots = useCallback(
    async (date: string) => {
      if (!date || !isAuthenticated) return;

      setLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const response = await fetch(
          `${API_URL}/api/rendezvous/available-slots?date=${date}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error(
            `Erreur ${response.status} lors du chargement des créneaux`
          );
        }

        let slots = await response.json();

        // Filtrer les créneaux passés si c'est aujourd'hui
        if (date === new Date().toISOString().split('T')[0]) {
          slots = slots.filter((slot: string) => !isTimePassed(slot, date));
        }

        setAvailableSlots(slots);
      } catch (error: unknown) {
        console.error('Erreur chargement créneaux:', error);
        toast.error('Impossible de charger les créneaux disponibles');
      } finally {
        setLoadingSlots(false);
      }
    },
    [isAuthenticated]
  );

  // Chargement initial des dates
  useEffect(() => {
    if (isAuthenticated) {
      fetchAvailableDates();
    }
  }, [isAuthenticated, fetchAvailableDates]);

  // Chargement des créneaux quand la date change
  useEffect(() => {
    if (formData.date && isAuthenticated) {
      fetchAvailableSlots(formData.date);
    }
  }, [formData.date, isAuthenticated, fetchAvailableSlots]);

  // Gestion des changements de formulaire
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validation du téléphone
  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    return /^\d{10,}$/.test(cleanedPhone);
  };

  // Formatage de l'affichage de la date
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Validation des étapes
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.email.trim() &&
          formData.telephone.trim() &&
          validatePhone(formData.telephone)
        );
      case 2:
        if (
          formData.destination === 'Autre' &&
          !formData.destinationAutre.trim()
        )
          return false;
        if (formData.filiere === 'Autre' && !formData.filiereAutre.trim())
          return false;
        return !!(
          formData.destination &&
          formData.niveauEtude &&
          formData.filiere
        );
      case 3:
        return !!(formData.date && formData.time);
      default:
        return false;
    }
  };

  // Navigation entre les étapes
  const nextStep = () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour continuer');
      navigate('/connexion');
      return;
    }

    if (isStepValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      toast.error('Veuillez remplir tous les champs obligatoires');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un rendez-vous');
      navigate('/connexion');
      return;
    }

    if (!validatePhone(formData.telephone)) {
      toast.error(
        'Veuillez entrer un numéro de téléphone valide (au moins 10 chiffres)'
      );
      return;
    }

    setLoading(true);

    try {
      // Préparation des données conformément au backend
      const submitData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        telephone: formData.telephone.trim(),
        niveauEtude: formData.niveauEtude,
        date: formData.date,
        time: formData.time,
      };

      // Gestion destination - logique backend stricte
      if (formData.destination === 'Autre') {
        if (
          !formData.destinationAutre ||
          formData.destinationAutre.trim() === ''
        ) {
          throw new Error('Veuillez préciser votre destination');
        }
        submitData.destination = formData.destinationAutre.trim();
        submitData.destinationAutre = formData.destinationAutre.trim();
      } else {
        submitData.destination = formData.destination;
        submitData.destinationAutre = undefined;
      }

      // Gestion filière - logique backend stricte
      if (formData.filiere === 'Autre') {
        if (!formData.filiereAutre || formData.filiereAutre.trim() === '') {
          throw new Error('Veuillez préciser votre filière');
        }
        submitData.filiere = formData.filiereAutre.trim();
        submitData.filiereAutre = formData.filiereAutre.trim();
      } else {
        submitData.filiere = formData.filiere;
        submitData.filiereAutre = undefined;
      }

      // Validation finale
      if (!submitData.destination || submitData.destination.trim() === '') {
        throw new Error('La destination est obligatoire');
      }
      if (!submitData.filiere || submitData.filiere.trim() === '') {
        throw new Error('La filière est obligatoire');
      }

      // Appel API
      const response = await fetch(`${API_URL}/api/rendezvous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Erreur lors de la création du rendez-vous'
        );
      }

      toast.success('Rendez-vous créé avec succès !');

      // Redirection vers la page des rendez-vous
      setTimeout(() => {
        navigate('/user-rendez-vous');
      }, 1500);
    } catch (error: unknown) {
      console.error('❌ Erreur création rendez-vous:', error);

      // Gestion spécifique des erreurs
      if ((error as Error).message.includes('déjà un rendez-vous en cours')) {
        toast.error(
          "Vous avez déjà un rendez-vous en cours. Annulez-le avant d'en prendre un nouveau."
        );
      } else if (
        (error as Error).message.includes('créneau horaire') ||
        (error as Error).message.includes('disponible')
      ) {
        toast.error(
          "Ce créneau n'est plus disponible. Veuillez choisir un autre horaire."
        );
        if (formData.date) {
          fetchAvailableSlots(formData.date);
        }
      } else {
        toast.error(
          (error as Error).message || 'Erreur lors de la création du rendez-vous'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Étape 1: Informations personnelles
  const renderStep1 = () => (
    <div ref={stepRef} className='space-y-6'>
      <div className='text-center'>
        <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3'>
          <User className='w-6 h-6 text-blue-600' />
        </div>
        <h3 className='text-xl font-bold text-gray-900 mb-2'>
          Informations Personnelles
        </h3>
        <p className='text-gray-600 text-sm'>Renseignez vos coordonnées</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <label
            htmlFor='firstName'
            className='text-sm font-medium text-gray-700'
          >
            Prénom *
          </label>
          <input
            id='firstName'
            type='text'
            name='firstName'
            value={formData.firstName}
            onChange={handleInputChange}
            required
            minLength={2}
            maxLength={50}
            autoComplete='given-name'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
            placeholder='Votre prénom'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='lastName'
            className='text-sm font-medium text-gray-700'
          >
            Nom *
          </label>
          <input
            id='lastName'
            type='text'
            name='lastName'
            value={formData.lastName}
            onChange={handleInputChange}
            required
            minLength={2}
            maxLength={50}
            autoComplete='family-name'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
            placeholder='Votre nom'
          />
        </div>

        <div className='space-y-2'>
          <label htmlFor='email' className='text-sm font-medium text-gray-700'>
            Email *
          </label>
          <input
            id='email'
            type='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            required
            autoComplete='email'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
            placeholder='votre@email.com'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='telephone'
            className='text-sm font-medium text-gray-700'
          >
            Téléphone *
          </label>
          <input
            id='telephone'
            type='tel'
            name='telephone'
            value={formData.telephone}
            onChange={handleInputChange}
            required
            pattern='[0-9\s\+\-\(\)]{10,}'
            title='Numéro de téléphone valide (ex: +33 1 23 45 67 89 ou 0123456789)'
            autoComplete='tel'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
            placeholder='+33 1 23 45 67 89'
          />
          {formData.telephone && !validatePhone(formData.telephone) && (
            <p className='text-red-500 text-xs mt-1 flex items-center gap-1'>
              <XCircle className='w-3 h-3' />
              Format invalide. Au moins 10 chiffres requis.
            </p>
          )}
          {formData.telephone && validatePhone(formData.telephone) && (
            <p className='text-green-500 text-xs mt-1 flex items-center gap-1'>
              <CheckCircle className='w-3 h-3' />
              Format valide
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Étape 2: Destination et parcours
  const renderStep2 = () => (
    <div ref={stepRef} className='space-y-6'>
      <div className='text-center'>
        <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3'>
          <MapPin className='w-6 h-6 text-blue-600' />
        </div>
        <h3 className='text-xl font-bold text-gray-900 mb-2'>
          Destination et Parcours
        </h3>
        <p className='text-gray-600 text-sm'>
          Choisissez votre destination et parcours académique
        </p>
      </div>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <label
            htmlFor='destination'
            className='text-sm font-medium text-gray-700'
          >
            Destination *
          </label>
          <select
            id='destination'
            name='destination'
            value={formData.destination}
            onChange={handleInputChange}
            required
            autoComplete='country'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white'
          >
            <option value=''>Choisir une destination</option>
            {destinations.map(dest => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </select>
        </div>

        {showDestinationOther && (
          <div className='space-y-2'>
            <label
              htmlFor='destinationAutre'
              className='text-sm font-medium text-gray-700'
            >
              Précisez votre destination *
            </label>
            <input
              id='destinationAutre'
              type='text'
              name='destinationAutre'
              value={formData.destinationAutre}
              onChange={handleInputChange}
              required
              minLength={2}
              maxLength={100}
              autoComplete='off'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
              placeholder='Ex: Canada, Belgique, Suisse...'
            />
          </div>
        )}

        <div className='space-y-2'>
          <label
            htmlFor='niveauEtude'
            className='text-sm font-medium text-gray-700'
          >
            Niveau d&apos;étude *
          </label>
          <div className='relative'>
            <GraduationCap className='absolute left-3 top-3 w-4 h-4 text-gray-400' />
            <select
              id='niveauEtude'
              name='niveauEtude'
              value={formData.niveauEtude}
              onChange={handleInputChange}
              required
              autoComplete='education-level'
              className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white'
            >
              <option value=''>Choisir votre niveau</option>
              {niveauxEtude.map(niveau => (
                <option key={niveau} value={niveau}>
                  {niveau}
                </option>
              ))}
            </select>
            <ChevronDown className='absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none' />
          </div>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='filiere'
            className='text-sm font-medium text-gray-700'
          >
            Filière *
          </label>
          <div className='relative'>
            <BookOpen className='absolute left-3 top-3 w-4 h-4 text-gray-400' />
            <select
              id='filiere'
              name='filiere'
              value={formData.filiere}
              onChange={handleInputChange}
              required
              autoComplete='organization-title'
              className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white'
            >
              <option value=''>Choisir une filière</option>
              {filieres.map(filiere => (
                <option key={filiere} value={filiere}>
                  {filiere}
                </option>
              ))}
            </select>
            <ChevronDown className='absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none' />
          </div>
        </div>

        {showFiliereOther && (
          <div className='space-y-2'>
            <label
              htmlFor='filiereAutre'
              className='text-sm font-medium text-gray-700'
            >
              Précisez votre filière *
            </label>
            <input
              id='filiereAutre'
              type='text'
              name='filiereAutre'
              value={formData.filiereAutre}
              onChange={handleInputChange}
              required
              minLength={2}
              maxLength={100}
              autoComplete='off'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all'
              placeholder='Ex: Architecture, Design, Psychologie...'
            />
          </div>
        )}
      </div>
    </div>
  );

  // Composant Date Picker compact
  const CompactDatePicker = () => (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium text-gray-700 flex items-center gap-2'>
          <Calendar className='w-4 h-4' />
          Date *
        </label>
        {loadingDates && (
          <div className='flex items-center gap-1 text-xs text-gray-500'>
            <Loader2 className='w-3 h-3 animate-spin' />
            <span>Chargement...</span>
          </div>
        )}
      </div>

      {loadingDates ? (
        <div className='flex justify-center py-6'>
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='w-4 h-4 animate-spin' />
            <span className='text-sm'>Chargement des dates...</span>
          </div>
        </div>
      ) : availableDates.length === 0 ? (
        <div className='text-center py-6 text-gray-500 bg-gray-50 rounded-lg'>
          <Calendar className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>Aucune date disponible</p>
          <p className='text-xs mt-1'>Réessayez plus tard</p>
        </div>
      ) : (
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1'>
          {availableDates.map(date => {
            const isSelected = formData.date === date;
            const isToday = date === new Date().toISOString().split('T')[0];
            const dateObj = new Date(date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('fr-FR', {
              month: 'short',
            });
            const weekday = dateObj.toLocaleDateString('fr-FR', {
              weekday: 'short',
            });

            return (
              <button
                key={date}
                type='button'
                onClick={() => {
                  setFormData(prev => ({ ...prev, date, time: '' }));
                }}
                className={`p-2 text-center rounded-lg border transition-all min-h-[60px] flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25 text-gray-700'
                }`}
              >
                <div className='text-[10px] text-gray-500 font-medium uppercase'>
                  {weekday}
                </div>
                <div className='text-base font-bold text-current'>{day}</div>
                <div className='text-[10px] text-gray-600 uppercase'>
                  {month}
                </div>
                {isToday && (
                  <div className='absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full'></div>
                )}
                {isSelected && (
                  <CheckCircle2 className='w-3 h-3 text-blue-500 absolute -top-1 -right-1' />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Composant Time Slot compact
  const CompactTimeSlot = () => (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium text-gray-700 flex items-center gap-2'>
          <Clock className='w-4 h-4' />
          Heure *
        </label>
        {loadingSlots && (
          <div className='flex items-center gap-1 text-xs text-gray-500'>
            <Loader2 className='w-3 h-3 animate-spin' />
            <span>Chargement...</span>
          </div>
        )}
      </div>

      {loadingSlots ? (
        <div className='flex justify-center py-6'>
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='w-4 h-4 animate-spin' />
            <span className='text-sm'>Chargement des créneaux...</span>
          </div>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className='text-center py-6 text-gray-500 bg-gray-50 rounded-lg'>
          <Clock className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>Aucun créneau disponible</p>
          <p className='text-xs mt-1'>Choisissez une autre date</p>
        </div>
      ) : (
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1'>
          {availableSlots.map(slot => {
            const isSelected = formData.time === slot;
            const isTimeDisabled = isTimePassed(slot, formData.date);

            return (
              <button
                key={slot}
                type='button'
                onClick={() =>
                  !isTimeDisabled &&
                  setFormData(prev => ({ ...prev, time: slot }))
                }
                disabled={isTimeDisabled}
                className={`p-2 text-center rounded-lg border transition-all text-sm font-medium relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : isTimeDisabled
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25 text-gray-700'
                }`}
              >
                {slot.replace(':', 'h')}
                {isTimeDisabled && (
                  <span className='absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full'></span>
                )}
                {isSelected && !isTimeDisabled && (
                  <CheckCircle2 className='w-3 h-3 absolute -top-1 -right-1 text-blue-500' />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Étape 3: Date et heure
  const renderStep3 = () => (
    <div ref={stepRef} className='space-y-6'>
      <div className='text-center'>
        <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3'>
          <Calendar className='w-6 h-6 text-blue-600' />
        </div>
        <h3 className='text-xl font-bold text-gray-900 mb-2'>Date et Heure</h3>
        <p className='text-gray-600 text-sm'>Sélectionnez votre créneau</p>
      </div>

      <div className='space-y-6'>
        <CompactDatePicker />

        {formData.date && <CompactTimeSlot />}

        {formData.date && formData.time && (
          <div className='bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4'>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2 text-blue-700'>
                <Calendar className='w-4 h-4' />
                <span className='font-medium'>
                  {formatDateDisplay(formData.date)}
                </span>
              </div>
              <div className='flex items-center gap-2 text-blue-700'>
                <Clock className='w-4 h-4' />
                <span className='font-medium'>
                  {formData.time.replace(':', 'h')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Composant de progression
  const ProgressSteps = () => (
    <div className='flex justify-between items-center mb-6 relative max-w-md mx-auto'>
      {[1, 2, 3].map(step => (
        <div key={step} className='flex flex-col items-center z-10'>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
              step === currentStep
                ? 'border-blue-500 bg-blue-500 text-white shadow-lg scale-110'
                : step < currentStep
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
            }`}
          >
            {step < currentStep ? (
              <CheckCircle2 className='w-4 h-4' />
            ) : (
              <span className='text-xs font-bold'>{step}</span>
            )}
          </div>
          <span
            className={`text-xs mt-1 font-medium ${
              step === currentStep
                ? 'text-blue-600'
                : step < currentStep
                  ? 'text-green-600'
                  : 'text-gray-500'
            }`}
          >
            {step === 1 && 'Infos'}
            {step === 2 && 'Parcours'}
            {step === 3 && 'Horaire'}
          </span>
        </div>
      ))}
      <div className='absolute top-4 left-1/4 right-1/4 h-0.5 bg-gray-200 -z-10'>
        <div
          className='h-full bg-blue-500 transition-all duration-500 rounded-full'
          style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
        />
      </div>
    </div>
  );

  // Si non authentifié, afficher un loader pendant la redirection
  if (!isAuthenticated) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Prendre un Rendez-vous - Paname Consulting</title>
        <meta
          name='description'
          content="Prenez rendez-vous avec nos conseillers experts pour vos études à l'étranger. Consultation personnalisée et accompagnement sur mesure."
        />
        <link rel='canonical' href='https://panameconsulting.com/rendez-vous' />
      </Helmet>

      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4'>
        <div className='max-w-2xl mx-auto'>
          {/* En-tête */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-3'>
              Prendre un Rendez-vous
            </h1>
            <p className='text-gray-600 text-lg'>
              Consultation personnalisée pour vos études à l&apos;étranger
            </p>
          </div>

          {/* Carte principale */}
          <div className='bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden'>
            <div className='p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100'>
              <ProgressSteps />
            </div>

            <form onSubmit={handleSubmit} className='p-6'>
              <div className='min-h-[400px]'>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </div>

              {/* Boutons de navigation */}
              <div className='flex justify-between items-center pt-6 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className='px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-all font-medium'
                >
                  Précédent
                </button>

                <div className='flex items-center gap-3'>
                  {currentStep < 3 ? (
                    <button
                      type='button'
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className='px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2'
                    >
                      Suivant
                      <ChevronDown className='w-4 h-4 -rotate-90' />
                    </button>
                  ) : (
                    <button
                      type='submit'
                      disabled={!isStepValid(3) || loading}
                      className='px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2'
                    >
                      {loading ? (
                        <>
                          <Loader2 className='w-4 h-4 animate-spin' />
                          Création...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className='w-4 h-4' />
                          Confirmer le rendez-vous
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Informations supplémentaires */}
          <div className='mt-6 text-center text-sm text-gray-500'>
            <p>
              • Confirmation immédiate par email • Horaires : lun-ven, 9h-16h30
              • Annulation possible jusqu&apos;à 2h avant •
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RendezVous;
