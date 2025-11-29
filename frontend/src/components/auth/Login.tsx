import React, { useState, useEffect } from 'react';
import {
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUserX,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login, isLoading, error: authError, clearError } = useAuth();

  // 🔥 NETTOYAGE DES ERREURS AU CHARGEMENT
  useEffect(() => {
    clearError();
  }, [clearError]);

  // 🔥 SYNCHRONISATION AVEC LES ERREURS DU CONTEXTE
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      // 🔥 DÉLÉGATION COMPLETE AU CONTEXTE - PAS DE TOAST
      await login({ email, password });
      // La navigation est gérée dans le contexte
    } catch (err) {
      // Les erreurs sont déjà gérées dans le contexte
      console.log(
        'Erreur capturée dans le composant (déjà gérée par le contexte)'
      );
    }
  };

  const isAccountDisabledError = error.includes('désactivé');

  return (
    <div className='flex items-center justify-center p-4 min-h-screen bg-sky-50'>
      <div className='w-full max-w-sm'>
        <div className='bg-white rounded-lg shadow-md overflow-hidden mt-8'>
          <div className='bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-center'>
            <div className='flex items-center justify-center space-x-2'>
              <div className='bg-white p-1 rounded-full'>
                <div className='w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center'>
                  <FiLock className='text-white text-lg' />
                </div>
              </div>
              <h1 className='text-lg font-bold text-white'>
                <Link to='/'>Connexion</Link>
              </h1>
            </div>
          </div>

          <div className='p-4'>
            <form className='space-y-3' onSubmit={handleSubmit}>
              {/* Champ username caché pour l'accessibilité */}
              <div className='sr-only' aria-hidden='true'>
                <label htmlFor='username'>Nom d&apos;utilisateur</label>
                <input
                  id='username'
                  type='text'
                  name='username'
                  autoComplete='username'
                  value={email}
                  readOnly
                  tabIndex={-1}
                  className='sr-only'
                />
              </div>

              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700'
                >
                  Email
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiMail className='text-gray-400' />
                  </div>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className='pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 transition-colors'
                    placeholder='votre@email.com'
                    required
                    disabled={isLoading}
                    autoComplete='username'
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Mot de passe
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiLock className='text-gray-400' />
                  </div>
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className='pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 pr-9 transition-colors'
                    placeholder='••••••••'
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoComplete='current-password'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <FiEyeOff className='text-gray-400 hover:text-gray-600' />
                    ) : (
                      <FiEye className='text-gray-400 hover:text-gray-600' />
                    )}
                  </button>
                </div>
              </div>

              {/* Affichage erreur du contexte */}
              {error && (
                <div
                  className={`p-3 text-sm rounded-md border ${
                    isAccountDisabledError
                      ? 'text-amber-800 bg-amber-50 border-amber-200'
                      : 'text-red-600 bg-red-50 border-red-200'
                  }`}
                >
                  <div className='flex items-center'>
                    {isAccountDisabledError ? (
                      <FiUserX className='w-4 h-4 mr-2' />
                    ) : (
                      <FiAlertCircle className='w-4 h-4 mr-2' />
                    )}
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div>
                <button
                  type='submit'
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 font-medium transition-all duration-200 ${
                    isLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-md'
                  }`}
                >
                  {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                </button>

                <div className='mt-3 text-center'>
                  <p className='text-xs text-gray-600'>
                    <Link
                      to='/mot-de-passe-oublie'
                      className='font-medium text-sky-600 hover:text-sky-500 transition-colors'
                    >
                      Mot de passe oublié?
                    </Link>
                  </p>
                  <p className='text-xs text-gray-600 mt-1'>
                    Vous n&apos;avez pas de compte?{' '}
                    <Link
                      to='/inscription'
                      className='font-medium text-sky-600 hover:text-sky-500 transition-colors'
                    >
                      S&apos;inscrire
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
