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
  CheckCircle
} from 'lucide-react';
import AOS from 'aos';

// Réinitialiser AOS à chaque montage (pour hydratation SSR ou navigation)
AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 50 });

interface AvailableDate {
  date: string;
  available: boolean;
}

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

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const RendezVous: React.FC = () => {
  const { user, token, isAuthenticated, refreshToken, logout } = useAuth();
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
    time: ''
  });

  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDestinationOther, setShowDestinationOther] = useState(false);
  const [showFiliereOther, setShowFiliereOther] = useState(false);

  const destinations = [
    'Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'
  ];

  const niveauxEtude = [
    'Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'
  ];

  const filieres = [
    'Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'
  ];

  // Ref pour forcer le refresh AOS après changement dynamique (ex: step 2 → 3)
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        telephone: user.telephone || ''
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const preselectedDestination = location.state?.preselectedDestination;
    if (preselectedDestination && destinations.includes(preselectedDestination)) {
      setFormData(prev => ({ ...prev, destination: preselectedDestination }));
    }
  }, [location.state]);

  useEffect(() => {
    setShowDestinationOther(formData.destination === 'Autre');
    setShowFiliereOther(formData.filiere === 'Autre');
  }, [formData.destination, formData.filiere]);

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
      return false;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);
    
    return selectedTime < today;
  };

  const fetchAvailableDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-dates`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement des dates`);
      }
      
      const dates = await response.json();
      
      const today = new Date().toISOString().split('T')[0];
      const filteredDates = dates
        .filter((date: string) => !isDatePassed(date))
        .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
      
      setAvailableDates(filteredDates.map((date: string) => ({ 
        date, 
        available: true 
      })));
    } catch (error) {
      console.error('Erreur chargement dates:', error);
      toast.error('Impossible de charger les dates disponibles');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const fetchAvailableSlots = useCallback(async (date: string) => {
    if (!date) return;
    
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-slots?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement des créneaux`);
      }
      
      let slots = await response.json();
      
      if (date === new Date().toISOString().split('T')[0]) {
        slots = slots.filter((slot: string) => !isTimePassed(slot, date));
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Erreur chargement créneaux:', error);
      toast.error('Impossible de charger les créneaux disponibles');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots(formData.date);
    }
  }, [formData.date, fetchAvailableSlots]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    return /^\d{10,}$/.test(cleanedPhone);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName.trim() && 
                 formData.lastName.trim() && 
                 formData.email.trim() && 
                 formData.telephone.trim() && 
                 validatePhone(formData.telephone));
      case 2:
        if (formData.destination === 'Autre' && !formData.destinationAutre.trim()) return false;
        if (formData.filiere === 'Autre' && !formData.filiereAutre.trim()) return false;
        return !!(formData.destination && formData.niveauEtude && formData.filiere);
      case 3:
        return !!(formData.date && formData.time);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      // Déclencher refresh AOS après changement de step
      setTimeout(() => AOS.refreshHard(), 100);
    } else {
      toast.error('Veuillez remplir tous les champs obligatoires');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un rendez-vous');
      navigate('/connexion');
      return;
    }

    if (!token) {
      toast.error('Session invalide. Veuillez vous reconnecter.');
      logout();
      return;
    }

    if (!validatePhone(formData.telephone)) {
      toast.error('Veuillez entrer un numéro de téléphone valide (au moins 10 chiffres)');
      return;
    }

    setLoading(true);

    try {
      const submitData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim(),
        niveauEtude: formData.niveauEtude,
        date: formData.date,
        time: formData.time
      };

      if (formData.destination === 'Autre') {
        if (!formData.destinationAutre || formData.destinationAutre.trim() === '') {
          throw new Error('Veuillez préciser votre destination');
        }
        submitData.destination = formData.destinationAutre.trim();
        submitData.destinationAutre = formData.destinationAutre.trim();
      } else {
        submitData.destination = formData.destination;
      }

      if (formData.filiere === 'Autre') {
        if (!formData.filiereAutre || formData.filiereAutre.trim() === '') {
          throw new Error('Veuillez préciser votre filière');
        }
        submitData.filiere = formData.filiereAutre.trim();
        submitData.filiereAutre = formData.filiereAutre.trim();
      } else {
        submitData.filiere = formData.filiere;
      }

      if (!submitData.destination || submitData.destination.trim() === '') {
        throw new Error('La destination est obligatoire');
      }

      if (!submitData.filiere || submitData.filiere.trim() === '') {
        throw new Error('La filière est obligatoire');
      }

      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
      };

      let response = await makeRequest(token);

      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la création du rendez-vous';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          if (errorData.errors) {
            const validationErrors = Object.values(errorData.errors).join(', ');
            errorMessage = `Erreur de validation: ${validationErrors}`;
          }
        } catch {
          errorMessage = `Erreur serveur: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast.success('Rendez-vous créé avec succès !');
      
      setTimeout(() => {
        navigate('/user-rendez-vous');
      }, 1500);

    } catch (error: any) {
      console.error('❌ Erreur création rendez-vous:', error);
      
      if (error.message.includes('Session expirée') || error.message.includes('Token invalide')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => logout(), 1500);
      } else if (error.message.includes('déjà un rendez-vous en cours')) {
        toast.error('Vous avez déjà un rendez-vous en cours. Annulez-le avant d\'en prendre un nouveau.');
      } else if (error.message.includes('créneau horaire') || error.message.includes('disponible')) {
        toast.error('Ce créneau n\'est plus disponible. Veuillez choisir un autre horaire.');
        if (formData.date) {
          fetchAvailableSlots(formData.date);
        }
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        toast.error('Erreur serveur. Veuillez réessayer dans quelques instants.');
        console.error('Détails erreur 500:', error);
      } else {
        toast.error(error.message || 'Erreur lors de la création du rendez-vous');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div 
      ref={stepRef}
      data-aos="fade-up"
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Informations Personnelles</h3>
        <p className="text-gray-600 text-sm">Renseignez vos coordonnées</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-medium text-gray-700">Prénom *</label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            minLength={2}
            maxLength={50}
            autoComplete="given-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
            placeholder="Votre prénom"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Nom *</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            minLength={2}
            maxLength={50}
            autoComplete="family-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
            placeholder="Votre nom"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
            placeholder="votre@email.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="telephone" className="text-sm font-medium text-gray-700">Téléphone *</label>
          <input
            id="telephone"
            type="tel"
            name="telephone"
            value={formData.telephone}
            onChange={handleInputChange}
            required
            pattern="[0-9\s\+\-\(\)]{10,}"
            title="Numéro de téléphone valide (ex: +33 1 23 45 67 89 ou 0123456789)"
            autoComplete="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
            placeholder="+33 1 23 45 67 89"
          />
          {formData.telephone && !validatePhone(formData.telephone) && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Format invalide. Au moins 10 chiffres requis.
            </p>
          )}
          {formData.telephone && validatePhone(formData.telephone) && (
            <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Format valide
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div 
      ref={stepRef}
      data-aos="fade-up"
      data-aos-delay="100"
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Destination et Parcours</h3>
        <p className="text-gray-600 text-sm">Choisissez votre destination et parcours académique</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="destination" className="text-sm font-medium text-gray-700">Destination *</label>
          <select
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleInputChange}
            required
            autoComplete="country"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all appearance-none bg-white"
          >
            <option value="">Choisir une destination</option>
            {destinations.map(dest => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
          </select>
        </div>

        {showDestinationOther && (
          <div 
            data-aos="fade-in"
            data-aos-delay="200"
            className="space-y-2"
          >
            <label htmlFor="destinationAutre" className="text-sm font-medium text-gray-700">Précisez votre destination *</label>
            <input
              id="destinationAutre"
              type="text"
              name="destinationAutre"
              value={formData.destinationAutre}
              onChange={handleInputChange}
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
              placeholder="Ex: Canada, Belgique, Suisse..."
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="niveauEtude" className="text-sm font-medium text-gray-700">Niveau d'étude *</label>
          <select
            id="niveauEtude"
            name="niveauEtude"
            value={formData.niveauEtude}
            onChange={handleInputChange}
            required
            autoComplete="education-level"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all appearance-none bg-white"
          >
            <option value="">Choisir votre niveau</option>
            {niveauxEtude.map(niveau => (
              <option key={niveau} value={niveau}>{niveau}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="filiere" className="text-sm font-medium text-gray-700">Filière *</label>
          <select
            id="filiere"
            name="filiere"
            value={formData.filiere}
            onChange={handleInputChange}
            required
            autoComplete="organization-title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all appearance-none bg-white"
          >
            <option value="">Choisir une filière</option>
            {filieres.map(filiere => (
              <option key={filiere} value={filiere}>{filiere}</option>
            ))}
          </select>
        </div>

        {showFiliereOther && (
          <div 
            data-aos="fade-in"
            data-aos-delay="300"
            className="space-y-2"
          >
            <label htmlFor="filiereAutre" className="text-sm font-medium text-gray-700">Précisez votre filière *</label>
            <input
              id="filiereAutre"
              type="text"
              name="filiereAutre"
              value={formData.filiereAutre}
              onChange={handleInputChange}
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
              placeholder="Ex: Architecture, Design, Psychologie..."
            />
          </div>
        )}
      </div>
    </div>
  );

  const CompactDatePicker = () => (
    <div 
      data-aos="fade-up"
      data-aos-delay="0"
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Date *</label>
        {loadingDates && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Chargement...</span>
          </div>
        )}
      </div>
      
      {loadingDates ? (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement des dates...</span>
          </div>
        </div>
      ) : availableDates.length === 0 ? (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg text-xs">
          <Calendar className="w-5 h-5 mx-auto mb-1 opacity-50" />
          <p>Aucune date disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
          {availableDates.map(({ date }) => {
            const isSelected = formData.date === date;
            const isToday = date === new Date().toISOString().split('T')[0];
            const dateObj = new Date(date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
            const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
            
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, date, time: '' }));
                }}
                className={`p-2 text-center rounded-lg border transition-all min-h-[50px] flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                    : 'border-gray-200 hover:border-sky-300 hover:bg-sky-25 text-gray-700'
                }`}
              >
                <div className="text-[10px] text-gray-500 font-medium uppercase">{weekday}</div>
                <div className="text-base font-bold text-current">{day}</div>
                <div className="text-[10px] text-gray-600 uppercase">{month}</div>
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full"></div>
                )}
                {isSelected && (
                  <CheckCircle2 className="w-3 h-3 text-sky-500 absolute -top-1 -right-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const CompactTimeSlot = () => (
    <div 
      data-aos="fade-up"
      data-aos-delay="150"
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Heure *</label>
        {loadingSlots && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Chargement...</span>
          </div>
        )}
      </div>
      
      {loadingSlots ? (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement des créneaux...</span>
          </div>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg text-xs">
          <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
          <p>Aucun créneau disponible</p>
          <p className="text-[10px] mt-1">Choisissez une autre date</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1">
          {availableSlots.map(slot => {
            const isSelected = formData.time === slot;
            const isTimeDisabled = isTimePassed(slot, formData.date);
            const isSoon = (() => {
              if (formData.date !== new Date().toISOString().split('T')[0]) return false;
              const [hours, minutes] = slot.split(':').map(Number);
              const slotTime = new Date();
              slotTime.setHours(hours, minutes, 0, 0);
              const now = new Date();
              const diffMs = slotTime.getTime() - now.getTime();
              return diffMs < 2 * 60 * 60 * 1000;
            })();

            return (
              <button
                key={slot}
                type="button"
                onClick={() => !isTimeDisabled && setFormData(prev => ({ ...prev, time: slot }))}
                disabled={isTimeDisabled}
                className={`p-2 text-center rounded-lg border transition-all text-xs font-medium relative ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                    : isTimeDisabled
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-sky-300 hover:bg-sky-25 text-gray-700'
                } ${isSoon ? 'ring-1 ring-orange-300' : ''}`}
              >
                {slot.replace(':', 'h')}
                {isTimeDisabled && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                )}
                {isSoon && !isTimeDisabled && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                )}
                {isSelected && !isTimeDisabled && (
                  <CheckCircle2 className="w-2.5 h-2.5 absolute -top-1 -right-1 text-sky-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div 
      ref={stepRef}
      data-aos="fade-up"
      data-aos-delay="0"
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <Calendar className="w-5 h-5 text-sky-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Date et Heure</h3>
        <p className="text-gray-600 text-xs">Sélectionnez votre créneau</p>
      </div>
  
      <div className="space-y-4">
        <CompactDatePicker />
        
        {formData.date && <CompactTimeSlot />}
  
        {formData.date && formData.time && (
          <div 
            data-aos="zoom-in"
            data-aos-delay="250"
            className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-3"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-sky-700">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">{formatDateDisplay(formData.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sky-700">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">{formData.time.replace(':', 'h')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const ProgressSteps = () => (
    <div 
      data-aos="fade-down"
      className="flex justify-between items-center mb-6 relative max-w-md mx-auto"
    >
      {[1, 2, 3].map(step => (
        <div key={step} className="flex flex-col items-center z-10">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
            step === currentStep
              ? 'border-sky-500 bg-sky-500 text-white shadow-lg scale-110'
              : step < currentStep
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}>
            {step < currentStep ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <span className="text-xs font-bold">{step}</span>
            )}
          </div>
          <span className={`text-xs mt-1 font-medium ${
            step === currentStep ? 'text-sky-600' : 
            step < currentStep ? 'text-green-600' : 'text-gray-500'
          }`}>
            {step === 1 && 'Infos'}
            {step === 2 && 'Destination'}
            {step === 3 && 'Horaire'}
          </span>
        </div>
      ))}
      <div className="absolute top-4 left-1/4 right-1/4 h-0.5 bg-gray-200 -z-10">
        <div 
          className="h-full bg-sky-500 transition-all duration-500 rounded-full"
          style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div 
          data-aos="fade-down"
          className="text-center mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Prendre un Rendez-vous
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Consultation personnalisée pour vos études à l'étranger
          </p>
        </div>

        {/* Carte principale */}
        <div 
          data-aos="zoom-in"
          data-aos-delay="100"
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-blue-50">
            <ProgressSteps />
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="min-h-[350px]">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            {/* Boutons de navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50 transition-all font-medium"
              >
                Précédent
              </button>

              <div className="flex items-center gap-2">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepValid(currentStep)}
                    className="px-5 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2 text-sm"
                  >
                    Suivant
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isStepValid(3) || loading}
                    className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Confirmer
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Informations supplémentaires */}
        <div 
          data-aos="fade-up"
          data-aos-delay="400"
          className="mt-4 text-center text-xs text-gray-500"
        >
          <p>• Confirmation immédiate par email • Horaires disponibles : du lundi au vendredi, 9h-16h30 •</p>
        </div>
      </div>
    </div>
  );
};

export default RendezVous;