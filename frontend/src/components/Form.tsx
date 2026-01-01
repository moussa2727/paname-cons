import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
  AlertCircle,
  CheckCircle,
  Check
} from 'lucide-react';

// Types pour TypeScript - Alignés avec le backend
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

interface SubmitStatus {
  success?: boolean;
  message?: string;
}

const Form = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ✅ Configuration API - IMPORTANT: Utilise VITE_API_URL tel quel
  const API_URL = import.meta.env.VITE_API_URL;
  
  // 🔍 Débogage des variables d'environnement (uniquement en dev)
  useEffect(() => {
    setIsClient(true);
    
    if (import.meta.env.DEV) {
      console.log('=== ENVIRONMENT DEBUG ===');
      console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
      console.log('Mode:', import.meta.env.MODE);
      console.log('Dev:', import.meta.env.DEV);
      console.log('Prod:', import.meta.env.PROD);
      console.log('=== END DEBUG ===');
    }
  }, []);

  // Effet de nettoyage des messages de statut
  useEffect(() => {
    if (submitStatus.message) {
      const timer = setTimeout(() => setSubmitStatus({}), 8000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  // Validation mémoïsée
  const validateField = useCallback((name: string, value: string): string => {
    const trimmedValue = value.trim();

    switch (name) {
      case 'email':
        if (!trimmedValue) return 'Email obligatoire';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue))
          return 'Format d\'email invalide';
        return '';
      case 'message':
        if (!trimmedValue) return 'Le message est obligatoire';
        if (trimmedValue.length < 10)
          return 'Le message doit contenir au moins 10 caractères';
        if (trimmedValue.length > 2000)
          return 'Le message ne doit pas dépasser 2000 caractères';
        return '';
      case 'firstName':
      case 'lastName':
        if (trimmedValue && trimmedValue.length > 50)
          return 'Ce champ ne doit pas dépasser 50 caractères';
        return '';
      default:
        return '';
    }
  }, []);

  // Gestion des champs touchés
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setTouchedFields(prev => new Set(prev).add(name));
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    },
    [validateField]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (touchedFields.has(name)) {
        setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
      }
    },
    [touchedFields, validateField]
  );

  // ✅ FONCTION DE SOUMISSION CORRIGÉE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formRef.current) {
      setSubmitStatus({
        success: false,
        message: 'Erreur: Formulaire non disponible',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({});

    // Récupération des données
    const formData = new FormData(formRef.current);
    const data: FormData = {
      firstName: (formData.get('firstName') as string)?.trim() || '',
      lastName: (formData.get('lastName') as string)?.trim() || '',
      email: (formData.get('email') as string)?.trim() || '',
      message: (formData.get('message') as string)?.trim() || '',
    };

    // Validation complète
    const newErrors: ValidationErrors = {
      email: validateField('email', data.email),
      message: validateField('message', data.message),
      firstName: validateField('firstName', data.firstName),
      lastName: validateField('lastName', data.lastName),
    };

    setErrors(newErrors);
    setTouchedFields(new Set(['email', 'message', 'firstName', 'lastName']));

    const hasErrors = Object.values(newErrors).some(error => error);
    if (hasErrors) {
      setIsSubmitting(false);
      
      // Focus sur le premier champ en erreur
      const firstErrorField = Object.keys(newErrors).find(
        key => newErrors[key as keyof ValidationErrors]
      );
      if (firstErrorField && globalThis.document) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.focus();
        }
      }
      
      setSubmitStatus({
        success: false,
        message: 'Veuillez corriger les erreurs dans le formulaire',
      });
      return;
    }

    try {
      // ✅ IMPORTANT: Vérification de l'URL API
      if (!API_URL) {
        throw new Error(
          'Configuration API manquante. ' +
          'Assurez-vous que VITE_API_URL est défini dans vos variables d\'environnement.'
        );
      }

      // Construction des données à envoyer
      const requestData: Record<string, string> = {
        email: data.email,
        message: data.message,
      };
      
      if (data.firstName) requestData.firstName = data.firstName;
      if (data.lastName) requestData.lastName = data.lastName;

      // ✅ Configuration de la requête avec timeout adapté
      const controller = new AbortController();
      const timeoutDuration = import.meta.env.PROD ? 30000 : 15000; // 30s en prod, 15s en dev
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      // ✅ URL CORRECTE: API_URL/api/contact
      const apiEndpoint = `${API_URL}/api/contact`;
      
      if (import.meta.env.DEV) {
        console.log('Envoi vers:', apiEndpoint);
        console.log('Données:', requestData);
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
        credentials: 'include', // Important pour les cookies/sessions
      });

      clearTimeout(timeoutId);

      // Gestion des réponses d'erreur
      if (!response.ok) {
        let errorMessage = `Erreur serveur (${response.status})`;
        
        try {
          const errorData = await response.json();
          
          // Gestion des erreurs de validation du backend
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const backendErrors: ValidationErrors = {};
            
            errorData.errors.forEach((error: any) => {
              if (error.property && error.constraints) {
                const fieldName = error.property as keyof ValidationErrors;
                const firstConstraint = Object.values(error.constraints)[0];
                backendErrors[fieldName] = firstConstraint as string;
              }
            });
            
            if (Object.keys(backendErrors).length > 0) {
              setErrors(backendErrors);
              setSubmitStatus({
                success: false,
                message: 'Veuillez corriger les erreurs ci-dessous',
              });
              setIsSubmitting(false);
              return;
            }
          }
          
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Si on ne peut pas parser la réponse JSON
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Succès
      const result = await response.json();
      
      setSubmitStatus({
        success: true,
        message: result.message || 'Message envoyé avec succès !',
      });
      
      // Réinitialisation du formulaire
      formRef.current.reset();
      setTouchedFields(new Set());
      setErrors({});
      
    } catch (error) {
      console.error('Erreur de soumission:', error);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Le délai de connexion a expiré. ';
          errorMessage += 'Votre connexion internet semble lente ou le serveur ne répond pas. ';
          errorMessage += 'Veuillez réessayer ou nous contacter directement par téléphone.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Impossible de se connecter au serveur. ';
          errorMessage += 'Vérifiez votre connexion internet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSubmitStatus({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rendu conditionnel SSR
  if (!isClient) {
    return (
      <main className='py-8 md:py-12 px-2 sm:px-4 lg:px-8 bg-gray-50 min-h-screen flex items-center justify-center'>
        <div className='max-w-7xl mx-auto w-full'>
          <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
            <div className='flex flex-col md:flex-row'>
              {/* Squelette de chargement */}
              <div className='w-full md:w-2/3 p-8 lg:p-12'>
                <div className='animate-pulse space-y-6'>
                  <div className='h-8 bg-gray-200 rounded w-1/3'></div>
                  <div className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div className='h-12 bg-gray-200 rounded'></div>
                      <div className='h-12 bg-gray-200 rounded'></div>
                    </div>
                    <div className='h-12 bg-gray-200 rounded'></div>
                    <div className='h-32 bg-gray-200 rounded'></div>
                    <div className='h-12 bg-gray-200 rounded w-1/4'></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='py-8 md:py-12 px-2 sm:px-4 lg:px-8 bg-linear-to-br from-gray-50 to-blue-50 min-h-screen'>
      <div className='max-w-7xl mx-auto'>
        <div className='bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100'>
          <div className='flex flex-col lg:flex-row'>
            {/* SECTION GAUCHE - Informations de contact */}
            <section className='lg:w-2/5 bg-linear-to-br from-blue-600 to-cyan-500 text-white p-8 lg:p-12 relative overflow-hidden'>
              <div className='absolute inset-0 bg-black opacity-5'></div>
              <div className='relative z-10'>
                <div className='mb-10'>
                  <h1 className='text-3xl font-bold mb-2'>Paname Consulting</h1>
                  <p className='text-blue-100'>Votre partenaire pour l'enseignement supérieur à l'étranger</p>
                </div>

                <div className='space-y-8 mb-10'>
                  <ContactInfo
                    icon={<MapPin className='w-6 h-6' />}
                    title='Notre bureau'
                    content={
                      <>
                        <p className='font-medium'>Kalaban Coura, Imm. BORE</p>
                        <p className='text-blue-100'>en face de l'hôtel Wassulu</p>
                      </>
                    }
                  />
                  <ContactInfo
                    icon={<Phone className='w-6 h-6' />}
                    title='Appelez-nous'
                    content={
                      <a 
                        href='tel:+22391830941' 
                        className='hover:underline transition-all duration-300 hover:text-white'
                      >
                        +223 91 83 09 41
                      </a>
                    }
                  />
                  <ContactInfo
                    icon={<Mail className='w-6 h-6' />}
                    title='Écrivez-nous'
                    content={
                      <a 
                        href='mailto:panameconsulting906@gmail.com'
                        className='hover:underline transition-all duration-300 hover:text-white'
                      >
                        panameconsulting906@gmail.com
                      </a>
                    }
                  />
                </div>

                {/* Carte Google Maps */}
                <div className='mt-12'>
                  <h3 className='text-xl font-semibold mb-4'>Nous trouver</h3>
                  <div className='rounded-xl overflow-hidden shadow-lg border-2 border-white/20'>
                    <iframe
                      src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3894.010270463331!2d-7.993864324930176!3d12.581574287699127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xe51cf2248975979%3A0xa90fabf3b7838312!2sImmeuble%20BORE!5e0!3m2!1sfr!2sml!4v1700000000000!5m2!1sfr!2sml'
                      className='w-full h-64'
                      loading='lazy'
                      title="Localisation Paname Consulting"
                      style={{ border: 0 }}
                      allowFullScreen
                      referrerPolicy='no-referrer-when-downgrade'
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FORMULAIRE */}
            <div className='lg:w-3/5 p-8 lg:p-12'>
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                className='space-y-8'
              >
                <div>
                  <h2 className='text-3xl font-bold text-gray-800 mb-3'>
                    Contactez-nous
                  </h2>
                  <p className='text-gray-600'>
                    Remplissez ce formulaire et notre équipe vous répondra dans les plus brefs délais.
                  </p>
                </div>

                {/* Messages de statut */}
                {submitStatus.message && (
                  <div
                    role='alert'
                    className={`p-4 rounded-xl border ${
                      submitStatus.success
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className='flex items-start'>
                      {submitStatus.success ? (
                        <CheckCircle className='w-5 h-5 mt-0.5 mr-3 shrink-0' />
                      ) : (
                        <AlertCircle className='w-5 h-5 mt-0.5 mr-3 shrink-0' />
                      )}
                      <div>
                        <p className='font-medium'>{submitStatus.message}</p>
                        {!submitStatus.success && (
                          <p className='text-sm mt-2 opacity-90'>
                            Si le problème persiste, contactez-nous directement au{' '}
                            <a href='tel:+22391830941' className='font-semibold hover:underline'>
                              +223 91 83 09 41
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className='space-y-6'>
                  {/* Nom et Prénom */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <InputField
                      id='firstName'
                      label='Prénom'
                      name='firstName'
                      type='text'
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.firstName}
                      touched={touchedFields.has('firstName')}
                      required={false}
                      icon={<User />}
                      placeholder='Votre prénom'
                      disabled={isSubmitting}
                      maxLength={50}
                    />
                    <InputField
                      id='lastName'
                      label='Nom'
                      name='lastName'
                      type='text'
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.lastName}
                      touched={touchedFields.has('lastName')}
                      required={false}
                      icon={<User />}
                      placeholder='Votre nom de famille'
                      disabled={isSubmitting}
                      maxLength={50}
                    />
                  </div>

                  {/* Email */}
                  <InputField
                    id='email'
                    label='Email'
                    name='email'
                    type='email'
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.email}
                    touched={touchedFields.has('email')}
                    required={true}
                    icon={<Mail />}
                    placeholder='votre@email.com'
                    disabled={isSubmitting}
                    autoComplete='email'
                  />

                  {/* Message */}
                  <TextAreaField
                    id='message'
                    label='Message'
                    name='message'
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.message}
                    touched={touchedFields.has('message')}
                    required={true}
                    icon={<MessageSquare />}
                    placeholder='Décrivez votre demande en détail...'
                    disabled={isSubmitting}
                    maxLength={2000}
                    rows={6}
                  />

                  {/* Bouton d'envoi */}
                  <button
                    type='submit'
                    disabled={isSubmitting}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold text-lg
                      transition-all duration-300 transform hover:scale-[1.02]
                      focus:outline-none focus:ring-4 focus:ring-blue-500/30
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                      ${isSubmitting 
                        ? 'bg-blue-400 cursor-wait' 
                        : 'bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600'
                      }
                      text-white shadow-lg hover:shadow-xl
                    `}
                  >
                    {isSubmitting ? (
                      <span className='flex items-center justify-center'>
                        <Spinner />
                        Envoi en cours...
                      </span>
                    ) : (
                      'Envoyer le message'
                    )}
                  </button>

                  {/* Note d'information */}
                  <div className='text-center pt-4'>
                    <p className='text-sm text-gray-500'>
                      Nous vous répondrons dans les 24 à 48 heures.
                      <br />
                      Les champs marqués d'un * sont obligatoires.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

// Composants enfants
interface ContactInfoProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const ContactInfo = ({ icon, title, content }: ContactInfoProps) => (
  <div className='flex items-start space-x-4'>
    <div className='p-2 bg-white/10 rounded-lg'>{icon}</div>
    <div>
      <h3 className='font-bold text-lg mb-1'>{title}</h3>
      <div className='text-blue-100'>{content}</div>
    </div>
  </div>
);

interface InputFieldProps {
  id: string;
  label: string;
  name: string;
  type?: string;
  error?: string;
  touched?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  required: boolean;
  icon: React.ReactNode;
  placeholder: string;
  disabled?: boolean;
  autoComplete?: string;
  maxLength?: number;
}

const InputField = ({
  id,
  label,
  name,
  type = 'text',
  error,
  touched,
  onChange,
  onBlur,
  required,
  icon,
  placeholder,
  disabled,
  autoComplete,
  maxLength,
}: InputFieldProps) => (
  <div>
    <label htmlFor={id} className='block text-sm font-semibold text-gray-700 mb-2'>
      {label} {required && <span className='text-red-500'>*</span>}
    </label>
    <div className='relative'>
      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400'>
        {icon}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`
          w-full pl-10 pr-4 py-3 rounded-xl border-2
          transition-all duration-200
          ${error 
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
            : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
          }
          hover:border-blue-300
          focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
    </div>
    {touched && error && (
      <p id={`${id}-error`} className='mt-2 text-sm text-red-600 flex items-center'>
        <AlertCircle className='w-4 h-4 mr-1' />
        {error}
      </p>
    )}
  </div>
);

interface TextAreaFieldProps {
  id: string;
  label: string;
  name: string;
  error?: string;
  touched?: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  required: boolean;
  icon: React.ReactNode;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
}

const TextAreaField = ({
  id,
  label,
  name,
  error,
  touched,
  onChange,
  onBlur,
  required,
  icon,
  placeholder,
  disabled,
  maxLength,
  rows = 5,
}: TextAreaFieldProps) => (
  <div>
    <label htmlFor={id} className='block text-sm font-semibold text-gray-700 mb-2'>
      {label} {required && <span className='text-red-500'>*</span>}
    </label>
    <div className='relative'>
      <div className='absolute top-3 left-3 text-gray-400'>
        {icon}
      </div>
      <textarea
        id={id}
        name={name}
        rows={rows}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`
          w-full pl-10 pr-4 py-3 rounded-xl border-2
          transition-all duration-200
          ${error 
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
            : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
          }
          hover:border-blue-300
          focus:outline-none
          resize-y
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
    </div>
    <div className='flex justify-between mt-2'>
      {touched && error ? (
        <p id={`${id}-error`} className='text-sm text-red-600 flex items-center'>
          <AlertCircle className='w-4 h-4 mr-1' />
          {error}
        </p>
      ) : (
        <div></div>
      )}
      {maxLength && (
        <span className='text-xs text-gray-500'>
          {`${placeholder?.length || 0} / ${maxLength} caractères`}
        </span>
      )}
    </div>
  </div>
);

const Spinner = () => (
  <svg
    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
    aria-hidden='true'
  >
    <circle
      className='opacity-25'
      cx='12'
      cy='12'
      r='10'
      stroke='currentColor'
      strokeWidth='4'
    />
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
    />
  </svg>
);

export default Form;