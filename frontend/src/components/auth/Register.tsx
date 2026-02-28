import React, { useState, useEffect } from 'react';
import { FiMail, FiPhone, FiUser, FiAlertCircle } from 'react-icons/fi';
import { Lock as FiLock, Eye as FiEye, EyeOff as FiEyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    isLoading,
    error: authError,
    isAuthenticated,
    user,
    clearAuthToasts,
  } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Redirection si déjà connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'admin' ? '/gestionnaire/statistiques' : '/';
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate]);

  // Synchronisation des erreurs d'authentification
  useEffect(() => {
    if (authError) {
      setFormError(authError);
      
      // Déduire les erreurs de champ spécifiques
      if (authError.toLowerCase().includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: authError }));
      } else if (authError.toLowerCase().includes('téléphone')) {
        setFieldErrors(prev => ({ ...prev, telephone: authError }));
      }
    }
  }, [authError]);

  // Nettoyer les toasts au démontage
  useEffect(() => {
    return () => {
      clearAuthToasts();
    };
  }, [clearAuthToasts]);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string): boolean => {
    let error = '';
    
    switch (field) {
      case 'firstName': {
        if (!formData.firstName.trim()) {
          error = 'Le prénom est requis';
        } else if (formData.firstName.length < 2) {
          error = 'Le prénom doit contenir au moins 2 caractères';
        }
        break;
      }
        
      case 'lastName': {
        if (!formData.lastName.trim()) {
          error = 'Le nom est requis';
        } else if (formData.lastName.length < 2) {
          error = 'Le nom doit contenir au moins 2 caractères';
        }
        break;
      }
        
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
          error = "L'email est requis";
        } else if (!emailRegex.test(formData.email)) {
          error = "Format d'email invalide";
        }
        break;
      }
        
      case 'telephone': {
        const phoneDigits = formData.telephone.replace(/\D/g, '');
        if (!formData.telephone) {
          error = 'Le téléphone est requis';
        } else if (phoneDigits.length < 8) {
          error = 'Format invalide (minimum 8 chiffres)';
        } else if (phoneDigits.length > 15) {
          error = 'Le téléphone est trop long';
        }
        break;
      }
        
      case 'password': {
        if (!formData.password) {
          error = 'Le mot de passe est requis';
        } else if (formData.password.length < 8) {
          error = 'Le mot de passe doit contenir au moins 8 caractères';
        } else {
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
          if (!passwordRegex.test(formData.password)) {
            error = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
          }
        }
        break;
      }
        
      case 'confirmPassword':
        if (!formData.confirmPassword) {
          error = 'Veuillez confirmer le mot de passe';
        } else if (formData.password !== formData.confirmPassword) {
          error = 'Les mots de passe ne correspondent pas';
        }
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'telephone') {
      // Nettoyage du téléphone : garder uniquement chiffres et + au début
      let cleanedValue = value.replace(/\s/g, '');
      
      // Si le premier caractère est +, le garder, sinon enlever tous les +
      if (cleanedValue.startsWith('+')) {
        cleanedValue = '+' + cleanedValue.substring(1).replace(/[^\d]/g, '');
      } else {
        cleanedValue = cleanedValue.replace(/[^\d]/g, '');
      }
      
      setFormData(prev => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Réinitialiser l'erreur du champ et l'erreur générale
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  };

  const validateForm = (): boolean => {
    const fields = ['firstName', 'lastName', 'email', 'telephone', 'password', 'confirmPassword'];
    let isValid = true;
    
    // Marquer tous les champs comme touchés
    const newTouchedFields: Record<string, boolean> = {};
    fields.forEach(field => { newTouchedFields[field] = true; });
    setTouchedFields(newTouchedFields);
    
    // Valider chaque champ
    fields.forEach(field => {
      const fieldValid = validateField(field);
      if (!fieldValid) isValid = false;
    });
    
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Nettoyer les données avant envoi
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim(),
        password: formData.password,
      };

      await register(submitData);
      // La redirection est gérée par le contexte après succès
      
    } catch (err: any) {
      console.error('Erreur inscription:', err);
      // L'erreur est déjà gérée par le contexte
    }
  };

  const getFieldClassName = (fieldName: string): string => {
    const baseClass = 'pl-9 w-full px-3 py-2 rounded bg-gray-50 border focus:border-sky-500 focus:outline-none focus:ring-none transition-colors';
    const hasError = touchedFields[fieldName] && fieldErrors[fieldName];
    const normalClass = 'border-gray-300 hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-none';
    const errorClass = 'border-red-300 hover:border-red-400 focus:border-red-500 bg-red-50';
    
    return `${baseClass} ${hasError ? errorClass : normalClass}`;
  };

  return (
    <div className='flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-xl shadow-xl overflow-hidden'>
          <div className='bg-gradient-to-r from-sky-500 to-sky-600 p-6 text-center'>
            <div className='flex items-center justify-center space-x-3'>
              <div className='bg-white p-2 rounded-full'>
                <div className='w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 flex items-center justify-center'>
                  <FiUser className='text-white text-xl' />
                </div>
              </div>
              <h1 className='text-2xl font-bold text-white'>
                Créer un compte
              </h1>
            </div>
          </div>

          <div className='p-6'>
            <form className='space-y-4' onSubmit={handleSubmit} noValidate>
              {/* Nom et prénom */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Prénom *
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <FiUser className='text-gray-400' />
                    </div>
                    <input
                      name='firstName'
                      type='text'
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('firstName')}
                      className={getFieldClassName('firstName')}
                      placeholder='Jean'
                      required
                      disabled={isLoading}
                      autoComplete='given-name'
                      minLength={2}
                      maxLength={50}
                    />
                  </div>
                  {touchedFields.firstName && fieldErrors.firstName && (
                    <p className='text-xs text-red-500 mt-1'>{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nom *
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <FiUser className='text-gray-400' />
                    </div>
                    <input
                      name='lastName'
                      type='text'
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('lastName')}
                      className={getFieldClassName('lastName')}
                      placeholder='Dupont'
                      required
                      disabled={isLoading}
                      autoComplete='family-name'
                      minLength={2}
                      maxLength={50}
                    />
                  </div>
                  {touchedFields.lastName && fieldErrors.lastName && (
                    <p className='text-xs text-red-500 mt-1'>{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Email *
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiMail className='text-gray-400' />
                  </div>
                  <input
                    name='email'
                    type='email'
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    className={getFieldClassName('email')}
                    placeholder='jean.dupont@email.com'
                    required
                    disabled={isLoading}
                    autoComplete='email'
                    maxLength={100}
                  />
                </div>
                {touchedFields.email && fieldErrors.email && (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Téléphone *
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiPhone className='text-gray-400' />
                  </div>
                  <input
                    name='telephone'
                    type='tel'
                    value={formData.telephone}
                    onChange={handleChange}
                    onBlur={() => handleBlur('telephone')}
                    className={getFieldClassName('telephone')}
                    placeholder='+33123456789 ou 0123456789'
                    required
                    disabled={isLoading}
                    autoComplete='tel'
                    maxLength={20}
                  />
                </div>
                {touchedFields.telephone && fieldErrors.telephone ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.telephone}</p>
                ) : (
                  <p className='text-xs text-gray-500 mt-1'>
                    Format: +33123456789 ou 0123456789 (minimum 8 chiffres)
                  </p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Mot de passe *
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiLock className='text-gray-400' />
                  </div>
                  <input
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    className={getFieldClassName('password')}
                    placeholder='••••••••'
                    required
                    minLength={8}
                    maxLength={72}
                    disabled={isLoading}
                    autoComplete='new-password'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <FiEyeOff className='text-gray-400 hover:text-gray-600 w-5 h-5' />
                    ) : (
                      <FiEye className='text-gray-400 hover:text-gray-600 w-5 h-5' />
                    )}
                  </button>
                </div>
                {touchedFields.password && fieldErrors.password ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.password}</p>
                ) : (
                  <p className='text-xs text-gray-500 mt-1'>
                    8 caractères min, avec majuscule, minuscule et chiffre
                  </p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirmer le mot de passe *
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiLock className='text-gray-400' />
                  </div>
                  <input
                    name='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={getFieldClassName('confirmPassword')}
                    placeholder='••••••••'
                    required
                    minLength={8}
                    maxLength={72}
                    disabled={isLoading}
                    autoComplete='new-password'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className='text-gray-400 hover:text-gray-600 w-5 h-5' />
                    ) : (
                      <FiEye className='text-gray-400 hover:text-gray-600 w-5 h-5' />
                    )}
                  </button>
                </div>
                {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Erreur générale */}
              {formError && !Object.values(fieldErrors).some(error => error) && (
                <div
                  className='p-3 text-red-600 text-sm bg-red-50 rounded-md border border-red-200'
                  role='alert'
                >
                  <div className='flex items-center'>
                    <FiAlertCircle className='mr-2 flex-shrink-0' />
                    <span>{formError}</span>
                  </div>
                </div>
              )}

              {/* Bouton soumission */}
              <button
                type='submit'
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-md text-white font-medium transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <span className='flex items-center justify-center'>
                    <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Création en cours...
                  </span>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <div className='text-center space-y-2'>
                <p className='text-sm text-gray-600'>
                  Vous avez déjà un compte?{' '}
                  <Link
                    to='/connexion'
                    className='font-medium text-sky-600 hover:text-sky-500 transition-colors hover:underline'
                  >
                    Se connecter
                  </Link>
                </p>
                <p className='text-xs text-gray-400'>
                  * Champs obligatoires
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;