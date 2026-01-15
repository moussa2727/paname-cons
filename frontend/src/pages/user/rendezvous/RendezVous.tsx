import {
  useState,
  useEffect,
  useCallback,
  FormEvent,
  ChangeEvent,
} from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Globe,
  Target,
  Award,
  Clock,
  CheckCircle,
  GraduationCap,
  Book,
  Dock,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface Destination {
  _id: string;
  country: string;
  imagePath: string;
  text: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
}

const API_URL = import.meta.env.VITE_API_URL;

const RendezVous = () => {
  const { isAuthenticated, access_token, refreshToken, logout, user } =
    useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    destination: '',
    niveauEtude: '',
    filiere: '',
    date: '',
    time: '',
  });

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtherDestination, setShowOtherDestination] = useState(false);
  const [showOtherFiliere, setShowOtherFiliere] = useState(false);
  const [success, setSuccess] = useState(false);

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
    'Droit',
    'Commerce',
    'Ingénierie',
    'Architecture',
    'Autre',
  ];

  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  // Charger les destinations depuis l'API
  const fetchDestinations = useCallback(async (): Promise<void> => {
    setLoadingDestinations(true);
    try {
      const response = await fetch(`${API_URL}/api/destinations/all`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      const data: Destination[] = await response.json();
      // NE PAS AJOUTER "Autre" ici - "Autre" est une option spéciale, pas une destination
      setDestinations(data);
    } catch (error) {
      console.error('Erreur destinations:', error);
      toast.error('Impossible de charger les destinations');
    } finally {
      setLoadingDestinations(false);
    }
  }, []);

  // Gestion des changements de formulaire
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'destination') {
      setShowOtherDestination(value === 'Autre');
      if (value !== 'Autre') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          destinationAutre: undefined,
        }));
        return;
      }
    }

    if (name === 'filiere') {
      setShowOtherFiliere(value === 'Autre');
      if (value !== 'Autre') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          filiereAutre: undefined,
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validation téléphone identique au backend
  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    
    if (!phoneRegex.test(cleanedPhone)) {
      return false;
    }
    
    if (cleanedPhone.startsWith('+0')) {
      return false;
    }
    
    return true;
  };

  // Vérifier si une date est passée
  const isDatePassed = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  // Vérifier si un horaire est passé (si date d'aujourd'hui)
  const isTimePassed = (timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);

    if (selectedDate.toDateString() !== today.toDateString()) return false;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    return selectedTime < today;
  };

  // Validation de chaque étape
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName?.trim() &&
          formData.lastName?.trim() &&
          formData.email?.trim() &&
          formData.telephone?.trim() &&
          validatePhone(formData.telephone)
        );
      case 2:
        if (!formData.destination) return false;
        // Vérification STRICTE: si destination est "Autre", destinationAutre est obligatoire
        if (formData.destination === 'Autre' && !formData.destinationAutre?.trim()) return false;
        if (!formData.niveauEtude) return false;
        if (!formData.filiere) return false;
        // Vérification STRICTE: si filière est "Autre", filiereAutre est obligatoire
        if (formData.filiere === 'Autre' && !formData.filiereAutre?.trim()) return false;
        return true;
      case 3:
        return !!(formData.date && formData.time);
      default:
        return false;
    }
  };

  // Navigation entre les étapes
  const nextStep = (): void => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setTimeout(() => AOS.refreshHard(), 50);
    } else {
      if (currentStep === 1) {
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
          toast.error('Prénom et nom sont obligatoires');
        } else if (!formData.email?.trim()) {
          toast.error('Email est obligatoire');
        } else if (!formData.telephone?.trim() || !validatePhone(formData.telephone)) {
          toast.error('Numéro de téléphone invalide');
        }
      } else if (currentStep === 2) {
        if (!formData.destination) {
          toast.error('La destination est obligatoire');
        } else if (formData.destination === 'Autre' && !formData.destinationAutre?.trim()) {
          toast.error('La destination "Autre" nécessite une précision');
        } else if (!formData.niveauEtude) {
          toast.error("Le niveau d'étude est obligatoire");
        } else if (!formData.filiere) {
          toast.error('La filière est obligatoire');
        } else if (formData.filiere === 'Autre' && !formData.filiereAutre?.trim()) {
          toast.error('La filière "Autre" nécessite une précision');
        }
      }
    }
  };

  const prevStep = (): void => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 50);
  };

  // Charger les dates disponibles
  const fetchAvailableDates = useCallback(async (): Promise<void> => {
    setLoadingDates(true);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-dates`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const dates: string[] = await response.json();
      const filteredDates = dates
        .filter((date: string) => !isDatePassed(date))
        .sort(
          (a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

      setAvailableDates(filteredDates);
    } catch (error) {
      console.error('Erreur dates:', error);
      toast.error('Impossible de charger les dates');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  // Charger les créneaux disponibles pour une date
  const fetchAvailableSlots = useCallback(
    async (date: string): Promise<void> => {
      if (!date) return;

      setLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const response = await fetch(
          `${API_URL}/api/rendezvous/available-slots?date=${date}`
        );
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`);
        }

        let slots: string[] = await response.json();
        if (date === new Date().toISOString().split('T')[0]) {
          slots = slots.filter((slot: string) => !isTimePassed(slot, date));
        }

        setAvailableSlots(slots);
      } catch (error) {
        console.error('Erreur créneaux:', error);
        toast.error('Impossible de charger les créneaux');
      } finally {
        setLoadingSlots(false);
      }
    },
    []
  );

  // Effets pour le chargement initial
  useEffect(() => {
    fetchDestinations();
    fetchAvailableDates();
  }, [fetchDestinations, fetchAvailableDates]);

  useEffect(() => {
    if (formData.date) fetchAvailableSlots(formData.date);
  }, [formData.date, fetchAvailableSlots]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // Vérification authentification
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un rendez-vous');
      navigate('/connexion', {
        state: {
          redirectTo: '/rendez-vous',
          message: 'Connectez-vous pour prendre un rendez-vous',
        },
      });
      return;
    }

    if (!access_token) {
      toast.error('Session invalide. Veuillez vous reconnecter.');
      logout();
      return;
    }

    // VALIDATION STRICTE - Alignée avec CreateRendezvousDto
    if (!formData.firstName?.trim()) {
      toast.error('Le prénom est obligatoire');
      return;
    }

    if (!formData.lastName?.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    if (!formData.email?.trim()) {
      toast.error('L\'email est obligatoire');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Format d'email invalide");
      return;
    }

    if (!formData.telephone?.trim()) {
      toast.error('Le téléphone est obligatoire');
      return;
    }

    if (!validatePhone(formData.telephone)) {
      toast.error('Numéro de téléphone invalide');
      return;
    }

    if (!formData.destination?.trim()) {
      toast.error('La destination est obligatoire');
      return;
    }

    // VÉRIFICATION STRICTE: destination "Autre" nécessite destinationAutre
    if (formData.destination === 'Autre') {
      if (!formData.destinationAutre?.trim()) {
        toast.error('La destination "Autre" nécessite une précision');
        return;
      }
    } else {
      // Vérifier que la destination est valide
      const validDestinations = destinations.map(d => d.country);
      if (!validDestinations.includes(formData.destination)) {
        toast.error('Destination invalide');
        return;
      }
    }

    if (!formData.niveauEtude?.trim()) {
      toast.error('Le niveau d\'étude est obligatoire');
      return;
    }

    if (!formData.filiere?.trim()) {
      toast.error('La filière est obligatoire');
      return;
    }

    // VÉRIFICATION STRICTE: filière "Autre" nécessite filiereAutre
    if (formData.filiere === 'Autre') {
      if (!formData.filiereAutre?.trim()) {
        toast.error('La filière "Autre" nécessite une précision');
        return;
      }
    } else {
      // Vérifier que la filière est valide
      const validFilieres = ['Informatique', 'Médecine', 'Droit', 'Commerce', 'Ingénierie', 'Architecture'];
      if (!validFilieres.includes(formData.filiere)) {
        toast.error('Filière invalide');
        return;
      }
    }

    if (!formData.date?.trim()) {
      toast.error('La date est obligatoire');
      return;
    }

    if (!formData.time?.trim()) {
      toast.error('L\'heure est obligatoire');
      return;
    }

    if (isDatePassed(formData.date)) {
      toast.error('Vous ne pouvez pas réserver une date passée');
      return;
    }

    if (formData.date === new Date().toISOString().split('T')[0] && formData.time) {
      if (isTimePassed(formData.time, formData.date)) {
        toast.error('Vous ne pouvez pas réserver un créneau passé');
        return;
      }
    }

    // STRUCTURE EXACTE ALIGNÉE AVEC CreateRendezvousDto
    const submitData: Record<string, any> = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      telephone: formData.telephone.trim(),
      destination: formData.destination.trim(),
      niveauEtude: formData.niveauEtude,
      filiere: formData.filiere.trim(),
      date: formData.date,
      time: formData.time,
    };

    // Gestion destination "Autre" - STRICTE
    if (formData.destination === 'Autre') {
      if (!formData.destinationAutre?.trim()) {
        toast.error('La destination "Autre" nécessite une précision');
        return;
      }
      submitData.destinationAutre = formData.destinationAutre.trim();
    }

    // Gestion filière "Autre" - STRICTE
    if (formData.filiere === 'Autre') {
      if (!formData.filiereAutre?.trim()) {
        toast.error('La filière "Autre" nécessite une précision');
        return;
      }
      submitData.filiereAutre = formData.filiereAutre.trim();
    }

    // VALIDATION FINALE - Tous les champs requis
    const requiredFields: (keyof typeof submitData)[] = [
      'firstName',
      'lastName',
      'email',
      'telephone',
      'destination',
      'niveauEtude',
      'filiere',
      'date',
      'time'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = submitData[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      console.error('Champs manquants:', missingFields);
      toast.error(`Veuillez remplir tous les champs obligatoires`);
      return;
    }

    setLoading(true);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(submitData),
        });
      };

      let response = await makeRequest(access_token);

      // Gestion token expiré
      if (response.status === 401) {
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            const currentToken = localStorage.getItem('access_token');
            if (currentToken) {
              response = await makeRequest(currentToken);
            } else {
              throw new Error('Session expirée');
            }
          } else {
            throw new Error('Session expirée');
          }
        } catch (error) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
          navigate('/connexion');
          return;
        }
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la création du rendez-vous';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;

          if (errorMessage.includes('Vous avez déjà un rendez-vous confirmé')) {
            toast.error(
              "Vous avez déjà un rendez-vous confirmé. Annulez-le avant d'en créer un nouveau.",
              { autoClose: 5000 }
            );
            setTimeout(() => navigate('/mes-rendez-vous'), 2000);
            return;
          }

          if (errorMessage.includes('Email') && errorMessage.includes('correspondre')) {
            toast.error("L'email doit correspondre à votre compte de connexion.");
            return;
          }

          if (errorMessage.includes('créneau') || errorMessage.includes('disponible')) {
            toast.error("Ce créneau n'est plus disponible. Veuillez choisir un autre horaire.");
            if (formData.date) fetchAvailableSlots(formData.date);
            setFormData(prev => ({ ...prev, time: '' }));
            return;
          }

          if (errorMessage.includes('weekend') || errorMessage.includes('week-end')) {
            toast.error('Les réservations sont fermées le week-end');
            fetchAvailableDates();
            setFormData(prev => ({ ...prev, date: '', time: '' }));
            return;
          }

          if (errorMessage.includes('férié')) {
            toast.error('Les réservations sont fermées les jours fériés');
            fetchAvailableDates();
            setFormData(prev => ({ ...prev, date: '', time: '' }));
            return;
          }

          if (errorMessage.includes('passée')) {
            toast.error('Impossible de réserver une date ou heure passée');
            fetchAvailableDates();
            setFormData(prev => ({ ...prev, date: '', time: '' }));
            return;
          }

          if (errorMessage.includes('validation') || errorMessage.includes('invalide') || 
              errorMessage.includes('obligatoire') || errorMessage.includes('requis')) {
            toast.error(errorMessage);
            return;
          }

          toast.error(errorMessage);
          return;

        } catch (parseError) {
          const statusText = response.statusText || 'Erreur inconnue';
          toast.error(`Erreur serveur (${response.status}): ${statusText}`);
          return;
        }
      }

      let result: any;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Réponse serveur vide');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        toast.error('Erreur de traitement de la réponse du serveur');
        return;
      }

      if (!result || typeof result !== 'object') {
        toast.error('Format de réponse invalide');
        return;
      }

      setSuccess(true);
      toast.success('Rendez-vous créé et confirmé avec succès !');

      setTimeout(() => {
        navigate('/mes-rendez-vous');
      }, 2000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        toast.error('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
        return;
      }

      if (errorMessage.includes('Session expirée') || errorMessage.includes('Token')) {
        toast.error('Session expirée. Redirection vers la connexion...');
        setTimeout(() => {
          logout();
          navigate('/connexion');
        }, 1500);
        return;
      }

      toast.error('Une erreur est survenue. Veuillez réessayer.');
      
    } finally {
      setLoading(false);
    }
  };

  // Rendu étape 1: Informations personnelles
  const renderStep1 = () => (
    <div data-aos='fade-up' className='space-y-3'>
      <h2 className='text-md font-semibold text-sky-600'>
        <span className='flex items-center gap-2'>
          <User className='text-sky-500 h-4 w-4' />
          Informations personnelles
        </span>
      </h2>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <span className='flex items-center gap-1'>
            <Dock className='text-sky-500 h-3 w-3' />
            Prénom *
          </span>
          <input
            type='text'
            id='firstName'
            name='firstName'
            value={formData.firstName}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            placeholder='Votre prénom'
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <div>
          <label
            htmlFor='lastName'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <Book className='text-sky-500 h-3 w-3' />
              Nom *
            </span>
          </label>
          <input
            type='text'
            id='lastName'
            name='lastName'
            value={formData.lastName}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            placeholder='Votre nom'
            required
            minLength={2}
            maxLength={50}
          />
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <label
            htmlFor='email'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <Mail className='text-sky-500 h-3 w-3' />
              Email *
            </span>
          </label>
          <input
            type='email'
            id='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            placeholder='exemple@email.com'
            required
            readOnly={!!user?.email}
            maxLength={100}
          />
        </div>

        <div>
          <label
            htmlFor='telephone'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <Phone className='text-sky-500 h-3 w-3' />
              Téléphone *
            </span>
          </label>
          <input
            type='tel'
            id='telephone'
            name='telephone'
            value={formData.telephone}
            onChange={handleInputChange}
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formData.telephone && !validatePhone(formData.telephone)
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-300 focus:border-sky-500'
            }`}
            placeholder='+22812345678'
            required
            maxLength={20}
          />
          {formData.telephone && !validatePhone(formData.telephone) && (
            <p className='mt-1 text-xs text-red-600'>
              Format: +22812345678 (8-15 chiffres, ne doit pas commencer par 0)
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Rendu étape 2: Projet d'études
  const renderStep2 = () => (
    <div data-aos='fade-up' className='space-y-3'>
      <h2 className='text-md font-semibold text-sky-600'>
        <span className='flex items-center gap-2'>
          <GraduationCap className='text-sky-500 h-4 w-4' />
          Projet d'études
        </span>
      </h2>

      <div>
        <label
          htmlFor='destination'
          className='mb-1 block text-xs font-medium text-gray-700'
        >
          <span className='flex items-center gap-1'>
            <Globe className='text-sky-500 h-3 w-3' />
            Destination *
          </span>
        </label>
        {loadingDestinations ? (
          <div className='flex items-center justify-center rounded border border-gray-300 px-3 py-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent'></div>
            <span className='ml-2 text-xs text-gray-600'>Chargement...</span>
          </div>
        ) : (
          <>
            <select
              id='destination'
              name='destination'
              value={formData.destination}
              onChange={handleInputChange}
              className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
              required
            >
              <option value=''>Sélectionnez une destination</option>
              {destinations.map(dest => (
                <option key={dest._id} value={dest.country}>
                  {dest.country}
                </option>
              ))}
              {/* Option "Autre" comme choix séparé */}
              <option value='Autre'>Autre (précisez ci-dessous)</option>
            </select>

            {showOtherDestination && (
              <div className='mt-3'>
                <label
                  htmlFor='destinationAutre'
                  className='mb-1 block text-xs font-medium text-gray-700'
                >
                  <span className='flex items-center gap-1'>
                    <Target className='text-sky-500 h-3 w-3' />
                    Précisez votre destination *
                  </span>
                </label>
                <input
                  type='text'
                  id='destinationAutre'
                  name='destinationAutre'
                  value={formData.destinationAutre || ''}
                  onChange={handleInputChange}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
                  placeholder='Ex: Suisse, Allemagne, Japon...'
                  maxLength={100}
                  required={formData.destination === 'Autre'}
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Obligatoire quand "Autre" est sélectionné
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <label
            htmlFor='niveauEtude'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <Award className='text-sky-500 h-3 w-3' />
              Niveau d'étude *
            </span>
          </label>
          <select
            id='niveauEtude'
            name='niveauEtude'
            value={formData.niveauEtude}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            required
          >
            <option value=''>Sélectionnez votre niveau</option>
            {niveauxEtude.map(niv => (
              <option key={niv} value={niv}>
                {niv}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor='filiere'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <BookOpen className='text-sky-500 h-3 w-3' />
              Filière *
            </span>
          </label>
          <select
            id='filiere'
            name='filiere'
            value={formData.filiere}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            required
          >
            <option value=''>Sélectionnez votre filière</option>
            {filieres.map(fil => (
              <option key={fil} value={fil}>
                {fil}
              </option>
            ))}
          </select>

          {showOtherFiliere && (
            <div className='mt-3'>
              <label
                htmlFor='filiereAutre'
                className='mb-1 block text-xs font-medium text-gray-700'
              >
                Précisez votre filière *
              </label>
              <input
                type='text'
                id='filiereAutre'
                name='filiereAutre'
                value={formData.filiereAutre || ''}
                onChange={handleInputChange}
                className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
                placeholder='Ex: Architecture, Psychologie...'
                maxLength={100}
                required={formData.filiere === 'Autre'}
              />
              <p className='mt-1 text-xs text-gray-500'>
                Obligatoire quand "Autre" est sélectionné
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Rendu étape 3: Choix du créneau (inchangé)
  const renderStep3 = () => (
    <div data-aos='fade-up' className='space-y-3'>
      <h2 className='text-md font-semibold text-sky-600'>
        <span className='flex items-center gap-2'>
          <Calendar className='text-sky-500 h-4 w-4' />
          Choix du créneau
        </span>
      </h2>

      <div>
        <label
          htmlFor='date'
          className='mb-1 block text-xs font-medium text-gray-700'
        >
          <span className='flex items-center gap-1'>
            <Calendar className='text-sky-500 h-3 w-3' />
            Date *
          </span>
        </label>
        {loadingDates ? (
          <div className='flex items-center justify-center rounded border border-gray-300 px-3 py-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent'></div>
            <span className='ml-2 text-xs text-gray-600'>Chargement...</span>
          </div>
        ) : availableDates.length > 0 ? (
          <select
            id='date'
            name='date'
            value={formData.date}
            onChange={handleInputChange}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400'
            required
          >
            <option value=''>Sélectionnez une date</option>
            {availableDates.map(date => {
              const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
              return (
                <option key={date} value={date}>
                  {formattedDate}
                </option>
              );
            })}
          </select>
        ) : (
          <div className='rounded border border-red-300 bg-red-50 px-3 py-2'>
            <p className='text-xs text-red-600'>Aucune date disponible</p>
          </div>
        )}
      </div>

      {formData.date && (
        <div>
          <label className='mb-1 block text-xs font-medium text-gray-700'>
            <span className='flex items-center gap-1'>
              <Clock className='text-sky-500 h-3 w-3' />
              Horaire *
            </span>
          </label>
          {loadingSlots ? (
            <div className='flex items-center justify-center rounded border border-gray-300 px-3 py-2'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent'></div>
              <span className='ml-2 text-xs text-gray-600'>Chargement...</span>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className='grid grid-cols-3 gap-1 sm:grid-cols-4'>
              {availableSlots.map(slot => {
                const isSelected = formData.time === slot;
                const isPassed = isTimePassed(slot, formData.date);

                return (
                  <button
                    key={slot}
                    type='button'
                    onClick={() =>
                      !isPassed &&
                      setFormData(prev => ({ ...prev, time: slot }))
                    }
                    disabled={isPassed}
                    className={`rounded px-2 py-1.5 text-xs transition-all duration-150 focus:outline-none focus:ring-none ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : isPassed
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'border border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className='rounded border border-amber-300 bg-amber-50 px-3 py-2'>
              <p className='text-xs text-amber-700'>
                Aucun créneau disponible pour cette date
              </p>
            </div>
          )}

          {formData.time && (
            <div className='mt-3 rounded bg-sky-50 p-3'>
              <p className='text-xs text-sky-700'>
                <span className='font-medium'>Créneau sélectionné :</span>{' '}
                {new Date(formData.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} à {formData.time}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Indicateur de progression (inchangé)
  const renderProgressSteps = () => (
    <div className='mb-6'>
      <div className='flex items-center justify-between'>
        {[1, 2, 3].map(step => (
          <div key={step} className='flex flex-col items-center'>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 ${
                currentStep >= step
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                currentStep >= step ? 'text-sky-600' : 'text-gray-400'
              }`}
            >
              {step === 1 ? 'Personnel' : step === 2 ? 'Projet' : 'Créneau'}
            </span>
          </div>
        ))}
      </div>
      <div className='relative -mt-4'>
        <div className='absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-200'>
          <div
            className='h-full bg-sky-600 transition-all duration-150'
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  // Message de succès (inchangé)
  const renderSuccessMessage = () => (
    <div data-aos='zoom-in' className='text-center'>
      <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100'>
        <CheckCircle className='h-8 w-8 text-emerald-600' />
      </div>
      <h2 className='mb-3 text-lg font-bold text-gray-800'>
        Rendez-vous confirmé !
      </h2>
      <p className='mb-6 text-sm text-gray-600'>
        Votre rendez-vous a été créé et confirmé avec succès.
        <br />
        Vous allez être redirigé vers vos rendez-vous.
      </p>
      <div className='animate-pulse'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2'>
          <div className='h-2 w-2 rounded-full bg-emerald-500'></div>
          <span className='text-xs text-emerald-700'>
            Redirection en cours...
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>
          Prenez Rendez-Vous avec nos consultant - Paname Consulting
        </title>
        <meta
          name='description'
          content='Prenez rendez-vous avec un conseiller Paname Consulting'
        />
        <link
          rel='canonical'
          href='https://panameconsulting.vercel.app/rendez-vous'
        />
      </Helmet>

      <div className='min-h-screen bg-linear-to-b from-sky-50 to-white py-6'>
        <div className='mx-auto max-w-2xl px-3 sm:px-4'>
          <div className='mb-6 flex items-center gap-2'>
            <button
              onClick={() => navigate('/mes-rendez-vous')}
              className='flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition-all duration-150 hover:bg-sky-50 hover:text-sky-800'
            >
              <Calendar className='h-4 w-4' />
              Mes rendez-vous
            </button>
          </div>

          {!isAuthenticated ? (
            <div data-aos='zoom-in' className='rounded-lg bg-white p-6 shadow'>
              <div className='text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100'>
                  <User className='h-8 w-8 text-sky-600' />
                </div>
                <h2 className='mb-3 text-lg font-bold text-gray-800'>
                  Connexion requise
                </h2>
                <p className='mb-6 text-sm text-gray-600'>
                  Vous devez être connecté pour prendre un rendez-vous.
                </p>
                <button
                  onClick={() =>
                    navigate('/connexion', {
                      state: {
                        redirectTo: '/rendez-vous',
                        message: 'Connectez-vous pour prendre un rendez-vous',
                      },
                    })
                  }
                  className='inline-flex items-center justify-center gap-2 rounded bg-sky-600 px-6 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-sky-700 focus:border-sky-500 focus:outline-none focus:ring-none'
                >
                  Se connecter
                </button>
              </div>
            </div>
          ) : success ? (
            <div
              data-aos='zoom-in'
              className='overflow-hidden rounded-lg bg-white p-8 shadow-lg'
            >
              {renderSuccessMessage()}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className='overflow-hidden rounded-lg bg-white shadow-lg'
              data-aos='fade-up'
            >
              <div className='border-b border-gray-100 bg-linear-to-r from-sky-500 to-sky-600 px-6 py-4'>
                <h1 className='text-xl font-bold text-white'>
                  Prendre un rendez-vous
                </h1>
                <p className='mt-1 text-sm text-sky-100'>
                  Complétez les informations pour planifier votre consultation
                </p>
              </div>

              <div className='px-4 py-6 sm:px-6 sm:py-8'>
                {renderProgressSteps()}

                <div className='space-y-6'>
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                </div>

                <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between'>
                  {currentStep > 1 && (
                    <button
                      type='button'
                      onClick={prevStep}
                      className='inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 focus:border-sky-500 focus:outline-none focus:ring-none'
                    >
                      <ChevronLeft className='h-4 w-4' />
                      Retour
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type='button'
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        isStepValid(currentStep)
                          ? 'bg-sky-600 text-white hover:bg-sky-700'
                          : 'cursor-not-allowed bg-gray-300 text-gray-500'
                      }`}
                    >
                      Continuer
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  ) : (
                    <button
                      type='submit'
                      disabled={loading || !isStepValid(3)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        !loading && isStepValid(3)
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'cursor-not-allowed bg-gray-300 text-gray-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                          Traitement...
                        </>
                      ) : (
                        <>
                          Confirmer le rendez-vous
                          <ChevronRight className='h-4 w-4' />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className='border-t border-gray-100 bg-gray-50 px-6 py-4'>
                <p className='text-center text-xs text-gray-500'>
                  Tous les champs marqués d'un * sont obligatoires.
                  <br />
                  Les rendez-vous sont immédiatement confirmés après création.
                  <br />
                  Vous recevrez une confirmation par email.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default RendezVous;