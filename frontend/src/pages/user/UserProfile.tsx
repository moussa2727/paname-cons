// UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  FileText,
  Calendar,
  Home,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  Phone,
} from 'lucide-react';
import {
  userProfileApi,
  UserProfileData,
  PasswordData,
  ValidationErrors,
} from '../../api/user/Profile/userProfileApi';
import { Helmet } from 'react-helmet-async';


const UserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<UserProfileData>({
    email: '',
    telephone: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileErrors, setProfileErrors] = useState<ValidationErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<ValidationErrors>({});

  const [profileTouched, setProfileTouched] = useState<{
    [key: string]: boolean;
  }>({});
  const [passwordTouched, setPasswordTouched] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
  }, [user]);

  const validateProfileField = (name: string, value: string) => {
    let error = '';

    if (name === 'email') {
      error = userProfileApi.validateEmail(value);
    } else if (name === 'telephone') {
      error = userProfileApi.validateTelephone(value);
    }

    setProfileErrors(prev => ({
      ...prev,
      [name]: error,
    }));
    return !error;
  };

  const validatePasswordField = (name: string, value: string) => {
    let error = '';

    if (
      name === 'currentPassword' ||
      name === 'newPassword' ||
      name === 'confirmNewPassword'
    ) {
      error = userProfileApi.validatePassword(value, name);

      if (name === 'confirmNewPassword' && !error) {
        if (value !== passwordData.newPassword) {
          error = 'Les mots de passe ne correspondent pas';
        }
      }
    }

    setPasswordErrors(prev => ({
      ...prev,
      [name]: error,
    }));
    return !error;
  };

  const handleProfileChange = (field: keyof UserProfileData, value: string) => {
    const newData = {
      ...profileData,
      [field]: value,
    };

    setProfileData(newData);
    setProfileTouched(prev => ({ ...prev, [field]: true }));

    validateProfileField(field, value);
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    const newData = {
      ...passwordData,
      [field]: value,
    };

    setPasswordData(newData);
    setPasswordTouched(prev => ({ ...prev, [field]: true }));

    validatePasswordField(field, value);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = userProfileApi.validateProfileBeforeSubmit(profileData);

    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsLoading(true);

    try {
      await userProfileApi.updateProfile(profileData);

      toast.success('Profil mis à jour avec succès');
      setProfileTouched({});
    } catch (error: unknown) {
      console.error('Erreur mise à jour profil:', error);

      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';

      if (errorMessage.includes('Cet email est déjà utilisé')) {
        toast.error('Cet email est déjà utilisé');
      } else if (
        errorMessage.includes('Ce numéro de téléphone est déjà utilisé')
      ) {
        toast.error('Ce numéro de téléphone est déjà utilisé');
      } else if (errorMessage.includes("Format d'email invalide")) {
        toast.error("Format d'email invalide");
      } else if (
        errorMessage.includes(
          'Le téléphone doit contenir au moins 5 caractères'
        )
      ) {
        toast.error('Le téléphone doit contenir au moins 5 caractères');
      } else if (errorMessage.includes('Au moins un champ')) {
        toast.error('Au moins un champ (email ou téléphone) doit être fourni');
      } else if (errorMessage.includes('Session expirée')) {
        toast.error('Session expirée - Veuillez vous reconnecter');
      } else {
        toast.error(errorMessage || 'Erreur lors de la mise à jour du profil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation =
      userProfileApi.validatePasswordBeforeSubmit(passwordData);

    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsLoading(true);

    try {
      await userProfileApi.updatePassword(passwordData);

      toast.success('Mot de passe mis à jour avec succès');

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordTouched({});
      setPasswordErrors({});
    } catch (error: unknown) {
      console.error('Erreur mise à jour mot de passe:', error);

      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';

      if (errorMessage.includes('Mot de passe actuel incorrect')) {
        toast.error('Le mot de passe actuel est incorrect');
      } else if (
        errorMessage.includes('Les mots de passe ne correspondent pas')
      ) {
        toast.error('Les mots de passe ne correspondent pas');
      } else if (
        errorMessage.includes('doit contenir au moins 8 caractères')
      ) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères');
      } else if (
        errorMessage.includes('minuscule, une majuscule et un chiffre')
      ) {
        toast.error(
          'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
        );
      } else if (errorMessage.includes('Session expirée')) {
        toast.error('Session expirée - Veuillez vous reconnecter');
      } else {
        toast.error(
          errorMessage || 'Erreur lors de la mise à jour du mot de passe'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetProfileForm = () => {
    if (user) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
    setProfileErrors({});
    setProfileTouched({});
  };

  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setPasswordErrors({});
    setPasswordTouched({});
  };

  const hasProfileChanges = () => {
    if (!user) return false;
    return (
      profileData.email !== user.email ||
      profileData.telephone !== user.telephone
    );
  };

  const isPasswordFormEmpty = () => {
    return (
      !passwordData.currentPassword &&
      !passwordData.newPassword &&
      !passwordData.confirmNewPassword
    );
  };

  const handleTabClick = (tabId: 'profile' | 'password') => {
    setActiveTab(tabId);
  };

  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    if (!password) return null;

    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;

    return (
      <div className='mt-2 space-y-1'>
        <div className='flex items-center gap-2 text-xs'>
          <div
            className={`w-2 h-2 rounded-full ${
              strength >= 1 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className={checks.length ? 'text-green-600' : 'text-gray-500'}>
            8 caractères minimum
          </span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <div
            className={`w-2 h-2 rounded-full ${
              strength >= 2 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span
            className={
              checks.lowercase && checks.uppercase
                ? 'text-green-600'
                : 'text-gray-500'
            }
          >
            Minuscule et majuscule
          </span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <div
            className={`w-2 h-2 rounded-full ${
              strength >= 3 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className={checks.number ? 'text-green-600' : 'text-gray-500'}>
            Au moins un chiffre
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* helmet avec noindex nofollow */}
      <Helmet>
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
        <meta name='yandexbot' content='noindex, nofollow' />
        <title>Mon Profil - Paname Consulting</title>
        <meta name='description' content='Mon Profil - Paname Consulting' />
        <meta name='keywords' content='Mon Profil, Paname Consulting' />
        <meta name='author' content='Paname Consulting' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta name='theme-color' content='#0369a1' />
        <link rel='icon' href='/paname-consulting.ico' />
        <link rel='apple-touch-icon' href='/paname-consulting.png' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='canonical' href='https://panameconsulting.com/user-profile' />
      </Helmet>

    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50'>
        <div className='px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <button
                onClick={() => navigate('/')}
                className='p-2 hover:bg-gray-100 rounded-xl transition-colors'
              >
                <Home className='w-5 h-5 text-gray-600' />
              </button>
              <h1 className='text-lg font-semibold text-gray-800'>
                Mon Profil
              </h1>
            </div>
          </div>

          <div className='mt-3'>
            <nav className='flex space-x-1'>
              {[
                {
                  id: 'profile',
                  label: 'Profil',
                  to: '/user-profile',
                  icon: User,
                  active: true,
                },
                {
                  id: 'rendezvous',
                  label: 'Rendez-vous',
                  to: '/user-rendez-vous',
                  icon: Calendar,
                },
                {
                  id: 'procedures',
                  label: 'Procédures',
                  to: '/user-procedure',
                  icon: FileText,
                },
              ].map(tab => (
                <Link
                  key={tab.id}
                  to={tab.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab.active
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-500'
                  }`}
                >
                  <tab.icon className='w-4 h-4' />
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className='py-8 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          <div className='text-center mb-12'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4'>
              <User className='w-8 h-8 text-blue-600' />
            </div>
            <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>

          <div className='flex space-x-1 mb-8 bg-white p-1 rounded-2xl shadow-sm border border-gray-200'>
            {[
              { id: 'profile' as const, label: 'Informations personnelles', icon: User },
              { id: 'password' as const, label: 'Sécurité', icon: Lock },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all flex-1 ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <tab.icon className='w-4 h-4' />
                {tab.label}
              </button>
            ))}
          </div>

          <div className='bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200'>
            {activeTab === 'profile' && (
              <div className='p-8'>
                <div className='mb-8'>
                  <h2 className='text-2xl font-bold text-gray-800 mb-2'>
                    Informations personnelles
                  </h2>
                  <p className='text-gray-600'>
                    Mettez à jour votre adresse email et votre numéro de
                    téléphone
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className='space-y-6'>
                  <div>
                    <label
                      htmlFor='email'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Adresse email
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Mail className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        type='email'
                        id='email'
                        value={profileData.email}
                        onChange={e =>
                          handleProfileChange('email', e.target.value)
                        }
                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors ${
                          profileErrors.email
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='votre@email.com'
                      />
                    </div>
                    {profileTouched.email && profileErrors.email && (
                      <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                        <XCircle className='w-4 h-4' />
                        {profileErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='telephone'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Numéro de téléphone
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Phone className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        type='tel'
                        id='telephone'
                        value={profileData.telephone}
                        onChange={e =>
                          handleProfileChange('telephone', e.target.value)
                        }
                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors ${
                          profileErrors.telephone
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='+33 1 23 45 67 89'
                      />
                    </div>
                    {profileTouched.telephone && profileErrors.telephone && (
                      <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                        <XCircle className='w-4 h-4' />
                        {profileErrors.telephone}
                      </p>
                    )}
                  </div>

                  <div className='flex gap-3 pt-6 border-t border-gray-200'>
                    <button
                      type='button'
                      onClick={resetProfileForm}
                      disabled={!hasProfileChanges() || isLoading}
                      className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                    >
                      Annuler
                    </button>
                    <button
                      type='submit'
                      disabled={
                        !hasProfileChanges() ||
                        isLoading ||
                        Object.keys(profileErrors).some(
                          key => profileErrors[key as keyof ValidationErrors]
                        )
                      }
                      className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm'
                    >
                      {isLoading
                        ? 'Mise à jour...'
                        : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className='p-8'>
                <div className='mb-8'>
                  <h2 className='text-2xl font-bold text-gray-800 mb-2'>
                    Sécurité du compte
                  </h2>
                  <p className='text-gray-600'>
                    Modifiez votre mot de passe pour renforcer la sécurité de
                    votre compte
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className='space-y-6'>
                  <div>
                    <label
                      htmlFor='currentPassword'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Mot de passe actuel
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Lock className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id='currentPassword'
                        value={passwordData.currentPassword}
                        onChange={e =>
                          handlePasswordChange(
                            'currentPassword',
                            e.target.value
                          )
                        }
                        className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors ${
                          passwordErrors.currentPassword
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='Votre mot de passe actuel'
                      />
                      <button
                        type='button'
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
                      >
                        {showCurrentPassword ? (
                          <EyeOff className='h-5 w-5' />
                        ) : (
                          <Eye className='h-5 w-5' />
                        )}
                      </button>
                    </div>
                    {passwordTouched.currentPassword &&
                      passwordErrors.currentPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.currentPassword}
                        </p>
                      )}
                  </div>

                  <div>
                    <label
                      htmlFor='newPassword'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Nouveau mot de passe
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Lock className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id='newPassword'
                        value={passwordData.newPassword}
                        onChange={e =>
                          handlePasswordChange('newPassword', e.target.value)
                        }
                        className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors ${
                          passwordErrors.newPassword
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='Votre nouveau mot de passe'
                      />
                      <button
                        type='button'
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
                      >
                        {showNewPassword ? (
                          <EyeOff className='h-5 w-5' />
                        ) : (
                          <Eye className='h-5 w-5' />
                        )}
                      </button>
                    </div>
                    {passwordTouched.newPassword &&
                      passwordErrors.newPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.newPassword}
                        </p>
                      )}
                    <PasswordStrengthIndicator
                      password={passwordData.newPassword}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='confirmNewPassword'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Lock className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id='confirmNewPassword'
                        value={passwordData.confirmNewPassword}
                        onChange={e =>
                          handlePasswordChange(
                            'confirmNewPassword',
                            e.target.value
                          )
                        }
                        className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-none focus:outline-none hover:border-blue-600 focus:border-blue-500 transition-colors ${
                          passwordErrors.confirmNewPassword
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='Confirmez votre nouveau mot de passe'
                      />
                      <button
                        type='button'
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
                      >
                        {showConfirmPassword ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </button>
                    </div>
                    {passwordTouched.confirmNewPassword &&
                      passwordErrors.confirmNewPassword && (
                        <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                          <XCircle className='w-4 h-4' />
                          {passwordErrors.confirmNewPassword}
                        </p>
                      )}
                    {passwordTouched.confirmNewPassword &&
                      passwordData.newPassword &&
                      passwordData.confirmNewPassword &&
                      passwordData.newPassword ===
                        passwordData.confirmNewPassword && (
                        <p className='mt-2 text-sm text-green-600 flex items-center gap-1'>
                          <CheckCircle className='w-4 h-4' />
                          Les mots de passe correspondent
                        </p>
                      )}
                  </div>

                  <div className='flex gap-3 pt-6 border-t border-gray-200'>
                    <button
                      type='button'
                      onClick={resetPasswordForm}
                      disabled={isPasswordFormEmpty() || isLoading}
                      className='px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
                    >
                      Annuler
                    </button>
                    <button
                      type='submit'
                      disabled={
                        isPasswordFormEmpty() ||
                        isLoading ||
                        Object.keys(passwordErrors).some(
                          key => passwordErrors[key as keyof ValidationErrors]
                        )
                      }
                      className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm'
                    >
                      {isLoading
                        ? 'Mise à jour...'
                        : 'Modifier le mot de passe'}
                    </button>
                  </div>
                </form>

                <div className='mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl'>
                  <h3 className='text-sm font-semibold text-blue-800 mb-2'>
                    Conseils de sécurité
                  </h3>
                  <ul className='text-sm text-blue-700 space-y-1'>
                    <li>• Utilisez un mot de passe unique et complexe</li>
                    <li>
                      • Évitez les mots de passe que vous utilisez sur d&apos;autres sites
                    </li>
                    <li>• Changez régulièrement votre mot de passe</li>
                    <li>• Ne partagez jamais votre mot de passe</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default UserProfile;