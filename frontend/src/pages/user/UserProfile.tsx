// UserProfile.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { UserHeader, usePageConfig } from '../../components/user/UserHeader';
import { useAuth } from '../../context/AuthContext';
import { userProfileService, UserUpdateData, AuthContextFunctions } from '../../api/user/Profile/userProfileApi';
import { Loader2, Mail, Phone, Calendar, Shield, User, UserCheck } from 'lucide-react';

const UserProfile = () => {
  const { user, updateProfile, fetchWithAuth, refreshToken, access_token } = useAuth();
  const pageConfig = usePageConfig();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // États pour les informations du profil
  const [profileData, setProfileData] = useState({
    email: '',
    telephone: '',
  });
  
  // États pour les informations de sécurité
  const [securityInfo, setSecurityInfo] = useState({
    lastLogin: '',
    accountCreated: '',
  });
  
  // États pour la validation
  const [emailError, setEmailError] = useState('');
  const [telephoneError, setTelephoneError] = useState('');

  // Référence pour éviter les chargements multiples
  const isInitialLoad = useRef(false);

  // Créer l'objet authFunctions conforme à l'interface AuthContextFunctions
  const getAuthFunctions = useCallback((): AuthContextFunctions => {
    return {
      fetchWithAuth,
      refreshToken,
      access_token,
    };
  }, [fetchWithAuth, refreshToken, access_token]);

  // Validation de l'email (seulement si modifié)
  const validateEmail = (email: string): boolean => {
    // Si email vide mais différent de l'actuel, c'est une erreur
    if (!email || email.trim() === '') {
      setEmailError('L\'email ne peut pas être vide');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailError(isValid ? '' : 'Email invalide');
    return isValid;
  };

  // Validation du téléphone (accepter vide)
  const validateTelephone = (telephone: string): boolean => {
    // Accepter vide - l'utilisateur peut vouloir supprimer son téléphone
    if (!telephone || telephone.trim() === '') {
      setTelephoneError('');
      return true;
    }
    
    // Regex flexible pour numéros internationaux
    const phoneRegex = /^[+]?[0-9\s\-\(\)\.]{8,20}$/;
    const cleanedPhone = telephone.replace(/[\s\-\(\)\.]/g, '');
    const hasMinDigits = cleanedPhone.length >= 8;
    
    const isValid = phoneRegex.test(telephone) && hasMinDigits;
    setTelephoneError(isValid ? '' : 'Format invalide (min. 8 chiffres)');
    return isValid;
  };

  // Charger les données du profil
  const loadUserProfile = useCallback(async () => {
    if (isLoading) return; // Éviter les appels en double
    
    setIsLoading(true);
    try {
      const authFunctions = getAuthFunctions();
      const userData = await userProfileService.getCurrentUser(authFunctions);
      
      if (userData) {
        setProfileData({
          email: userData.email || '',
          telephone: userData.telephone || '',
        });
        
        // Informations de sécurité
        if (userData.createdAt) {
          setSecurityInfo({
            accountCreated: new Date(userData.createdAt).toLocaleDateString('fr-FR'),
            lastLogin: new Date().toLocaleDateString('fr-FR'),
          });
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error);
      
      // Si le service échoue, utiliser les données du contexte
      if (user) {
        setProfileData({
          email: user.email || '',
          telephone: user.telephone || '',
        });
      } else {
        toast.error('Impossible de charger les informations du profil');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAuthFunctions, user, isLoading]);

  // Rafraîchir les données
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await loadUserProfile();
      toast.success('Profil actualisé');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile, isRefreshing]);

  // Gérer la soumission du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔄 ===== DÉBUT SOUMISSION PROFIL =====");
    console.log("📧 Email actuel (user):", user?.email);
    console.log("📧 Email nouveau (form):", profileData.email);
    console.log("📱 Téléphone actuel (user):", user?.telephone);
    console.log("📱 Téléphone nouveau (form):", profileData.telephone);
    console.log("🔑 Token actuel:", access_token);
    console.log("👤 User ID:", user?.id);
    
    // Valider UNIQUEMENT les champs qui sont modifiés
    const isEmailValid = profileData.email !== user?.email 
      ? validateEmail(profileData.email) 
      : true;
    
    const isPhoneValid = profileData.telephone !== user?.telephone 
      ? validateTelephone(profileData.telephone) 
      : true;
    
    console.log("✅ Validation email:", isEmailValid);
    console.log("✅ Validation téléphone:", isPhoneValid);
    console.log("❌ Message erreur email:", emailError);
    console.log("❌ Message erreur téléphone:", telephoneError);
    
    if (!isEmailValid || !isPhoneValid) {
      console.log("❌ Validation échouée - affichage toast");
      toast.error('Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    // Vérifier si des modifications ont été apportées
    const hasEmailChanged = profileData.email !== user?.email;
    const hasTelephoneChanged = profileData.telephone !== user?.telephone;
    
    console.log("📊 Changements détectés:");
    console.log("  - Email changé:", hasEmailChanged);
    console.log("  - Téléphone changé:", hasTelephoneChanged);
    
    if (!hasEmailChanged && !hasTelephoneChanged) {
      console.log("⚠️ Aucun changement détecté");
      toast.info('Aucune modification à enregistrer');
      return;
    }

    setIsLoading(true);
    console.log("⏳ Début chargement...");
    
    try {
      const authFunctions = getAuthFunctions();
      const updateData: UserUpdateData = {};
      
      if (hasEmailChanged && profileData.email.trim() !== '') {
        updateData.email = profileData.email.trim();
        console.log("📧 Email à mettre à jour:", updateData.email);
      }
      
      if (hasTelephoneChanged) {
        // Accepter vide pour supprimer le téléphone
        updateData.telephone = profileData.telephone.trim();
        console.log("📱 Téléphone à mettre à jour:", updateData.telephone);
      }

      // Vérifier qu'on a au moins un champ à mettre à jour
      if (Object.keys(updateData).length === 0) {
        console.log("⚠️ Aucune donnée à mettre à jour après nettoyage");
        toast.info('Aucune modification à enregistrer');
        return;
      }

      console.log("📤 Données à envoyer à l'API:", updateData);
      
      const updatedUser = await userProfileService.updateProfile(authFunctions, updateData);
      
      console.log("✅ Réponse API reçue:", updatedUser);
      
      // Mettre à jour les données locales avec la réponse du service
      setProfileData({
        email: updatedUser.email || '',
        telephone: updatedUser.telephone || '',
      });
      
      console.log("📊 Données locales mises à jour:");
      console.log("  - Email:", updatedUser.email);
      console.log("  - Téléphone:", updatedUser.telephone);
      
      toast.success('Profil mis à jour avec succès');
      console.log("🎉 Mise à jour réussie!");
      
    } catch (error: any) {
      console.error("❌ ERREUR lors de la mise à jour:", error);
      console.error("❌ Message d'erreur:", error.message);
      console.error("❌ Stack:", error.stack);
      
      // Ne pas afficher de toast pour les erreurs de session
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error(error.message || 'Erreur lors de la mise à jour du profil');
      }
    } finally {
      setIsLoading(false);
      console.log("🏁 Fin chargement (loading: false)");
      console.log("===== FIN SOUMISSION PROFIL =====");
    }
  };

  // Effet initial - charger les données une seule fois
  useEffect(() => {
    if (!isInitialLoad.current && user) {
      isInitialLoad.current = true;
      
      // Charger les données depuis le service
      loadUserProfile();
      
      // Si le service échoue, utiliser les données du contexte
      const timer = setTimeout(() => {
        if (!profileData.email && user) {
          setProfileData({
            email: user.email || '',
            telephone: user.telephone || '',
          });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, loadUserProfile, profileData.email]);

  // Synchroniser avec les données du contexte (fallback)
  useEffect(() => {
    if (user && !profileData.email) {
      setProfileData({
        email: user.email || '',
        telephone: user.telephone || '',
      });
    }
  }, [user, profileData.email]);

  // Effet de débogage
  useEffect(() => {
    console.log("👤 User actuel:", user);
    console.log("📊 Données du formulaire:", profileData);
    console.log("🔄 isLoading:", isLoading);
    console.log("🔑 Token actuel:", access_token);
    console.log("👤 User ID:", user?.id);
  }, [user, profileData, isLoading, access_token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16 pb-8">
      <UserHeader
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        pageTitle={pageConfig.pageTitle}
        description={pageConfig.description}
        isLoading={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="px-4 max-w-4xl mx-auto mt-16">
        {/* Section principale du profil */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-600" />
              Informations personnelles
            </h2>

            {isLoading && !profileData.email ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Nom complet (lecture seule) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nom complet
                  </label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <p className="text-xs text-gray-500">
                    Le nom complet ne peut pas être modifié ici
                  </p>
                </div>

                {/* Email - champ obligatoire */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4" />
                    Adresse email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => {
                        setProfileData({ ...profileData, email: e.target.value });
                        // Valider immédiatement seulement si différent de l'actuel
                        if (e.target.value !== user?.email) {
                          validateEmail(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (profileData.email !== user?.email) {
                          validateEmail(profileData.email);
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        emailError ? 'border-red-300' : 'border-gray-300'
                      } focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all`}
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Téléphone - champ optionnel */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4" />
                    Téléphone (optionnel)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={profileData.telephone}
                      onChange={(e) => {
                        setProfileData({ ...profileData, telephone: e.target.value });
                        // Valider seulement si différent de l'actuel
                        if (e.target.value !== user?.telephone) {
                          validateTelephone(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (profileData.telephone !== user?.telephone) {
                          validateTelephone(profileData.telephone);
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        telephoneError ? 'border-red-300' : 'border-gray-300'
                      } focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all`}
                      placeholder="06 12 34 56 78 ou +33612345678"
                    />
                  </div>
                  {telephoneError && (
                    <p className="text-sm text-red-600">
                      {telephoneError}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Laisser vide pour supprimer votre numéro de téléphone. Format: 0612345678 ou +33612345678
                  </p>
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </span>
                  ) : (
                    'Mettre à jour mon profil'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Section informations de sécurité */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-600" />
              Sécurité du compte
            </h2>

            <div className="space-y-4">
              {/* Statut du compte */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-100">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    user?.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">Statut du compte</p>
                    <p className="text-sm text-gray-600">
                      {user?.isActive ? 'Actif' : 'Inactif'}
                    </p>
                  </div>
                </div>
                <UserCheck className="w-5 h-5 text-sky-600" />
              </div>

              {/* Dernière connexion */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Dernière connexion</p>
                    <p className="text-sm text-gray-600">
                      {securityInfo.lastLogin || 'Aujourd\'hui'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conseils de sécurité */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Conseils de sécurité</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Utilisez des mots de passe uniques et complexes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Ne partagez jamais vos identifiants de connexion
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Déconnectez-vous des appareils publics après utilisation
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;