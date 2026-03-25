import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  UserX,
  Phone,
  Mail,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Activity,
  AlertCircle,
  Crown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useUser } from "../../../hooks/useUser";
import type {
  CreateUserParams,
  UpdateUserParams,
} from "../../../types/user.types";
import type { AppUser } from "../../../types/user.types";

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const LIMIT = 10;

/**
 * Regex alignée sur CreateUserDto backend :
 * majuscule + minuscule + chiffre + caractère spécial (@$!%*?&)
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ─────────────────────────────────────────────────────────────
// Types locaux — formulaires uniquement
// ─────────────────────────────────────────────────────────────

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone: string;
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
}

const EMPTY_CREATE: CreateForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  telephone: "",
};

// ─────────────────────────────────────────────────────────────
// Sous-composants : badges
// ─────────────────────────────────────────────────────────────

const RoleBadge = ({ role }: { role: "USER" | "ADMIN" }) =>
  role === "ADMIN" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-600 border border-amber-200">
      <Shield size={9} /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-50 text-sky-600 border border-sky-200">
      <UserCheck size={9} /> User
    </span>
  );

const StatusBadge = ({ isActive }: { isActive: boolean }) =>
  isActive ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
      <UserX size={9} /> Inactif
    </span>
  );

// ─────────────────────────────────────────────────────────────
// Sous-composant : avatar initiales
// ─────────────────────────────────────────────────────────────

const Avatar = ({ user }: { user: AppUser }) => {
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const colors = [
    "from-sky-400 to-cyan-500",
    "from-indigo-400 to-violet-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
  ];
  const color = colors[user.email.charCodeAt(0) % colors.length];
  return (
    <div
      className={`w-8 h-8 rounded-full bg-linear-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
    >
      {initials}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sous-composant : modale de confirmation de suppression
// ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  user: AppUser;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="text-center font-serif text-lg text-slate-900 mb-1">
          Supprimer l'utilisateur
        </h3>
        <p className="text-center text-slate-500 text-sm">
          Voulez-vous supprimer{" "}
          <span className="font-semibold text-slate-700">
            {user.firstName} {user.lastName}
          </span>{" "}
          ? Cette action est irréversible.
        </p>
      </div>
      <div className="flex border-t border-slate-100">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Annuler
        </button>
        <div className="w-px bg-slate-100" />
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Sous-composant : modale de création
// ─────────────────────────────────────────────────────────────

const CreateModal = ({
  form,
  onChange,
  onSave,
  onClose,
  isSaving,
}: {
  form: CreateForm;
  onChange: (f: CreateForm) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  const field = (
    label: string,
    key: keyof CreateForm,
    type = "text",
    placeholder = "",
    hint?: string,
  ) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => onChange({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : undefined}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:items-center bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="font-serif text-lg text-slate-900">
            Nouvel utilisateur
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Prénom", "firstName", "text", "Jean")}
          {field("Nom", "lastName", "text", "Dupont")}
          {field("Email", "email", "email", "jean@example.com")}
          {field("Téléphone", "telephone", "tel", "+33 6 00 00 00 00")}
          <div className="sm:col-span-2">
            {field(
              "Mot de passe",
              "password",
              "password",
              "••••••••",
              "8 car. min · majuscule · minuscule · chiffre · caractère spécial (@$!%*?&)",
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sous-composant : modale d'édition
// ─────────────────────────────────────────────────────────────

const EditModal = ({
  user,
  form,
  onChange,
  onSave,
  onClose,
  isSaving,
}: {
  user: AppUser;
  form: EditForm;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  const field = (label: string, key: keyof EditForm, type = "text") => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => onChange({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:items-center bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar user={user} />
            <div>
              <h3 className="font-serif text-base text-slate-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Prénom", "firstName")}
          {field("Nom", "lastName")}
          <div className="sm:col-span-2">
            {field("Email", "email", "email")}
          </div>
          <div className="sm:col-span-2">
            {field("Téléphone", "telephone", "tel")}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Save size={13} />
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

const Utilisateurs = () => {
  const {
    userList,
    loading,
    statistics,
    fetchUsers,
    fetchStatistics,
    createNewUser,
    patchUser,
    updateUserStatus,
    removeUser,
  } = useUser();

  // ── State UI ───────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  // ── Chargement ─────────────────────────────────────────────
  const load = useCallback(
    (p: number) => fetchUsers({ page: p, limit: LIMIT }),
    [fetchUsers],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  useEffect(() => {
    if (!statistics) {
      fetchStatistics();
    }
  }, [statistics, fetchStatistics]);

  // ── Recherche — reset page à 1 quand la query change ──────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // ── Filtrage local (sur les items de la page courante) ─────
  const filtered = (userList?.items ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.telephone.includes(q)
    );
  });

  // ── Validation création ────────────────────────────────────
  const validateCreate = (): boolean => {
    const { firstName, lastName, email, password, telephone } = createForm;

    if (!firstName.trim() || firstName.trim().length < 2) {
      toast.error("Le prénom doit contenir au moins 2 caractères");
      return false;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      toast.error("Le nom doit contenir au moins 2 caractères");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email invalide");
      return false;
    }
    if (!telephone.trim()) {
      toast.error("Le téléphone est requis");
      return false;
    }
    if (!password) {
      toast.error("Le mot de passe est requis");
      return false;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast.error(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)",
      );
      return false;
    }
    return true;
  };

  // ── Handler création ───────────────────────────────────────
  const handleCreate = async () => {
    if (!validateCreate()) return;

    const params: CreateUserParams = {
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      telephone: createForm.telephone.trim(),
    };

    const result = await createNewUser(params);
    if (result) {
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
    }
  };

  // ── Handler édition ────────────────────────────────────────
  const openEdit = (user: AppUser) => {
    setEditTarget(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      telephone: user.telephone,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;

    // Diff : n'envoyer que les champs modifiés
    const params: UpdateUserParams = {};
    if (editForm.firstName.trim() !== editTarget.firstName) {
      params.firstName = editForm.firstName.trim();
    }
    if (editForm.lastName.trim() !== editTarget.lastName) {
      params.lastName = editForm.lastName.trim();
    }
    if (editForm.email.trim() !== editTarget.email) {
      params.email = editForm.email.trim().toLowerCase();
    }
    if (editForm.telephone.trim() !== editTarget.telephone) {
      params.telephone = editForm.telephone.trim();
    }

    if (Object.keys(params).length === 0) {
      toast("Aucune modification détectée", { icon: "ℹ️" });
      setEditTarget(null);
      return;
    }

    const result = await patchUser(editTarget.id, params);
    if (result) setEditTarget(null);
  };

  // ── Handler toggle statut ─────────────────────────────────
  const handleToggleStatus = async (user: AppUser) => {
    if (user.role === "ADMIN" && user.isActive) {
      toast.error("Impossible de désactiver un compte administrateur");
      return;
    }
    await updateUserStatus(user.id, { isActive: !user.isActive });
  };

  // ── Handler suppression ────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await removeUser(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  // ── Pagination ─────────────────────────────────────────────
  const totalPages = userList?.totalPages ?? 1;

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <>
      <Helmet>
        <title>Gestion Utilisateurs - Paname Consulting</title>
        <meta
          name="description"
          content="Gérez les utilisateurs de Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen p-4 sm:p-6 font-sans">
        {/* Modales */}
        {showCreate && (
          <CreateModal
            form={createForm}
            onChange={setCreateForm}
            onSave={handleCreate}
            onClose={() => {
              setShowCreate(false);
              setCreateForm(EMPTY_CREATE);
            }}
            isSaving={loading.create}
          />
        )}

        {editTarget && (
          <EditModal
            user={editTarget}
            form={editForm}
            onChange={setEditForm}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
            isSaving={loading.update}
          />
        )}

        {deleteTarget && (
          <DeleteModal
            user={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            isDeleting={loading.delete}
          />
        )}

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Users size={20} className="text-sky-500" />
              <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 font-normal">
                Utilisateurs
              </h1>
            </div>
            <p className="text-slate-500 text-sm">
              {userList ? (
                <>
                  <span className="font-semibold text-slate-700">
                    {userList.total}
                  </span>{" "}
                  utilisateur{userList.total !== 1 ? "s" : ""} au total
                </>
              ) : (
                "Gestion des comptes"
              )}
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="self-end sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200"
          >
            <Plus size={15} /> Nouvel utilisateur
          </button>
        </div>

        {/* ── Statistiques ────────────────────────────────────── */}
        {statistics && (
          <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {statistics.totalUsers}
                  </span>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Total Utilisateurs
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Actifs : {statistics.activeUsers}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {statistics.activeUsers}
                  </span>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Utilisateurs Actifs
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Activity className="w-3 h-3 mr-1" />
                  {statistics.totalUsers
                    ? Math.round(
                        (statistics.activeUsers / statistics.totalUsers) * 100,
                      )
                    : 0}
                  % du total
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <UserX className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {statistics.inactiveUsers}
                  </span>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Utilisateurs Inactifs
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {statistics.totalUsers
                    ? Math.round(
                        (statistics.inactiveUsers / statistics.totalUsers) *
                          100,
                      )
                    : 0}
                  % du total
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {statistics.adminUsers}
                  </span>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Administrateurs
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Crown className="w-3 h-3 mr-1" />
                  {statistics.totalUsers
                    ? Math.round(
                        (statistics.adminUsers / statistics.totalUsers) * 100,
                      )
                    : 0}
                  % du total
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Barre de recherche + refresh ────────────────────── */}
        <div className="max-w-6xl mx-auto mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading.list}
            className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-500 hover:text-sky-500 hover:border-sky-300 transition-colors shadow-sm disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw
              size={15}
              className={loading.list ? "animate-spin" : ""}
            />
          </button>
        </div>

        {/* ── Tableau ─────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading.list && !userList && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">
                Chargement des utilisateurs…
              </span>
            </div>
          )}

          {!loading.list && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Users size={32} className="text-slate-200" />
              <span className="text-slate-400 text-sm">
                {search
                  ? "Aucun résultat pour cette recherche"
                  : "Aucun utilisateur trouvé"}
              </span>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Tableau desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        Utilisateur
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        Rôle
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        Statut
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden lg:table-cell">
                        Connexions
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-sky-50/40 transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar user={user} />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail size={11} className="text-slate-300" />
                              <span className="truncate max-w-[160px]">
                                {user.email}
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone size={11} className="text-slate-300" />
                              {user.telephone || (
                                <span className="text-slate-300">—</span>
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge isActive={user.isActive} />
                        </td>

                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-sm font-semibold text-slate-700">
                            {user.loginCount}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            connexions
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={user.role === "ADMIN" && user.isActive}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.role === "ADMIN" && user.isActive
                                  ? "text-slate-300 cursor-not-allowed opacity-50"
                                  : user.isActive
                                    ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                              }`}
                              title={
                                user.role === "ADMIN" && user.isActive
                                  ? "Impossible de désactiver un admin"
                                  : user.isActive
                                    ? "Désactiver"
                                    : "Activer"
                              }
                            >
                              {user.isActive ? (
                                <Shield size={14} />
                              ) : (
                                <UserCheck size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => openEdit(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartes mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filtered.map((user) => (
                  <div key={user.id} className="p-4 flex items-start gap-3">
                    <Avatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-slate-800 text-sm truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.role === "ADMIN" && user.isActive}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.role === "ADMIN" && user.isActive
                                ? "text-slate-300 cursor-not-allowed opacity-50"
                                : user.isActive
                                  ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                                  : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                            }`}
                          >
                            {user.isActive ? (
                              <Shield size={13} />
                            ) : (
                              <UserCheck size={13} />
                            )}
                          </button>
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 truncate">
                        {user.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={user.role} />
                        <StatusBadge isActive={user.isActive} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Pagination ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-400">
                Page{" "}
                <span className="font-semibold text-slate-600">{page}</span> /{" "}
                {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading.list}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                  )
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                      acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "…" ? (
                      <span
                        key={`e${i}`}
                        className="px-1 text-slate-300 text-xs"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        disabled={loading.list}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors border ${
                          page === item
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:border-sky-300 hover:text-sky-500"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading.list}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Utilisateurs;
