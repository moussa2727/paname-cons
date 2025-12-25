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
  Calendar as CalendarIcon,
  Book,
  ChevronRight,
  ChevronLeft,
  Globe,
  Target,
  Award,
  Clock,
  CheckCircle,
  GraduationCap,
  AlertCircle,
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

// Constantes COPIÉES du backend pour garantir la cohérence
const TIME_SLOT_REGEX = /^(09|1[0-6]):(00|30)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat'
] as const;

const FILIERES = [
  'Informatique',
  'Médecine',
  'Ingénierie',
  'Droit',
  'Commerce',
  'Autre'
] as const;

const WORKING_HOURS = { start: 9, end: 16.5 };
const AUTO_EXPIRE_MINUTES = 10;

const API_URL = import.meta.env.VITE_API_URL;

/* global fetch, setTimeout, localStorage, console */
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  const fetchDestinations = useCallback(async (): Promise<void> => {
    setLoadingDestinations(true);
    try {
      const response = await fetch(`${API_URL}/api/destinations/all`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data: Destination[] = await response.json();
      setDestinations([
        ...data,
        { _id: 'autre', country: 'Autre', imagePath: '', text: '' },
      ]);
    } catch (error) {
      console.error('Erreur destinations:', error);
      toast.error('Impossible de charger les destinations');
    } finally {
      setLoadingDestinations(false);
    }
  }, []);

  // VALIDATIONS STRICTES identiques au backend
  const validateFormData = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      // Validation des champs personnels
      if (!formData.firstName?.trim()) {
        errors.firstName = 'Le prénom est obligatoire';
      } else if (formData.firstName.trim().length > 50) {
        errors.firstName = 'Le prénom ne peut pas dépasser 50 caractères';
      }

      if (!formData.lastName?.trim()) {
        errors.lastName = 'Le nom est obligatoire';
      } else if (formData.lastName.trim().length > 50) {
        errors.lastName = 'Le nom ne peut pas dépasser 50 caractères';
      }

      if (!formData.email?.trim()) {
        errors.email = 'L\'email est obligatoire';
      } else if (formData.email.trim().length > 100) {
        errors.email = 'L\'email ne peut pas dépasser 100 caractères';
      } else {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(formData.email.trim())) {
          errors.email = 'Format d\'email invalide';
        }
      }

      if (!formData.telephone?.trim()) {
        errors.telephone = 'Le téléphone est obligatoire';
      } else {
        const cleanedPhone = formData.telephone.replace(/[\s\-().]/g, '');
        if (!PHONE_REGEX.test(cleanedPhone)) {
          errors.telephone = 'Format de téléphone invalide (ex: +22812345678)';
        }
      }
    }

    if (step === 2) {
      // Validation projet d'études
      if (!formData.destination) {
        errors.destination = 'La destination est obligatoire';
      } else if (formData.destination.length > 100) {
        errors.destination = 'La destination ne peut pas dépasser 100 caractères';
      }

      if (formData.destination === 'Autre' && !formData.destinationAutre?.trim()) {
        errors.destinationAutre = 'La destination personnalisée est obligatoire quand "Autre" est sélectionné';
      } else if (formData.destinationAutre && formData.destinationAutre.length > 100) {
        errors.destinationAutre = 'La destination personnalisée ne peut pas dépasser 100 caractères';
      }

      if (!formData.niveauEtude) {
        errors.niveauEtude = 'Le niveau d\'étude est obligatoire';
      } else if (!EDUCATION_LEVELS.includes(formData.niveauEtude as any)) {
        errors.niveauEtude = 'Niveau d\'étude invalide';
      }

      if (!formData.filiere) {
        errors.filiere = 'La filière est obligatoire';
      } else if (formData.filiere.length > 100) {
        errors.filiere = 'La filière ne peut pas dépasser 100 caractères';
      }

      if (formData.filiere === 'Autre' && !formData.filiereAutre?.trim()) {
        errors.filiereAutre = 'La filière personnalisée est obligatoire quand "Autre" est sélectionné';
      } else if (formData.filiereAutre && formData.filiereAutre.length > 100) {
        errors.filiereAutre = 'La filière personnalisée ne peut pas dépasser 100 caractères';
      }
    }

    if (step === 3) {
      // Validation créneau
      if (!formData.date) {
        errors.date = 'La date est obligatoire';
      } else if (!DATE_REGEX.test(formData.date)) {
        errors.date = 'Format de date invalide (YYYY-MM-DD requis)';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(formData.date);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          errors.date = 'Vous ne pouvez pas réserver une date passée';
        }
      }

      if (!formData.time) {
        errors.time = 'L\'heure est obligatoire';
      } else if (!TIME_SLOT_REGEX.test(formData.time)) {
        errors.time = 'Créneau horaire invalide (09:00-16:30, par pas de 30min)';
      } else {
        // Validation heure de travail (identique au backend)
        const [hours, minutes] = formData.time.split(":").map(Number);
        const timeInHours = hours + minutes / 60;

        if (timeInHours < WORKING_HOURS.start || timeInHours > WORKING_HOURS.end) {
          errors.time = 'Les horaires disponibles sont entre 9h00 et 16h30';
        }

        const totalMinutes = (hours - 9) * 60 + minutes;
        if (totalMinutes % 30 !== 0) {
          errors.time = 'Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)';
        }

        // Vérification si le créneau n'est pas passé (pour aujourd'hui)
        if (formData.date === new Date().toISOString().split("T")[0]) {
          const now = new Date();
          const [hours, minutes] = formData.time.split(":").map(Number);
          const selectedTime = new Date();
          selectedTime.setHours(hours, minutes, 0, 0);
          
          if (selectedTime < now) {
            errors.time = 'Vous ne pouvez pas réserver un créneau passé';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'destination') {
      const showOther = value === 'Autre';
      setShowOtherDestination(showOther);
      
      const newFormData = {
        ...formData,
        [name]: value,
        ...(showOther ? {} : { destinationAutre: undefined })
      };
      setFormData(newFormData);
      
      // Re-validate if needed
      if (currentStep === 2) {
        validateFormData(2);
      }
      return;
    }

    if (name === 'filiere') {
      const showOther = value === 'Autre';
      setShowOtherFiliere(showOther);
      
      const newFormData = {
        ...formData,
        [name]: value,
        ...(showOther ? {} : { filiereAutre: undefined })
      };
      setFormData(newFormData);
      
      // Re-validate if needed
      if (currentStep === 2) {
        validateFormData(2);
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validation en temps réel pour certains champs
    if (name === 'date' && value) {
      setTimeout(() => {
        if (currentStep === 3) validateFormData(3);
      }, 100);
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const isDatePassed = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const isTimePassed = (timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);

    if (selectedDate.toDateString() !== today.toDateString()) {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      return selectedDate < todayMidnight;
    }

    const [hours, minutes] = timeStr.split(":").map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);
    
    // Marge de 10 minutes comme dans le backend AUTO_EXPIRE_MINUTES
    const tenMinutesAgo = new Date(today.getTime() - AUTO_EXPIRE_MINUTES * 60 * 1000);
    
    return selectedTime < tenMinutesAgo;
  };

  const nextStep = (): void => {
    if (validateFormData(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setTimeout(() => AOS.refreshHard(), 50);
    } else {
      // Afficher le premier message d'erreur
      const firstError = Object.values(formErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
    }
  };

  const prevStep = (): void => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 50);
  };

  const fetchAvailableDates = useCallback(async (): Promise<void> => {
    setLoadingDates(true);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-dates`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
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
      toast.error('Impossible de charger les dates disponibles');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const fetchAvailableSlots = useCallback(
    async (date: string): Promise<void> => {
      if (!date) return;

      setLoadingSlots(true);
      setAvailableSlots([]);
      setFormData(prev => ({ ...prev, time: '' })); // Reset time when date changes
      
      try {
        const response = await fetch(
          `${API_URL}/api/rendezvous/available-slots?date=${date}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        let slots: string[] = await response.json();
        
        // Filtrer les créneaux passés pour aujourd'hui (identique au backend)
        if (date === new Date().toISOString().split('T')[0]) {
          slots = slots.filter((slot: string) => !isTimePassed(slot, date));
        }

        setAvailableSlots(slots);
        
        // Si aucun créneau disponible
        if (slots.length === 0) {
          toast.warning('Aucun créneau disponible pour cette date');
        }
      } catch (error) {
        console.error('Erreur créneaux:', error);
        toast.error('Impossible de charger les créneaux disponibles');
      } finally {
        setLoadingSlots(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDestinations();
    fetchAvailableDates();
  }, [fetchDestinations, fetchAvailableDates]);

  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots(formData.date);
    }
  }, [formData.date, fetchAvailableSlots]);

  // Pré-remplissage avec les données utilisateur
  useEffect(() => {
    if (user && isAuthenticated) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        telephone: user.telephone || '',
      }));
    }
  }, [user, isAuthenticated]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // VÉRIFICATION CRITIQUE : L'utilisateur doit être connecté et avoir un compte
    if (!isAuthenticated || !user) {
      toast.error('Vous devez être connecté pour prendre un rendez-vous');
      navigate('/connexion', {
        state: {
          redirectTo: '/rendez-vous',
          message: 'Connectez-vous pour prendre un rendez-vous',
        },
      });
      return;
    }

    // Validation finale
    if (!validateFormData(3)) {
      const firstError = Object.values(formErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    // VÉRIFICATION : Email doit correspondre au compte connecté (identique au backend)
    const normalizedDtoEmail = formData.email.toLowerCase().trim();
    const normalizedUserEmail = user.email.toLowerCase().trim();
    
    if (normalizedDtoEmail !== normalizedUserEmail) {
      toast.error('L\'email doit correspondre exactement à votre compte de connexion');
      return;
    }

    // Préparation des données IDENTIQUE au backend
    const submitData: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: normalizedDtoEmail,
      telephone: formData.telephone.trim(),
      destination: formData.destination,
      niveauEtude: formData.niveauEtude,
      filiere: formData.filiere,
      date: formData.date,
      time: formData.time,
    };

    // Gestion des champs "Autre" - IDENTIQUE au backend
    if (formData.destination === 'Autre' && formData.destinationAutre) {
      submitData.destination = 'Autre';
      submitData.destinationAutre = formData.destinationAutre.trim();
    }

    if (formData.filiere === 'Autre' && formData.filiereAutre) {
      submitData.filiere = 'Autre';
      submitData.filiereAutre = formData.filiereAutre.trim();
    }

    console.log(' Données envoyées au backend (strictement conformes).');
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const makeRequest = async (token: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(submitData),
          signal: controller.signal,
        });
      };

      let response = await makeRequest(access_token!);
      clearTimeout(timeoutId);

      // Gestion STRICTE des erreurs 401 (comme dans le backend)
      if (response.status === 401) {
        console.log('🔐 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          const newToken = localStorage.getItem('access_token');
          if (newToken) {
            // Nouvelle tentative avec le nouveau token
            const newController = new AbortController();
            const newTimeoutId = setTimeout(() => newController.abort(), 20000);
            
            response = await fetch(`${API_URL}/api/rendezvous`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(submitData),
              signal: newController.signal,
            });
            
            clearTimeout(newTimeoutId);
          } else {
            throw new Error('SESSION_EXPIRED');
          }
        } else {
          throw new Error('SESSION_EXPIRED');
        }
      }

      // Traitement de la réponse
      if (!response.ok) {
        let errorData: { message: string; };
        try {
          errorData = await response.json();
        } catch {
          const textError = await response.text();
          throw new Error(`Erreur serveur: ${textError}`);
        }

        const errorMessage = errorData.message || `Erreur ${response.status}`;
        
        // Gestion des erreurs SPÉCIFIQUES du backend
        if (errorMessage.includes('Vous avez déjà un rendez-vous confirmé')) {
          toast.error('Vous avez déjà un rendez-vous confirmé. Annulez-le avant d\'en créer un nouveau.', {
            autoClose: 6000,
          });
          setTimeout(() => navigate('/mes-rendez-vous'), 2500);
          return;
        }
        
        if (errorMessage.includes('doit correspondre exactement') || 
            errorMessage.includes('votre propre compte')) {
          toast.error('L\'email doit correspondre exactement à votre compte de connexion');
          return;
        }
        
        if (errorMessage.includes('compte pour prendre')) {
          toast.error('Vous devez avoir un compte pour prendre un rendez-vous. Veuillez vous inscrire d\'abord.');
          navigate('/inscription');
          return;
        }
        
        if (errorMessage.includes('créneau') || errorMessage.includes('disponible')) {
          toast.error('Ce créneau n\'est plus disponible. Veuillez rafraîchir et choisir un autre horaire.');
          if (formData.date) fetchAvailableSlots(formData.date);
          return;
        }
        
        if (errorMessage.includes('complets')) {
          toast.error('Tous les créneaux sont complets pour cette date. Veuillez choisir une autre date.');
          fetchAvailableDates();
          setFormData(prev => ({ ...prev, date: '', time: '' }));
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
        
        if (errorMessage.includes('date passée')) {
          toast.error('Vous ne pouvez pas réserver une date passée');
          fetchAvailableDates();
          setFormData(prev => ({ ...prev, date: '', time: '' }));
          return;
        }
        
        // Erreur générique
        toast.error(`Erreur: ${errorMessage}`);
        console.error('❌ Erreur backend:', errorData);
        return;
      }

      // SUCCÈS - Le rendez-vous est automatiquement CONFIRMÉ (identique au backend)
      const result = await response.json();
      
      setSuccess(true);
      toast.success(' Rendez-vous créé et confirmé avec succès !');
      
      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/mes-rendez-vous');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      
      if (error.name === 'AbortError') {
        toast.error('La requête a expiré. Le serveur semble lent. Veuillez réessayer.');
        return;
      }
      
      if (error.message === 'SESSION_EXPIRED') {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        logout();
        navigate('/connexion');
        return;
      }
      
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

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
          <label
            htmlFor='firstName'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            Prénom *
          </label>
          <input
            type='text'
            id='firstName'
            name='firstName'
            value={formData.firstName}
            onChange={handleInputChange}
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.firstName 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            placeholder='Votre prénom'
            required
            maxLength={50}
          />
          {formErrors.firstName && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.firstName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='lastName'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            Nom *
          </label>
          <input
            type='text'
            id='lastName'
            name='lastName'
            value={formData.lastName}
            onChange={handleInputChange}
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.lastName 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            placeholder='Votre nom'
            required
            maxLength={50}
          />
          {formErrors.lastName && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.lastName}
            </p>
          )}
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
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.email 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            placeholder='exemple@email.com'
            required
            readOnly={!!user?.email}
            maxLength={100}
          />
          {formErrors.email && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.email}
            </p>
          )}
          {user?.email && (
            <p className='mt-1 text-xs text-sky-600'>
              Cet email est lié à votre compte
            </p>
          )}
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
              formErrors.telephone 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            placeholder='+22812345678'
            required
            maxLength={20}
          />
          {formErrors.telephone ? (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.telephone}
            </p>
          ) : (
            <p className='mt-1 text-xs text-gray-500'>
              Format: +22812345678 (8-15 chiffres, premier chiffre ≠ 0)
            </p>
          )}
        </div>
      </div>
    </div>
  );

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
              className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
                formErrors.destination 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 focus:border-sky-500'
              }`}
              required
            >
              <option value=''>Sélectionnez une destination</option>
              {destinations.map(dest => (
                <option key={dest._id} value={dest.country}>
                  {dest.country}
                </option>
              ))}
            </select>
            {formErrors.destination && (
              <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
                <AlertCircle className='h-3 w-3' />
                {formErrors.destination}
              </p>
            )}

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
                  className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
                    formErrors.destinationAutre 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-sky-500'
                  }`}
                  placeholder='Ex: Suisse, Allemagne, Japon...'
                  maxLength={100}
                  required={showOtherDestination}
                />
                {formErrors.destinationAutre && (
                  <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
                    <AlertCircle className='h-3 w-3' />
                    {formErrors.destinationAutre}
                  </p>
                )}
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
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.niveauEtude 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            required
          >
            <option value=''>Sélectionnez votre niveau</option>
            {EDUCATION_LEVELS.map(niv => (
              <option key={niv} value={niv}>
                {niv}
              </option>
            ))}
          </select>
          {formErrors.niveauEtude && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.niveauEtude}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='filiere'
            className='mb-1 block text-xs font-medium text-gray-700'
          >
            <span className='flex items-center gap-1'>
              <Book className='text-sky-500 h-3 w-3' />
              Filière *
            </span>
          </label>
          <select
            id='filiere'
            name='filiere'
            value={formData.filiere}
            onChange={handleInputChange}
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.filiere 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            required
          >
            <option value=''>Sélectionnez votre filière</option>
            {FILIERES.map(fil => (
              <option key={fil} value={fil}>
                {fil}
              </option>
            ))}
          </select>
          {formErrors.filiere && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.filiere}
            </p>
          )}

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
                className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
                  formErrors.filiereAutre 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-sky-500'
                }`}
                placeholder='Ex: Architecture, Psychologie...'
                maxLength={100}
                required={showOtherFiliere}
              />
              {formErrors.filiereAutre && (
                <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
                  <AlertCircle className='h-3 w-3' />
                  {formErrors.filiereAutre}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div data-aos='fade-up' className='space-y-3'>
      <h2 className='text-md font-semibold text-sky-600'>
        <span className='flex items-center gap-2'>
          <CalendarIcon className='text-sky-500 h-4 w-4' />
          Choix du créneau
        </span>
      </h2>

      <div>
        <label
          htmlFor='date'
          className='mb-1 block text-xs font-medium text-gray-700'
        >
          <span className='flex items-center gap-1'>
            <CalendarIcon className='text-sky-500 h-3 w-3' />
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
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formErrors.date 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-sky-500'
            }`}
            required
          >
            <option value=''>Sélectionnez une date</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {formatDateDisplay(date)}
              </option>
            ))}
          </select>
        ) : (
          <div className='rounded border border-red-300 bg-red-50 px-3 py-2'>
            <p className='flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              Aucune date disponible pour les 60 prochains jours
            </p>
          </div>
        )}
        {formErrors.date && (
          <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
            <AlertCircle className='h-3 w-3' />
            {formErrors.date}
          </p>
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
                    {isPassed && ' ⌛'}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className='rounded border border-amber-300 bg-amber-50 px-3 py-2'>
              <p className='text-xs text-amber-700'>
                Tous les créneaux sont complets pour cette date
              </p>
            </div>
          )}

          {formErrors.time && (
            <p className='mt-1 flex items-center gap-1 text-xs text-red-600'>
              <AlertCircle className='h-3 w-3' />
              {formErrors.time}
            </p>
          )}

          {formData.time && (
            <div className='mt-3 rounded bg-sky-50 p-3'>
              <p className='text-xs text-sky-700'>
                <span className='font-medium'>Créneau sélectionné :</span>{' '}
                {formatDateDisplay(formData.date)} à {formData.time}
              </p>
              <p className='mt-1 text-xs text-sky-600'>
                Le rendez-vous sera <strong>automatiquement confirmé</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

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

  const renderSuccessMessage = () => (
    <div data-aos='zoom-in' className='text-center'>
      <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100'>
        <CheckCircle className='h-8 w-8 text-emerald-600' />
      </div>
      <h2 className='mb-3 text-lg font-bold text-gray-800'>
        Rendez-vous confirmé avec succès !
      </h2>
      <p className='mb-6 text-sm text-gray-600'>
        Votre rendez-vous a été créé et est <strong>automatiquement confirmé</strong>.
        <br />
        Vous recevrez une notification par email.
      </p>
      <div className='animate-pulse'>
        <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2'>
          <div className='h-2 w-2 rounded-full bg-emerald-500'></div>
          <span className='text-xs text-emerald-700'>
            Redirection vers vos rendez-vous...
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
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
        <meta name='yandexbot' content='noindex, nofollow' />
        <meta name='duckduckbot' content='noindex, nofollow' />
        <meta name='baidu' content='noindex, nofollow' />
        <meta name='naver' content='noindex, nofollow' />
        <meta name='seznam' content='noindex, nofollow' />
        <link
          rel='canonical'
          href='https://panameconsulting.vercel.app/rendez-vous'
        />
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=5" 
        />
      </Helmet>

      <div className='min-h-screen bg-linear-to-b from-sky-50 to-white py-6'>
        <div className='mx-auto max-w-2xl px-3 sm:px-4'>
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
                  Vous devez être connecté et avoir un compte pour prendre un rendez-vous.
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
                  📅 Prendre un rendez-vous
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
                      className='inline-flex items-center justify-center gap-2 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-sky-700 focus:border-sky-500 focus:outline-none focus:ring-none'
                    >
                      Continuer
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  ) : (
                    <button
                      type='submit'
                      disabled={loading}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        !loading
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'cursor-not-allowed bg-emerald-400 text-white'
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                          Création en cours...
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
                  <strong>Important :</strong> Le rendez-vous est automatiquement confirmé après création.
                  <br />
                  Vous ne pouvez avoir qu'un seul rendez-vous confirmé à la fois.
                  <br />
                  Les créneaux sont de 30 minutes entre 9h00 et 16h30, du lundi au vendredi.
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