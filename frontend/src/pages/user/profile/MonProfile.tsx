import { useState, useEffect } from "react";
import { Edit2, Save, X, Lock } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { pageConfigs } from "../../../components/shared/user/UserHeader.config";
import { toast } from "react-hot-toast";

// Fonction de validation du téléphone (mondial - tous formats)
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Vide est autorisé
  // Accepte TOUS les formats : +33 6 12 34 56 78, 06 12 34 56 78, +22374972438, (0)1 23 45 67 89, etc.
  const globalPhoneRegex = /^(\+?[0-9][\d\s\-.()]{7,20})$/;
  const isValid = globalPhoneRegex.test(phone);
  return isValid;
};

// Fonction de formatage automatique du téléphone pendant la saisie
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  
  // Supprimer tous les caractères non numériques sauf le +
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Si le numéro commence par 0 et a 9 chiffres, formater en français
  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    // Formater progressivement : 06 → 06 1 → 06 12 → 06 12 3 → etc.
    if (cleaned.length === 2) return cleaned;
    if (cleaned.length === 3) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length === 4) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)}`;
    if (cleaned.length === 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length === 6) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)}`;
    if (cleaned.length === 7) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6)}`;
    if (cleaned.length === 8) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)}`;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  // Si le numéro commence par +33 et a 11 chiffres, formater en international
  if (cleaned.startsWith("+33") && cleaned.length >= 4) {
    const frenchNumber = cleaned.substring(3);
    if (frenchNumber.length === 1) return cleaned;
    if (frenchNumber.length === 2) return `${cleaned.slice(0, 3)} ${frenchNumber}`;
    if (frenchNumber.length === 3) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)}`;
    if (frenchNumber.length === 4) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2)}`;
    if (frenchNumber.length === 5) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2, 4)}`;
    if (frenchNumber.length === 6) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2, 4)} ${frenchNumber.slice(4)}`;
    if (frenchNumber.length === 7) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2, 4)} ${frenchNumber.slice(4, 6)}`;
    if (frenchNumber.length === 8) return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2, 4)} ${frenchNumber.slice(4, 6)} ${frenchNumber.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${frenchNumber.slice(0, 2)} ${frenchNumber.slice(2, 4)} ${frenchNumber.slice(4, 6)} ${frenchNumber.slice(6, 8)} ${frenchNumber.slice(8)}`;
  }
  
  // Sinon, retourner tel quel (pour les saisies en cours)
  return phone;
};

// Fonction de normalisation du téléphone (identique au backend)
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return "";
  
  // Normalisation IDENTIQUE au backend : supprimer espaces, points, tirets
  let cleaned = phone.replace(/[\s.-]/g, '');
  
  // Si le numéro commence par 0 (format français), ajouter +33
  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    cleaned = "+33" + cleaned.substring(1);
  }
  // Si le numéro n'a pas de + et commence par un autre chiffre, ajouter +
  else if (!cleaned.startsWith("+") && cleaned.length > 0) {
    cleaned = "+" + cleaned;
  }
  
  return cleaned;
};

const MonProfile = () => {
  const { user, updateUser, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editedProfile, setEditedProfile] = useState(() => {
    // Initialiser avec les données de l'utilisateur si disponible
    if (user) {
      return {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        telephone: user.telephone || "",
      };
    }
    return {
      firstName: "",
      lastName: "",
      email: "",
      telephone: "",
    };
  });

  // Mettre à jour le profil quand l'utilisateur change
  useEffect(() => {
    if (user) {
      const newEditedProfile = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        telephone: user.telephone || "",
      };

      setEditedProfile(newEditedProfile);
    }
  }, [user]); // ← Déclenché quand user change (après updateUser)

  const handleSave = async () => {
    try {
      // Valider le téléphone avant l'envoi (validation stricte uniquement à la sauvegarde)
      if (editedProfile.telephone) {
        if (!validatePhoneNumber(editedProfile.telephone)) {
          toast.error("Format de téléphone invalide. Accepté: +33 6 12 34 56 78, 06 12 34 56 78, +223 7 49 72 438, (0)1 23 45 67 89, etc.");
          return;
        }
      }

      // Normaliser le téléphone pour le backend
      const normalizedProfile = {
        ...editedProfile,
        telephone: normalizePhoneNumber(editedProfile.telephone),
      };

      await updateUser(normalizedProfile);
      setIsEditing(false);
      // Forcer la synchronisation avec les nouvelles données de l'utilisateur
      console.log("DEBUG - Mise à jour réussie, synchronisation...");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Réinitialiser avec les données originales de l'utilisateur
    if (user) {
      setEditedProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        telephone: user.telephone || "", // ← Utilise 'telephone' comme le backend
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );

      // Réinitialiser le formulaire et fermer le modal
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageConfigs["/mon-profil"].pageTitle}</title>
        <meta
          name="description"
          content={pageConfigs["/mon-profil"].description}
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen mt-30">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
                <p className="text-gray-600 mt-1">
                  Gérez vos informations personnelles
                </p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </button>
                    <button
                      className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center transition-colors"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Header Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-sky-100 flex items-center justify-center">
                  <span className="text-sky-600 text-2xl font-semibold">
                    {user
                      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
                      : "JD"}
                  </span>
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editedProfile.firstName} {editedProfile.lastName}
                </h2>
                <p className="text-gray-600">{editedProfile.email}</p>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="bg-white rounded-xl shadow-sm">
            {/* Tab Content */}
            <div className="p-6">
              {/* Personal Information Tab */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Informations personnelles
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Vos informations de base et identité
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Prénom
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={editedProfile.firstName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditedProfile({
                          ...editedProfile,
                          firstName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50" : "bg-white"}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Nom
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={editedProfile.lastName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditedProfile({
                          ...editedProfile,
                          lastName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50" : "bg-white"}`}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={editedProfile.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditedProfile({
                            ...editedProfile,
                            email: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Téléphone
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={editedProfile.telephone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const formattedPhone = formatPhoneNumber(e.target.value);
                          setEditedProfile({
                            ...editedProfile,
                            telephone: formattedPhone,
                          });
                        }}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="Ex: 06 12 34 56 78 ou +33 6 12 34 56 78"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confidentialité
                </h3>
              </div>

              <div className="space-y-6">
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Actions de confidentialité
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Changer le mot de passe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de changement de mot de passe */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Changer le mot de passe
                  </h3>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mot de passe actuel
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400"
                      placeholder="Entrez votre mot de passe actuel"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nouveau mot de passe
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400"
                      placeholder="Entrez votre nouveau mot de passe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400"
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? "Changement..." : "Changer"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MonProfile;
