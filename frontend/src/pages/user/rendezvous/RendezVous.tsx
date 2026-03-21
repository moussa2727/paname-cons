import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { useAuth } from "../../../hooks/useAuth";
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
} from "lucide-react";
import { useRendezvous } from "../../../hooks/useRendezvous";
import {
  DESTINATION_OPTIONS,
  NIVEAU_ETUDE_OPTIONS,
  FILIERE_OPTIONS,
  type TimeSlot,
  type CreateRendezvousDto,
  timeSlotToDisplay,
} from "../../../types/rendezvous.types";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: TimeSlot | "";
}

// ==================== COMPOSANTS RÉUTILISABLES ====================

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  minLength?: number;
  maxLength?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  icon,
  minLength,
  maxLength,
}) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1 block text-xs font-medium text-gray-700"
    >
      <span className="flex items-center gap-1">
        {icon}
        {label} {required && "*"}
      </span>
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
        error
          ? "border-red-300 focus:border-red-500"
          : "border-gray-300 focus:border-sky-500"
      }`}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  required?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  icon,
  placeholder = "Sélectionnez",
}) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1 block text-xs font-medium text-gray-700"
    >
      <span className="flex items-center gap-1">
        {icon}
        {label} {required && "*"}
      </span>
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

// ==================== COMPOSANT PRINCIPAL ====================

const RendezVous = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  // ✅ DÉLÉGATION COMPLÈTE AU HOOK
  const {
    availableDates: hookAvailableDates,
    availableSlots: hookAvailableSlots,
    loading,
    createRendezvous,
    checkAvailability,
    getAvailableSlots,
    loadAvailableDates,
    error: hookError,
  } = useRendezvous({
    autoLoad: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState<FormData>(() => ({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    destination: "",
    destinationAutre: "",
    niveauEtude: "",
    niveauEtudeAutre: "",
    filiere: "",
    filiereAutre: "",
    date: "",
    time: "",
  }));

  const [showOtherDestination, setShowOtherDestination] = useState(false);
  const [showOtherNiveau, setShowOtherNiveau] = useState(false);
  const [showOtherFiliere, setShowOtherFiliere] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ✅ Utiliser les erreurs
  const error = localError || hookError || loadError;

  // ✅ Transformer les dates disponibles
  const availableDates = useMemo(() => {
    console.log("[RendezVous] Dates reçues du hook:", hookAvailableDates);
    return hookAvailableDates.map((d) => d.date);
  }, [hookAvailableDates]);

  // ✅ Transformer les créneaux disponibles
  const availableSlotsForSelectedDate = useMemo(() => {
    console.log("[RendezVous] Créneaux reçus du hook:", hookAvailableSlots);
    console.log("[RendezVous] Date sélectionnée:", formData.date);

    if (!formData.date) return [];

    // hookAvailableSlots est un tableau de AvailableSlotsDto, je cherche celui pour la date
    const slotData = hookAvailableSlots.find(
      (slot) => slot.date === formData.date,
    );

    console.log("[RendezVous] Créneaux pour la date:", slotData);

    if (!slotData || !slotData.availableSlots) return [];

    // availableSlots est un tableau de strings (TimeSlot), je le transforme en objets
    return slotData.availableSlots.map((timeSlot) => {
      const displayTime = timeSlotToDisplay(timeSlot as TimeSlot);
      const [hours, minutes] = displayTime.split(":").map(Number);

      // Créer la date complète du rendez-vous
      const rendezvousDateTime = new Date(`${formData.date}T${displayTime}:00`);
      const now = new Date();

      // Calculer si le créneau est passé
      const isPast = rendezvousDateTime < now;

      // Calculer si c'est la pause déjeuner (12:30-14:00)
      const isLunchBreak = (hours === 12 && minutes >= 30) || hours === 13;

      return {
        time: timeSlot,
        displayTime,
        available: !isPast && !isLunchBreak, // Désactiver si passé ou pause déjeuner
        isPast,
        isLunchBreak,
      };
    });
  }, [hookAvailableSlots, formData.date]);

  // Initialiser le formulaire avec les données utilisateur
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        telephone: user.telephone || "",
      }));
    }
  }, [user]);

  // Initialisation AOS
  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/connexion");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // ✅ Charger les dates disponibles
  useEffect(() => {
    const loadDates = async () => {
      if (!isAuthenticated) {
        console.log(
          "[RendezVous] Utilisateur non authentifié, pas de chargement",
        );
        return;
      }

      console.log("[RendezVous] Début chargement des dates...");
      setIsLoadingDates(true);
      setLoadError(null);

      try {
        // Charger les dates pour les 3 prochains mois
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(today.getMonth() + 3);

        const todayStr = today.toISOString().split("T")[0];
        const threeMonthsStr = threeMonthsLater.toISOString().split("T")[0];

        console.log(
          "[RendezVous] Appel getAvailableDates avec:",
          todayStr,
          threeMonthsStr,
        );

        await loadAvailableDates(todayStr, threeMonthsStr);

        console.log("[RendezVous] Dates chargées avec succès");
      } catch (err) {
        console.error("[RendezVous] Erreur détaillée chargement dates:", err);
        setLoadError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoadingDates(false);
      }
    };

    loadDates();
  }, [isAuthenticated, loadAvailableDates]);

  // ✅ Charger les créneaux quand la date change
  useEffect(() => {
    const loadSlots = async () => {
      if (!formData.date || !isAuthenticated) {
        console.log("[RendezVous] Pas de date sélectionnée ou non authentifié");
        return;
      }

      console.log("[RendezVous] Chargement des créneaux pour:", formData.date);
      setIsLoadingSlots(true);
      setLoadError(null);

      try {
        await getAvailableSlots(formData.date);
        console.log("[RendezVous] Créneaux chargés avec succès");
      } catch (err) {
        console.error(
          "[RendezVous] Erreur détaillée chargement créneaux:",
          err,
        );
        setLoadError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [formData.date, isAuthenticated, getAvailableSlots]);

  // Gestion des changements de formulaire
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Gestion des champs "Autre"
    const handlers: Record<
      string,
      { setter: (val: boolean) => void; resetField: string }
    > = {
      destination: {
        setter: setShowOtherDestination,
        resetField: "destinationAutre",
      },
      niveauEtude: {
        setter: setShowOtherNiveau,
        resetField: "niveauEtudeAutre",
      },
      filiere: { setter: setShowOtherFiliere, resetField: "filiereAutre" },
    };

    if (name in handlers) {
      const handler = handlers[name];
      handler.setter(value === "Autre");
      if (value !== "Autre") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          [handler.resetField]: "",
        }));
        return;
      }
    }

    // Si on change la date, réinitialiser l'heure sélectionnée
    if (name === "date") {
      setFormData((prev) => ({ ...prev, [name]: value, time: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setLocalError(null);
  };

  // Validation téléphone
  const validatePhone = useCallback((phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanedPhone) && !cleanedPhone.startsWith("+0");
  }, []);

  // Validation de chaque étape
  const isStepValid = useCallback(
    (step: number): boolean => {
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
          if (
            formData.destination === "Autre" &&
            !formData.destinationAutre?.trim()
          )
            return false;

          if (!formData.niveauEtude) return false;
          if (
            formData.niveauEtude === "Autre" &&
            !formData.niveauEtudeAutre?.trim()
          )
            return false;

          if (!formData.filiere) return false;
          if (formData.filiere === "Autre" && !formData.filiereAutre?.trim())
            return false;

          return true;

        case 3:
          return !!(formData.date && formData.time);

        default:
          return false;
      }
    },
    [formData, validatePhone],
  );

  // Navigation entre les étapes
  const nextStep = useCallback((): void => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      setTimeout(() => AOS.refreshHard(), 50);
    } else {
      const errors: Record<number, Record<string, string>> = {
        1: {
          name: "Veuillez remplir votre nom et prénom",
          email: "Veuillez remplir votre adresse email",
          phone: "Veuillez remplir un numéro de téléphone valide",
        },
        2: {
          destination: "Veuillez sélectionner une destination",
          destinationAutre: "Veuillez spécifier votre destination",
          niveau: "Veuillez sélectionner votre niveau d'étude",
          niveauAutre: "Veuillez spécifier votre niveau d'étude",
          filiere: "Veuillez sélectionner une filière",
          filiereAutre: "Veuillez spécifier votre filière",
        },
      };

      if (currentStep === 1) {
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
          setLocalError(errors[1].name);
        } else if (!formData.email?.trim()) {
          setLocalError(errors[1].email);
        } else if (
          !formData.telephone?.trim() ||
          !validatePhone(formData.telephone)
        ) {
          setLocalError(errors[1].phone);
        }
      } else if (currentStep === 2) {
        if (!formData.destination) {
          setLocalError(errors[2].destination);
        } else if (
          formData.destination === "Autre" &&
          !formData.destinationAutre?.trim()
        ) {
          setLocalError(errors[2].destinationAutre);
        } else if (!formData.niveauEtude) {
          setLocalError(errors[2].niveau);
        } else if (
          formData.niveauEtude === "Autre" &&
          !formData.niveauEtudeAutre?.trim()
        ) {
          setLocalError(errors[2].niveauAutre);
        } else if (!formData.filiere) {
          setLocalError(errors[2].filiere);
        } else if (
          formData.filiere === "Autre" &&
          !formData.filiereAutre?.trim()
        ) {
          setLocalError(errors[2].filiereAutre);
        }
      }
    }
  }, [currentStep, isStepValid, formData, validatePhone]);

  const prevStep = useCallback((): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 50);
  }, []);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!isStepValid(3) || !formData.time) return;

    try {
      const availabilityCheck = await checkAvailability(
        formData.date,
        formData.time as TimeSlot,
      );

      if (availabilityCheck && !availabilityCheck.available) {
        await getAvailableSlots(formData.date);
        setFormData((prev) => ({ ...prev, time: "" }));
        setLocalError(
          "Ce créneau n'est plus disponible. Veuillez en choisir un autre.",
        );
        return;
      }

      const submitData: CreateRendezvousDto = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim(),
        destination: formData.destination,
        destinationAutre:
          formData.destination === "Autre"
            ? formData.destinationAutre?.trim()
            : undefined,
        niveauEtude: formData.niveauEtude,
        niveauEtudeAutre:
          formData.niveauEtude === "Autre"
            ? formData.niveauEtudeAutre?.trim()
            : undefined,
        filiere: formData.filiere,
        filiereAutre:
          formData.filiere === "Autre"
            ? formData.filiereAutre?.trim()
            : undefined,
        date: formData.date,
        time: formData.time as TimeSlot,
      };

      const result = await createRendezvous(submitData);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/user/mes-rendezvous");
        }, 2000);
      }
    } catch (err) {
      console.error("Erreur création rendez-vous:", err);
    }
  };

  // Rendu des étapes
  const renderStep3 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <Calendar className="text-sky-500 h-4 w-4" />
          Choix du créneau
        </span>
      </h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          <span className="flex items-center gap-1">
            <Calendar className="text-sky-500 h-3 w-3" />
            Date *
          </span>
        </label>
        {isLoadingDates ? (
          <div className="rounded border border-gray-300 bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-600">
              Chargement des dates disponibles...
            </p>
          </div>
        ) : availableDates.length > 0 ? (
          <select
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            required
          >
            <option value="">Sélectionnez une date</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-700">
              {loadError || "Aucune date disponible pour le moment"}
            </p>
          </div>
        )}
      </div>

      {formData.date && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            <span className="flex items-center gap-1">
              <Clock className="text-sky-500 h-3 w-3" />
              Horaire *
            </span>
          </label>
          {isLoadingSlots ? (
            <div className="rounded border border-gray-300 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-600">
                Chargement des créneaux disponibles...
              </p>
            </div>
          ) : availableSlotsForSelectedDate.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {availableSlotsForSelectedDate.map((slot) => {
                const isSelected = formData.time === slot.time;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() =>
                      slot.available &&
                      setFormData((prev) => ({
                        ...prev,
                        time: slot.time as TimeSlot,
                      }))
                    }
                    disabled={!slot.available || isLoadingSlots}
                    className={`rounded px-2 py-1.5 text-xs transition-all duration-150 focus:outline-none focus:ring-none ${
                      isSelected
                        ? "bg-sky-600 text-white"
                        : slot.isPast
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : slot.isLunchBreak
                            ? "cursor-not-allowed bg-orange-50 text-orange-400 border border-orange-200"
                            : "border border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                    title={
                      slot.isPast
                        ? "Ce créneau est déjà passé"
                        : slot.isLunchBreak
                          ? "Pause déjeuner (12:30-14:00)"
                          : "Créneau disponible"
                    }
                  >
                    {slot.displayTime}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">
                {loadError || "Aucun créneau disponible pour cette date"}
              </p>
            </div>
          )}

          {formData.time && (
            <div className="mt-3 rounded bg-sky-50 p-3">
              <p className="text-xs text-sky-700">
                <span className="font-medium">Créneau sélectionné :</span>{" "}
                {new Date(formData.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                à {timeSlotToDisplay(formData.time as TimeSlot)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ... (le reste des fonctions de rendu reste identique)

  return (
    <>
      <Helmet>
        <title>Prenez Rendez-Vous - Paname Consulting</title>
        <meta
          name="description"
          content="Prenez rendez-vous avec un conseiller Paname Consulting"
        />
      </Helmet>

      <div className="min-h-screen py-6">
        <div className="mx-auto max-w-2xl px-3 sm:px-4">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-white p-2 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-sky-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Prendre un rendez-vous
            </h1>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-500" />
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button
                  onClick={() => {
                    setLocalError(null);
                    setLoadError(null);
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {success ? (
            <div
              data-aos="zoom-in"
              className="overflow-hidden rounded-lg bg-white p-8 shadow-lg"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="mb-3 text-lg font-bold text-gray-800">
                  Rendez-vous confirmé !
                </h2>
                <p className="mb-6 text-sm text-gray-600">
                  Votre rendez-vous a été créé avec succès.
                  <br />
                  Vous allez être redirigé vers vos rendez-vous.
                </p>
                <div className="animate-pulse">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-700">
                      Redirection en cours...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-lg bg-white shadow-lg"
              data-aos="fade-up"
            >
              <div className="border-b border-gray-100 bg-linear-to-r from-sky-500 to-sky-600 px-6 py-4">
                <h1 className="text-xl font-bold text-white">
                  Prendre un rendez-vous
                </h1>
                <p className="mt-1 text-sm text-sky-100">
                  Complétez les informations pour planifier votre consultation
                </p>
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 ${
                            currentStep >= step
                              ? "bg-sky-600 text-white"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {step}
                        </div>
                        <span
                          className={`mt-1 text-xs font-medium ${
                            currentStep >= step
                              ? "text-sky-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step === 1
                            ? "Personnel"
                            : step === 2
                              ? "Projet"
                              : "Créneau"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative -mt-4">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-200">
                      <div
                        className="h-full bg-sky-600 transition-all duration-150"
                        style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {currentStep === 1 && (
                    <div data-aos="fade-up" className="space-y-3">
                      <h2 className="text-md font-semibold text-sky-600">
                        <span className="flex items-center gap-2">
                          <User className="text-sky-500 h-4 w-4" />
                          Informations personnelles
                        </span>
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InputField
                          label="Prénom"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Votre prénom"
                          required
                          icon={<Dock className="text-sky-500 h-3 w-3" />}
                          minLength={2}
                          maxLength={50}
                        />
                        <InputField
                          label="Nom"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Votre nom"
                          required
                          icon={<Book className="text-sky-500 h-3 w-3" />}
                          minLength={2}
                          maxLength={50}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InputField
                          label="Email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="exemple@email.com"
                          required
                          icon={<Mail className="text-sky-500 h-3 w-3" />}
                          maxLength={100}
                        />
                        <InputField
                          label="Téléphone"
                          name="telephone"
                          type="tel"
                          value={formData.telephone}
                          onChange={handleInputChange}
                          placeholder="+22812345678"
                          required
                          icon={<Phone className="text-sky-500 h-3 w-3" />}
                          error={
                            formData.telephone &&
                            !validatePhone(formData.telephone)
                              ? "Format: +22812345678 (8-15 chiffres)"
                              : undefined
                          }
                          maxLength={20}
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div data-aos="fade-up" className="space-y-3">
                      <h2 className="text-md font-semibold text-sky-600">
                        <span className="flex items-center gap-2">
                          <GraduationCap className="text-sky-500 h-4 w-4" />
                          Projet d'études
                        </span>
                      </h2>
                      <div>
                        <SelectField
                          label="Destination"
                          name="destination"
                          value={formData.destination}
                          onChange={handleInputChange}
                          options={DESTINATION_OPTIONS}
                          required
                          icon={<Globe className="text-sky-500 h-3 w-3" />}
                        />
                        {showOtherDestination && (
                          <div className="mt-3">
                            <InputField
                              label="Précisez votre destination"
                              name="destinationAutre"
                              value={formData.destinationAutre || ""}
                              onChange={handleInputChange}
                              placeholder="Ex: Suisse, Allemagne, Japon..."
                              required
                              icon={<Target className="text-sky-500 h-3 w-3" />}
                              maxLength={100}
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <SelectField
                            label="Niveau d'étude"
                            name="niveauEtude"
                            value={formData.niveauEtude}
                            onChange={handleInputChange}
                            options={NIVEAU_ETUDE_OPTIONS}
                            required
                            icon={<Award className="text-sky-500 h-3 w-3" />}
                          />
                          {showOtherNiveau && (
                            <div className="mt-3">
                              <InputField
                                label="Précisez votre niveau"
                                name="niveauEtudeAutre"
                                value={formData.niveauEtudeAutre || ""}
                                onChange={handleInputChange}
                                placeholder="Ex: BTS, DUT, Formation professionnelle..."
                                required
                                icon={
                                  <Target className="text-sky-500 h-3 w-3" />
                                }
                                maxLength={100}
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <SelectField
                            label="Filière"
                            name="filiere"
                            value={formData.filiere}
                            onChange={handleInputChange}
                            options={FILIERE_OPTIONS}
                            required
                            icon={<BookOpen className="text-sky-500 h-3 w-3" />}
                          />
                          {showOtherFiliere && (
                            <div className="mt-3">
                              <InputField
                                label="Précisez votre filière"
                                name="filiereAutre"
                                value={formData.filiereAutre || ""}
                                onChange={handleInputChange}
                                placeholder="Ex: Architecture, Psychologie..."
                                required
                                icon={
                                  <Target className="text-sky-500 h-3 w-3" />
                                }
                                maxLength={100}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && renderStep3()}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 focus:border-sky-500 focus:outline-none focus:ring-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        isStepValid(currentStep)
                          ? "bg-sky-600 text-white hover:bg-sky-700"
                          : "cursor-not-allowed bg-gray-300 text-gray-500"
                      }`}
                    >
                      Continuer
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading.create || !isStepValid(3)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        !loading.create && isStepValid(3)
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "cursor-not-allowed bg-gray-300 text-gray-500"
                      }`}
                    >
                      {loading.create ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          Confirmer le rendez-vous
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <p className="text-center text-xs text-gray-500">
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
