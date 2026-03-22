import { useState, useEffect, useMemo } from "react";
import { Edit2, Save, X, Lock } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { pageConfigs } from "../../../components/shared/user/UserHeader.config";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Helpers téléphone
// ─────────────────────────────────────────────────────────────

/**
 * Formatage progressif pendant la saisie.
 * Ne touche qu'à l'affichage — la valeur normalisée est calculée
 * dans normalizePhoneNumber() au moment du save.
 */
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("0") && cleaned.length >= 2) {
    if (cleaned.length === 2) return cleaned;
    if (cleaned.length === 3)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length === 4)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)}`;
    if (cleaned.length === 5)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length === 6)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)}`;
    if (cleaned.length === 7)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6)}`;
    if (cleaned.length === 8)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)}`;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }

  if (cleaned.startsWith("+33") && cleaned.length >= 4) {
    const n = cleaned.substring(3);
    if (n.length <= 1) return cleaned;
    if (n.length === 2) return `${cleaned.slice(0, 3)} ${n}`;
    if (n.length === 3) return `${cleaned.slice(0, 3)} ${n.slice(0, 2)}`;
    if (n.length === 4)
      return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2)}`;
    if (n.length === 5)
      return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2, 4)}`;
    if (n.length === 6)
      return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4)}`;
    if (n.length === 7)
      return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)}`;
    if (n.length === 8)
      return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
  }

  return phone;
};

/**
 * Normalisation avant envoi au backend.
 * Supprime tous les séparateurs visuels (espaces, points, tirets, parenthèses)
 * et convertit le format local 06... en +336...
 */
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return "";
  // Supprimer TOUS les séparateurs : espaces, points, tirets, parenthèses
  let cleaned = phone.replace(/[\s.\-()]/g, "");

  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    cleaned = "+33" + cleaned.substring(1);
  } else if (!cleaned.startsWith("+") && cleaned.length > 0) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
};

/**
 * Validation côté client avant envoi.
 * La regex backend est `/^\+?[\d\s.\-()]{7,20}$/` — on valide
 * sur la valeur normalisée (sans séparateurs) pour être cohérent.
 */
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true;
  const normalized = normalizePhoneNumber(phone);
  // Format E.164 : + suivi de 7 à 15 chiffres
  return /^\+\d{7,15}$/.test(normalized);
};

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
}

const MonProfile = () => {
  const { user, updateUser, changePassword } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /**
   * Valeurs de référence issues du backend.
   * Recalculées uniquement quand user change ET qu'on n'est pas en édition.
   * Cela évite d'écraser les saisies en cours si un refresh arrive pendant l'édition.
   */
  const serverValues = useMemo(
    (): ProfileForm => ({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      telephone: user?.telephone ?? "",
    }),
    [user?.firstName, user?.lastName, user?.email, user?.telephone],
  );

  const [editedProfile, setEditedProfile] = useState<ProfileForm>(serverValues);

  // Synchroniser avec le serveur uniquement quand on n'est PAS en train d'éditer.
  // Si l'utilisateur est en mode édition, on ne touche pas à son formulaire.
  useEffect(() => {
    if (!isEditing) {
      setEditedProfile(serverValues);
    }
  }, [serverValues, isEditing]);

  const handleEdit = () => {
    setEditedProfile(serverValues);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile(serverValues);
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validation téléphone sur la valeur normalisée
    if (
      editedProfile.telephone &&
      !validatePhoneNumber(editedProfile.telephone)
    ) {
      toast.error(
        "Format de téléphone invalide. Exemples acceptés : +33 6 12 34 56 78, 06 12 34 56 78, +1 800 555 0199",
      );
      return;
    }

    // Diff : n'envoyer que les champs réellement modifiés
    const patch: {
      firstName?: string;
      lastName?: string;
      email?: string;
      telephone?: string;
    } = {};

    if (editedProfile.firstName.trim() !== serverValues.firstName) {
      patch.firstName = editedProfile.firstName.trim();
    }
    if (editedProfile.lastName.trim() !== serverValues.lastName) {
      patch.lastName = editedProfile.lastName.trim();
    }
    if (editedProfile.email.trim() !== serverValues.email) {
      patch.email = editedProfile.email.trim();
    }
    if (editedProfile.telephone !== serverValues.telephone) {
      patch.telephone = normalizePhoneNumber(editedProfile.telephone);
    }

    if (Object.keys(patch).length === 0) {
      toast("Aucune modification détectée", { icon: "ℹ️" });
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(patch);
      toast.success("Profil mis à jour avec succès");
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    // ✅ Aligné sur MinLength(8) du backend (CreateUserDto / UpdateUserDto)
    if (passwordData.newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    // Validation regex identique au backend
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      toast.error(
        "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)",
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
    } catch {
      // Le toast d'erreur est géré dans AuthContext.changePassword
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";

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
                    onClick={handleEdit}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Enregistrement…" : "Sauvegarder"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50"
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
              <div className="w-24 h-24 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <span className="text-sky-600 text-2xl font-semibold">
                  {initials}
                </span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editedProfile.firstName} {editedProfile.lastName}
                </h2>
                <p className="text-gray-600">{editedProfile.email}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6">
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
                  {/* Prénom */}
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
                      onChange={(e) =>
                        setEditedProfile((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50" : "bg-white"}`}
                    />
                  </div>

                  {/* Nom */}
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
                      onChange={(e) =>
                        setEditedProfile((p) => ({
                          ...p,
                          lastName: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50" : "bg-white"}`}
                    />
                  </div>

                  {/* Email */}
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
                      onChange={(e) =>
                        setEditedProfile((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50 text-gray-500" : "bg-white"}`}
                    />
                  </div>

                  {/* Téléphone */}
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
                      onChange={(e) =>
                        setEditedProfile((p) => ({
                          ...p,
                          telephone: formatPhoneNumber(e.target.value),
                        }))
                      }
                      disabled={!isEditing}
                      placeholder="Ex: 06 12 34 56 78 ou +33 6 12 34 56 78"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors ${!isEditing ? "bg-gray-50 text-gray-500" : "bg-white"}`}
                    />
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

          {/* Modal changement de mot de passe */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Changer le mot de passe
                  </h3>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
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
                        setPasswordData((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400"
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
                        setPasswordData((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400"
                      placeholder="8 car. min, maj, chiffre, caractère spécial"
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
                        setPasswordData((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sky-500 hover:border-sky-400"
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                  </div>

                  <p className="text-xs text-gray-400">
                    Le mot de passe doit contenir au moins 8 caractères, une
                    majuscule, une minuscule, un chiffre et un caractère spécial
                    (@$!%*?&).
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? "Changement…" : "Changer"}
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
