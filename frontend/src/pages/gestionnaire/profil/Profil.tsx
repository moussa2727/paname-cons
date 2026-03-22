import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Calendar,
  Edit2,
  Save,
  X,
  Shield,
  CheckCircle2,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Helpers téléphone (affichage uniquement — non envoyé au backend)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Type du formulaire
//
// ❌ email absent  — readOnly, jamais envoyé au backend
// ❌ telephone absent — l'admin ne peut pas modifier son téléphone
// ✅ firstName, lastName, password uniquement (UpdateProfileDto backend)
// ─────────────────────────────────────────────────────────────

interface ProfileForm {
  firstName: string;
  lastName: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

const Profil = () => {
  /**
   * updateAdminProfile : PATCH /admin/profile
   * Envoie uniquement firstName, lastName, password.
   * Défini dans AuthContext et AuthContextType.
   */
  const { user: profile, updateAdminProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  // isSaving est un état LOCAL — isLoading du context est réservé
  // au checkAuth initial et ne reflète pas l'état d'un PATCH.
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const initialForm = useMemo(
    (): ProfileForm => ({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      password: "",
    }),
    [profile?.firstName, profile?.lastName],
  );

  const [formData, setFormData] = useState<ProfileForm>(initialForm);

  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  const handleEdit = () => {
    setFormData(initialForm);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setIsEditing(false);
    setShowPassword(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validation minimale côté client
    if (formData.firstName.trim().length < 2) {
      toast.error("Le prénom doit contenir au moins 2 caractères");
      return;
    }
    if (formData.lastName.trim().length < 2) {
      toast.error("Le nom doit contenir au moins 2 caractères");
      return;
    }
    if (formData.password && formData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    // Construire le payload — n'envoyer que les champs modifiés
    // et ne jamais inclure email ni telephone (protégés backend)
    const params: { firstName?: string; lastName?: string; password?: string } =
      {};

    if (formData.firstName.trim() !== profile.firstName) {
      params.firstName = formData.firstName.trim();
    }
    if (formData.lastName.trim() !== profile.lastName) {
      params.lastName = formData.lastName.trim();
    }
    // Le mot de passe est toujours envoyé s'il est renseigné
    if (formData.password) {
      params.password = formData.password;
    }

    // Rien à mettre à jour
    if (Object.keys(params).length === 0) {
      toast("Aucune modification détectée", { icon: "ℹ️" });
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateAdminProfile(params);
      setIsEditing(false);
      setShowPassword(false);
    } catch {
      // Le toast d'erreur est géré dans AuthContext.updateAdminProfile
    } finally {
      setIsSaving(false);
    }
  };

  const initials =
    `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}`.toUpperCase();
  const roleLabel =
    profile?.role === "ADMIN" ? "Administrateur" : "Utilisateur";
  const userIsAdmin = profile?.role === "ADMIN";

  return (
    <>
      <Helmet>
        <title>Profil Administrateur - Paname Consulting</title>
        <meta
          name="description"
          content="Gérez votre profil administrateur Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen p-4 sm:p-6 font-sans">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 font-normal">
              Mon profil
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Gérez vos informations personnelles
            </p>
          </div>

          <div className="flex gap-2 self-end sm:self-auto">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <X size={14} /> Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {isSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium shadow-sm"
              >
                <Edit2 size={14} /> Modifier
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-sky-400 to-indigo-500 flex items-center justify-center font-serif text-2xl sm:text-3xl text-white tracking-wider shadow-lg shadow-sky-200">
                {initials || "?"}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200 shrink-0" />
              <h2 className="font-serif text-lg sm:text-xl text-slate-900 font-normal">
                {profile?.firstName} {profile?.lastName}
              </h2>
            </div>

            <p className="text-slate-500 text-sm mb-3">{roleLabel}</p>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${
                userIsAdmin
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-sky-50 text-sky-700 border border-sky-200"
              }`}
            >
              <Shield size={10} />
              {roleLabel}
            </span>

            <div className="h-px bg-slate-100 my-5" />

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar size={13} className="text-sky-400 shrink-0" />
                <span className="text-xs text-slate-500">
                  Membre depuis{" "}
                  <span className="font-medium text-slate-700">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    Compte actif
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Personal info card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-serif text-base text-slate-900 font-normal mb-5">
              Informations personnelles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prénom */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Prénom
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                ) : (
                  <div className="flex items-center gap-2.5 py-2 border-b border-slate-100">
                    <span className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center text-sky-400 text-xs font-bold shrink-0">
                      {profile?.firstName?.[0] ?? "?"}
                    </span>
                    <span className="text-sm text-slate-800 font-medium">
                      {profile?.firstName || (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Nom */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nom
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                ) : (
                  <div className="flex items-center gap-2.5 py-2 border-b border-slate-100">
                    <span className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center text-sky-400 text-xs font-bold shrink-0">
                      {profile?.lastName?.[0] ?? "?"}
                    </span>
                    <span className="text-sm text-slate-800 font-medium">
                      {profile?.lastName || (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Mot de passe */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Mot de passe{isEditing && " (optionnel)"}
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="Laisser vide pour ne pas modifier"
                      className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 py-2 border-b border-slate-100">
                    <div className="w-4 h-4 bg-slate-200 rounded-full shrink-0" />
                    <span className="text-sm text-slate-800 font-medium">
                      •••••••••••••••••
                    </span>
                  </div>
                )}
                {isEditing && (
                  <p className="text-xs text-slate-400 mt-1">
                    Laisser vide pour ne pas modifier le mot de passe
                  </p>
                )}
              </div>

              {/* Email — toujours readOnly, jamais modifiable par l'admin */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Adresse email{" "}
                  <span className="normal-case font-normal text-slate-300">
                    (non modifiable)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showEmail ? "email" : "password"}
                    value={profile?.email ?? ""}
                    readOnly
                    className="w-full px-3 py-2.5 pr-10 border border-slate-100 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed select-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmail((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showEmail ? "Masquer l'email" : "Afficher l'email"}
                  >
                    {showEmail ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Téléphone — affiché en lecture seule, jamais modifiable par l'admin */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Téléphone{" "}
                  <span className="normal-case font-normal text-slate-300">
                    (non modifiable)
                  </span>
                </label>
                <div className="flex items-center gap-2.5 py-2 border-b border-slate-100">
                  <Phone size={15} className="text-slate-300 shrink-0" />
                  <span className="text-sm text-slate-500 font-medium">
                    {profile?.telephone ? (
                      formatPhoneNumber(profile.telephone)
                    ) : (
                      <span className="text-slate-300">Non renseigné</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profil;
