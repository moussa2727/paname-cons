import { useAuth } from '../../context/AuthContext';
import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiUser, FiAlertCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation côté client uniquement (sans toast)
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      // ✅ DÉLÉGATION COMPLETE : AuthContext gère tous les toasts
      await register(formData);
      // Plus de toast ici - tout est géré dans l'AuthContext
    } catch (err: any) {
      let message = 'Une erreur est survenue lors de la création du compte';
      
      if (err.message) {
        message = err.message;
      }
      
      setError(message);
      // Plus de toast ici - l'erreur est déjà gérée dans l'AuthContext
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-sky-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="bg-white p-1 rounded-full">
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center">
                  <FiUser className="text-white text-lg" />
                </div>
              </div>
              <h1 className="text-lg font-bold text-white"> 
                <Link to='/'>
                  Créer Un Compte
                </Link>
              </h1>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500"
                      placeholder="Votre prénom"
                      required
                      disabled={isLoading}
                      autoComplete="given-name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400" />
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500"
                      placeholder="Votre nom"
                      required
                      disabled={isLoading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500"
                    placeholder="votre@email.com"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500"
                    placeholder="Votre numéro avec ou sans format"
                    required
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 pr-9"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <FiEyeOff className="text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FiEye className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 pr-9"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FiEye className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2 text-red-600 text-sm bg-red-50 rounded-md flex items-center">
                  <FiAlertCircle className="mr-2" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 font-medium ${
                  isLoading ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Création en cours...' : 'Créer mon compte'}
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-600">
                  Vous avez déjà un compte?{' '}
                  <Link
                    to="/connexion"
                    className="font-medium text-sky-600 hover:text-sky-500"
                  >
                    Se connecter
                  </Link>
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