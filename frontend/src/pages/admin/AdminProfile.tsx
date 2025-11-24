import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

// Interface pour les données de mise à jour du mot de passe
interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Règles de validation du mot de passe
  const passwordRules = [
    { id: 'length', label: 'Au moins 8 caractères', met: formData.newPassword.length >= 8 },
    { id: 'lowercase', label: 'Une lettre minuscule', met: /[a-z]/.test(formData.newPassword) },
    { id: 'uppercase', label: 'Une lettre majuscule', met: /[A-Z]/.test(formData.newPassword) },
    { id: 'number', label: 'Un chiffre', met: /\d/.test(formData.newPassword) },
    { id: 'match', label: 'Les mots de passe correspondent', met: formData.newPassword === formData.confirmPassword && formData.newPassword !== '' }
  ];

  const allRulesMet = passwordRules.every(rule => rule.met);

  // Fonction de mise à jour du mot de passe
 // Remplacer la fonction updatePassword par :
const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  setIsLoading(true);
  setMessage(null);

  try {
    const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    // ✅ CORRECTION : Format cohérent avec le backend
    const requestBody = {
      currentPassword,
      newPassword,
      confirmNewPassword: newPassword // ⚠️ Le backend attend "confirmNewPassword" et non "confirmPassword"
    };

    console.log('🔧 Données envoyées:', { 
      currentPassword: currentPassword ? '***' : 'empty',
      newPassword: newPassword ? '***' : 'empty',
      confirmNewPassword: newPassword ? '***' : 'empty'
    });

    const response = await fetch(`${VITE_API_URL}/api/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      credentials: 'include'
    });

    console.log('🔧 Statut réponse:', response.status);

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la mise à jour du mot de passe';
      
      try {
        const errorData = await response.json();
        console.log('🔧 Données erreur:', errorData);
        errorMessage = errorData.message || errorMessage;
        
        // ✅ Gestion spécifique des erreurs 400
        if (response.status === 400) {
          if (errorMessage.includes('correspondent pas')) {
            errorMessage = 'Les mots de passe ne correspondent pas';
          } else if (errorMessage.includes('actuel incorrect')) {
            errorMessage = 'Le mot de passe actuel est incorrect';
          }
        }
      } catch {
        // Si la réponse n'est pas du JSON
        errorMessage = `Erreur ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('🔧 Réponse succès:', data);

    setMessage({ type: 'success', text: data.message || 'Mot de passe mis à jour avec succès' });
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
  } catch (err) {
    console.error('❌ Erreur détaillée:', err);
    const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
    setMessage({ type: 'error', text: errorMessage });
    throw err;
  } finally {
    setIsLoading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRulesMet) {
      setMessage({ type: 'error', text: 'Veuillez respecter toutes les règles de mot de passe' });
      return;
    }

    try {
      await updatePassword(formData.currentPassword, formData.newPassword);
    } catch (error) {
      // L'erreur est déjà gérée dans updatePassword
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (

    <>
    <Helmet>
        <title>Profil Administrateur - Paname Consulting</title>
        <meta name="description" content="Gestion sécurisée du mot de passe administrateur" />
        <meta name="keywords" content="Profil administrateur, mot de passe, sécurité" />
        <meta name="author" content="Paname Consulting" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <meta name="yandexbot" content="noindex, nofollow" />
        <meta name="duckduckbot" content="noindex, nofollow" />
        <meta name="baidu" content="noindex, nofollow" />
        <meta name="naver" content="noindex, nofollow" />
        <meta name="seznam" content="noindex, nofollow" />
      </Helmet>
    <div className="min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full flex items-center justify-center shadow-lg mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Profil Administrateur
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm">
            Gestion sécurisée du mot de passe
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 border border-slate-200">
          {/* Info admin */}
          <div className="bg-sky-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-sky-100">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sky-800 font-semibold text-sm truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sky-600 text-xs mt-1 truncate">{user?.email}</p>
              </div>
              <div className="bg-sky-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2">
                Admin
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Champ username caché pour l'accessibilité */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                value={user?.email || ''}
                readOnly
                tabIndex={-1}
                className="sr-only"
              />
            </div>

            {/* Mot de passe actuel */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl focus:ring-0 focus:border-sky-500 focus:outline-none hover:border-sky-600 transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-base"
                  placeholder="Mot de passe actuel"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-0"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl focus:ring-0 focus:border-sky-500 focus:outline-none hover:border-sky-600 transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-base"
                  placeholder="Nouveau mot de passe"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-0"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl focus:ring-0 focus:border-sky-500 focus:outline-none hover:border-sky-600 transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-base"
                  placeholder="Confirmer le mot de passe"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-0"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {/* Règles de validation */}
            <div className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2 sm:mb-3">Règles de sécurité :</p>
              <div className="space-y-1 sm:space-y-2">
                {passwordRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 sm:gap-3">
                    {rule.met ? (
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${rule.met ? 'text-green-600' : 'text-slate-500'}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="text-xs sm:text-sm font-medium">{message.text}</span>
                </div>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={!allRulesMet || isLoading || !formData.currentPassword}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white py-2 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg focus:outline-none focus:ring-0 focus:border-sky-500 focus:ring-offset-0 text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mise à jour...
                </div>
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </button>
          </form>

          {/* Note de sécurité */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl">
            <div className="flex items-start gap-2 sm:gap-3">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm font-medium">Sécurité renforcée</p>
                <p className="text-amber-700 text-xs mt-1">
                  Votre mot de passe doit respecter les normes de sécurité les plus strictes pour protéger l'accès administrateur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
    );
  }

export default AdminProfile;