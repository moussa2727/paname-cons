import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useProcedures } from "../../../hooks/useProcedures";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Plus,
  User,
  Ban,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Zap,
  FileText,
  X,
} from "lucide-react";
import type {
  ProcedureStatus,
  StepName,
  StepStatus,
  UpdateProcedureDto,
  UpdateStepDto,
  StepResponseDto,
} from "../../../types/procedures.types";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProcedureStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
  }
> = {
  PENDING: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock size={13} />,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: <TrendingUp size={13} />,
  },
  COMPLETED: {
    label: "Terminée",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 size={13} />,
  },
  REJECTED: {
    label: "Refusée",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <XCircle size={13} />,
  },
  CANCELLED: {
    label: "Annulée",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: <AlertCircle size={13} />,
  },
};

const STEP_STATUS_CONFIG: Record<
  StepStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  PENDING: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "text-sky-700",
    bg: "bg-sky-50",
    dot: "bg-sky-500",
  },
  COMPLETED: {
    label: "Terminée",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Refusée",
    color: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
  CANCELLED: {
    label: "Annulée",
    color: "text-slate-600",
    bg: "bg-slate-50",
    dot: "bg-slate-400",
  },
};

const STEP_LABELS: Record<StepName, string> = {
  DEMANDE_ADMISSION: "Demande d'admission",
  DEMANDE_VISA: "Demande de visa",
  PREPARATIF_VOYAGE: "Préparatifs voyage",
};

const STEP_ORDER: StepName[] = [
  "DEMANDE_ADMISSION",
  "DEMANDE_VISA",
  "PREPARATIF_VOYAGE",
];

// ─── Composants UI réutilisables ─────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ProcedureStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
};

const StepStatusBadge: React.FC<{ status: StepStatus }> = ({ status }) => {
  const cfg = STEP_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Modal shell ──────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full ${width} animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Champs de formulaire ─────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label className="text-xs font-medium text-slate-500 block mb-1">
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white text-slate-800 placeholder:text-slate-300";
const selectCls =
  "w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white text-slate-800";

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type ModalType =
  | "edit"
  | "editStep"
  | "addStep"
  | "complete"
  | "cancel"
  | "delete"
  | null;

export default function ProcedureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    selectedProcedure: procedure,
    loading,
    error,
    loadById,
    update,
    updateStep,
    addStep,
    completeProcedure,
    cancelProcedure,
    remove,
  } = useProcedures({ autoLoad: false });

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ type: ModalType; stepName?: StepName }>({
    type: null,
  });

  // ── Form states ───────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState<UpdateProcedureDto>({});
  const [stepForm, setStepForm] = useState<UpdateStepDto>({});
  const [deleteReason, setDeleteReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showAddStepMenu, setShowAddStepMenu] = useState(false);

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    if (id) loadById(id);
  }, [id, loadById]);

  // Fermer le menu déroulant au clic extérieur
  useEffect(() => {
    if (!showAddStepMenu) return;
    const handler = () => setShowAddStepMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showAddStepMenu]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (id) await loadById(id);
  }, [id, loadById]);

  const closeModal = useCallback(() => {
    setModal({ type: null });
    setEditForm({});
    setStepForm({});
    setDeleteReason("");
    setCancelReason("");
  }, []);

  const openEdit = useCallback(() => {
    if (!procedure) return;
    setEditForm({
      prenom: procedure.prenom,
      nom: procedure.nom,
      telephone: procedure.telephone,
      destination: procedure.destination,
      destinationAutre: procedure.destinationAutre,
      filiere: procedure.filiere,
      filiereAutre: procedure.filiereAutre,
      niveauEtude: procedure.niveauEtude,
      niveauEtudeAutre: procedure.niveauEtudeAutre,
    });
    setModal({ type: "edit" });
  }, [procedure]);

  const openEditStep = useCallback((step: StepResponseDto) => {
    setStepForm({
      statut: step.statut,
      raisonRefus: step.raisonRefus,
    });
    setModal({ type: "editStep", stepName: step.nom });
  }, []);

  const openAddStep = useCallback((stepName: StepName) => {
    setModal({ type: "addStep", stepName });
    setShowAddStepMenu(false);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!procedure) return;
    const result = await update(procedure.id, editForm);
    if (result) closeModal();
  };

  const handleUpdateStep = async () => {
    if (!procedure || !modal.stepName) return;
    const result = await updateStep(procedure.id, modal.stepName, stepForm);
    if (result) closeModal();
  };

  const handleAddStep = async () => {
    if (!procedure || !modal.stepName) return;
    const result = await addStep(procedure.id, modal.stepName);
    if (result) closeModal();
  };

  const handleComplete = async () => {
    if (!procedure) return;
    const result = await completeProcedure(procedure.id);
    if (result) closeModal();
  };

  const handleCancel = async () => {
    if (!procedure) return;
    const result = await cancelProcedure(
      procedure.id,
      cancelReason || "Annulation manuelle par l'admin",
    );
    if (result) closeModal();
  };

  const handleDelete = async () => {
    if (!procedure) return;
    const ok = await remove(
      procedure.id,
      deleteReason || "Suppression manuelle",
    );
    if (ok) navigate("/gestionnaire/procedures");
  };

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const canBeModified = procedure
    ? !["COMPLETED", "CANCELLED", "REJECTED"].includes(procedure.statut)
    : false;
  const canBeCancelled = procedure
    ? !["COMPLETED", "CANCELLED"].includes(procedure.statut)
    : false;
  const canBeCompleted = procedure ? procedure.statut === "IN_PROGRESS" : false;

  // Étapes déjà présentes dans la procédure (utilisation de Set pour performance)
  const existingStepNames = useMemo(
    () => new Set(procedure?.steps?.map((s) => s.nom) ?? []),
    [procedure?.steps],
  );

  // Étapes disponibles à ajouter (pas encore présentes)
  const availableStepsToAdd = useMemo(
    () => STEP_ORDER.filter((s) => !existingStepNames.has(s)),
    [existingStepNames],
  );

  // Étapes triées selon l'ordre logique (tri stable avec clé unique)
  const sortedSteps = useMemo(
    () =>
      [...(procedure?.steps ?? [])].sort(
        (a, b) => STEP_ORDER.indexOf(a.nom) - STEP_ORDER.indexOf(b.nom),
      ),
    [procedure?.steps],
  );

  // ── Étapes refusées/rejetées
  const hasRejectedStep = procedure?.steps?.some(
    (s) => s.statut === "REJECTED",
  );

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading.details && !procedure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw size={16} className="animate-spin" />
          Chargement…
        </div>
      </div>
    );
  }

  if (error && !procedure) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm max-w-sm w-full">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 text-sm">Procédure introuvable.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
      <title>
        {procedure?.fullName 
          ? `Procédure ${procedure.fullName} — Paname Consulting`
          : "Procédure — Paname Consulting"}
      </title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen pb-16 bg-slate-50">
        {/* ── Header sticky ── */}
        <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
              {/* Gauche */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate("/gestionnaire/procedures")}
                  className="p-1.5 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm font-bold text-slate-800 truncate">
                      {procedure.fullName}
                    </h1>
                    <StatusBadge status={procedure.statut} />
                    {procedure.isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                        <AlertTriangle size={11} /> En retard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                    #{procedure.id?.slice(-10) || "N/A"} · créée le{" "}
                    {new Date(procedure.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Actions header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={reload}
                  disabled={loading.details}
                  title="Rafraîchir"
                  className="p-2 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    size={14}
                    className={loading.details ? "animate-spin" : ""}
                  />
                </button>

                {canBeModified && (
                  <button
                    onClick={openEdit}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border border-sky-200 text-sky-700 bg-sky-50 text-xs font-medium hover:bg-sky-100 transition-colors"
                  >
                    <Edit2 size={13} /> Modifier
                  </button>
                )}

                {canBeCompleted && (
                  <button
                    onClick={() => setModal({ type: "complete" })}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Zap size={13} /> Terminer
                  </button>
                )}

                {canBeCancelled && (
                  <button
                    onClick={() => setModal({ type: "cancel" })}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-200 text-amber-700 bg-amber-50 text-xs font-medium hover:bg-amber-100 transition-colors"
                  >
                    <Ban size={13} /> Annuler
                  </button>
                )}

                <button
                  onClick={() => setModal({ type: "delete" })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-200 text-red-600 bg-red-50 text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Supprimer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ═══════════════ Colonne principale ═══════════════ */}
            <div className="lg:col-span-2 space-y-5">
              {/* Actions mobile (boutons visibles sous sm) */}
              <div className="flex flex-wrap gap-2 sm:hidden">
                {canBeModified && (
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-sky-200 text-sky-700 bg-sky-50 text-xs font-medium"
                  >
                    <Edit2 size={12} /> Modifier
                  </button>
                )}
                {canBeCompleted && (
                  <button
                    onClick={() => setModal({ type: "complete" })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-medium"
                  >
                    <Zap size={12} /> Terminer
                  </button>
                )}
                {canBeCancelled && (
                  <button
                    onClick={() => setModal({ type: "cancel" })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-amber-200 text-amber-700 bg-amber-50 text-xs font-medium"
                  >
                    <Ban size={12} /> Annuler
                  </button>
                )}
              </div>

              {/* Infos personnelles */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <User size={14} />,
                      label: "Nom complet",
                      value: procedure.fullName,
                    },
                    {
                      icon: <Mail size={14} />,
                      label: "Email",
                      value: procedure.email,
                    },
                    {
                      icon: <Phone size={14} />,
                      label: "Téléphone",
                      value: procedure.telephone,
                    },
                    {
                      icon: <Calendar size={14} />,
                      label: "Créée le",
                      value: procedure.createdAt
                        ? new Date(procedure.createdAt).toLocaleDateString(
                            "fr-FR",
                            { day: "2-digit", month: "long", year: "numeric" },
                          )
                        : "Date inconnue",
                    },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="mt-0.5 text-slate-300 shrink-0">
                        {icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {value}
                        </p>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infos académiques */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Informations académiques
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <MapPin size={14} />,
                      label: "Destination",
                      value: procedure.effectiveDestination,
                    },
                    {
                      icon: <GraduationCap size={14} />,
                      label: "Niveau d'étude",
                      value: procedure.effectiveNiveauEtude,
                    },
                    {
                      icon: <BookOpen size={14} />,
                      label: "Filière",
                      value: procedure.effectiveFiliere,
                    },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="mt-0.5 text-slate-300 shrink-0">
                        {icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {value}
                        </p>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Étapes */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Étapes de la procédure
                  </h2>

                  {/* Bouton ajouter étape — seulement si des étapes sont disponibles et procédure modifiable */}
                  {canBeModified && availableStepsToAdd.length > 0 && (
                    <div
                      className="relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowAddStepMenu((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors"
                      >
                        <Plus size={12} /> Ajouter une étape
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${showAddStepMenu ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showAddStepMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl py-1 z-20 min-w-[220px]">
                          {availableStepsToAdd.map((stepName) => (
                            <button
                              key={stepName}
                              onClick={() => openAddStep(stepName)}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                            >
                              {STEP_LABELS[stepName]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {sortedSteps.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="mx-auto mb-2 opacity-30" size={28} />
                    <p className="text-sm">Aucune étape enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          step.isOverdue
                            ? "border-orange-200 bg-orange-50/30"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Numéro */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                step.statut === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : step.statut === "IN_PROGRESS"
                                    ? "bg-sky-100 text-sky-700"
                                    : step.statut === "REJECTED"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800">
                                  {STEP_LABELS[step.nom]}
                                </p>
                                <StepStatusBadge status={step.statut} />
                                {step.isOverdue && (
                                  <span className="text-xs text-orange-500 flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> Retard
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1.5">
                                <span className="text-xs text-slate-400">
                                  Créée le{" "}
                                  {new Date(
                                    step.dateCreation,
                                  ).toLocaleDateString("fr-FR")}
                                </span>
                                {step.dateCompletion && (
                                  <span className="text-xs text-slate-400">
                                    · Terminée le{" "}
                                    {new Date(
                                      step.dateCompletion,
                                    ).toLocaleDateString("fr-FR")}
                                  </span>
                                )}
                                {step.duration != null && (
                                  <span className="text-xs text-slate-400">
                                    · {step.duration}j
                                  </span>
                                )}
                              </div>
                              {step.raisonRefus && (
                                <p className="text-xs text-red-600 mt-1.5 bg-red-50 rounded px-2 py-1 border border-red-100">
                                  Motif : {step.raisonRefus}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bouton modifier étape */}
                          {canBeModified && step.canBeModified && (
                            <button
                              onClick={() => openEditStep(step)}
                              title="Modifier l'étape"
                              className="p-1.5 rounded text-slate-300 hover:text-sky-600 hover:bg-sky-50 transition-colors shrink-0"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raison de rejet/annulation si applicable */}
              {(procedure.raisonRejet || procedure.cancelledReason) && (
                <div
                  className={`rounded-lg border p-4 ${
                    procedure.statut === "REJECTED"
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-1 ${
                    procedure.statut === 'REJECTED' ? 'text-red-600' : 'text-slate-500'
                  }"
                  >
                    {procedure.statut === "REJECTED"
                      ? "Motif de refus"
                      : "Motif d'annulation"}
                  </p>
                  <p className="text-sm text-slate-700">
                    {procedure.raisonRejet ?? procedure.cancelledReason}
                  </p>
                </div>
              )}
            </div>

            {/* ═══════════════ Sidebar ═══════════════ */}
            <div className="space-y-4">
              {/* Progression */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Progression
                </h2>
                <div className="space-y-3">
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-3xl font-bold text-sky-600">
                      {procedure.progress}%
                    </span>
                    <span className="text-xs text-slate-400">
                      {procedure.completedSteps}/{procedure.totalSteps} étapes
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{ width: `${procedure.progress}%` }}
                    />
                  </div>
                  {procedure.activeStep && (
                    <p className="text-xs text-slate-500 mt-2">
                      Étape active :{" "}
                      <span className="font-medium text-slate-700">
                        {STEP_LABELS[procedure.activeStep]}
                      </span>
                    </p>
                  )}
                  {procedure.nextStep && (
                    <p className="text-xs text-slate-500">
                      Prochaine :{" "}
                      <span className="font-medium text-slate-700">
                        {STEP_LABELS[procedure.nextStep]}
                      </span>
                    </p>
                  )}
                  {procedure.estimatedCompletionDate && (
                    <p className="text-xs text-slate-400 pt-1 border-t border-slate-50">
                      Estimation :{" "}
                      {new Date(
                        procedure.estimatedCompletionDate,
                      ).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Historique */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Historique
                </h2>
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      label: "Création",
                      value: procedure.createdAt
                        ? new Date(procedure.createdAt).toLocaleDateString(
                            "fr-FR",
                          )
                        : "Date inconnue",
                    },
                    procedure.updatedAt && {
                      label: "Dernière modification",
                      value: new Date(procedure.updatedAt).toLocaleDateString(
                        "fr-FR",
                      ),
                    },
                    procedure.dateDerniereModification && {
                      label: "Dernière action",
                      value: new Date(
                        procedure.dateDerniereModification,
                      ).toLocaleDateString("fr-FR"),
                    },
                    procedure.dateCompletion && {
                      label: "Complétée le",
                      value: new Date(
                        procedure.dateCompletion,
                      ).toLocaleDateString("fr-FR"),
                    },
                    procedure.cancelledAt && {
                      label: "Annulée le",
                      value: new Date(procedure.cancelledAt).toLocaleDateString(
                        "fr-FR",
                      ),
                    },
                    procedure.deletedAt && {
                      label: "Supprimée le",
                      value: new Date(procedure.deletedAt).toLocaleDateString(
                        "fr-FR",
                      ),
                    },
                  ]
                    .filter(
                      (item): item is { label: string; value: string } =>
                        item != null,
                    )
                    .map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-slate-700 font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Durée</span>
                    <span className="text-slate-700 font-medium">
                      {procedure.daysSinceCreation}j
                    </span>
                  </div>
                </div>
              </div>

              {/* Rendez-vous lié */}
              {(procedure.rendezvousStatus || procedure.rendezvousDate) && (
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Rendez-vous associé
                  </h2>
                  <div className="space-y-2 text-xs">
                    {procedure.rendezvousDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date</span>
                        <span className="text-slate-700 font-medium">
                          {procedure.rendezvousDate}
                        </span>
                      </div>
                    )}
                    {procedure.rendezvousStatus && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Statut</span>
                        <span className="text-slate-700 font-medium">
                          {procedure.rendezvousStatus}
                        </span>
                      </div>
                    )}
                    {procedure.rendezVousId && (
                      <p className="text-slate-300 truncate text-[10px] pt-1 border-t border-slate-50">
                        #{procedure.rendezVousId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Alerte étape rejetée */}
              {hasRejectedStep && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-1">
                    <XCircle size={13} /> Étape refusée
                  </p>
                  <p className="text-xs text-red-600">
                    Une ou plusieurs étapes ont été refusées. Vérifiez les
                    motifs ci-dessous.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════ MODALS ════════════════════ */}

      {/* ── Modal : Modifier la procédure ── */}
      <Modal
        open={modal.type === "edit"}
        onClose={closeModal}
        title="Modifier la procédure"
        width="max-w-xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prénom">
            <input
              className={inputCls}
              value={editForm.prenom ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, prenom: e.target.value }))
              }
              placeholder="Prénom"
            />
          </Field>
          <Field label="Nom">
            <input
              className={inputCls}
              value={editForm.nom ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, nom: e.target.value }))
              }
              placeholder="Nom"
            />
          </Field>
          <Field label="Téléphone">
            <input
              className={inputCls}
              value={editForm.telephone ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, telephone: e.target.value }))
              }
              placeholder="+33612345678"
            />
          </Field>
          <Field label="Destination">
            <input
              className={inputCls}
              value={editForm.destination ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, destination: e.target.value }))
              }
              placeholder="France"
            />
          </Field>
          {editForm.destination === "Autre" && (
            <Field label="Destination (préciser)">
              <input
                className={inputCls}
                value={editForm.destinationAutre ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    destinationAutre: e.target.value,
                  }))
                }
              />
            </Field>
          )}
          <Field label="Filière">
            <input
              className={inputCls}
              value={editForm.filiere ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, filiere: e.target.value }))
              }
              placeholder="Informatique"
            />
          </Field>
          {editForm.filiere === "Autre" && (
            <Field label="Filière (préciser)">
              <input
                className={inputCls}
                value={editForm.filiereAutre ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, filiereAutre: e.target.value }))
                }
              />
            </Field>
          )}
          <Field label="Niveau d'étude">
            <input
              className={inputCls}
              value={editForm.niveauEtude ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, niveauEtude: e.target.value }))
              }
              placeholder="Master I"
            />
          </Field>
          {editForm.niveauEtude === "Autre" && (
            <Field label="Niveau (préciser)">
              <input
                className={inputCls}
                value={editForm.niveauEtudeAutre ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    niveauEtudeAutre: e.target.value,
                  }))
                }
              />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading.update}
            className="px-4 py-2 text-sm rounded bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.update && <RefreshCw size={13} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </Modal>

      {/* ── Modal : Modifier une étape ── */}
      <Modal
        open={modal.type === "editStep"}
        onClose={closeModal}
        title={
          modal.stepName
            ? `Modifier : ${STEP_LABELS[modal.stepName]}`
            : "Modifier l'étape"
        }
      >
        <div className="space-y-4">
          <Field label="Nouveau statut">
            <select
              className={selectCls}
              value={stepForm.statut ?? ""}
              onChange={(e) =>
                setStepForm((p) => ({
                  ...p,
                  statut: e.target.value as StepStatus,
                }))
              }
            >
              <option value="">— Choisir —</option>
              {(
                [
                  "PENDING",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "REJECTED",
                  "CANCELLED",
                ] as StepStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {STEP_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </Field>

          {(stepForm.statut === "REJECTED" ||
            stepForm.statut === "CANCELLED") && (
            <Field label="Motif de refus">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={stepForm.raisonRefus ?? ""}
                onChange={(e) =>
                  setStepForm((p) => ({ ...p, raisonRefus: e.target.value }))
                }
                placeholder="Indiquer le motif…"
              />
            </Field>
          )}

          {stepForm.statut === "COMPLETED" && (
            <Field label="Date de complétion">
              <input
                type="date"
                className={inputCls}
                value={
                  stepForm.dateCompletion?.split("T")[0] ??
                  new Date().toISOString().split("T")[0]
                }
                onChange={(e) =>
                  setStepForm((p) => ({ ...p, dateCompletion: e.target.value }))
                }
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleUpdateStep}
            disabled={loading.updateStep || !stepForm.statut}
            className="px-4 py-2 text-sm rounded bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.updateStep && (
              <RefreshCw size={13} className="animate-spin" />
            )}
            Enregistrer
          </button>
        </div>
      </Modal>

      {/* ── Modal : Ajouter une étape ── */}
      <Modal
        open={modal.type === "addStep"}
        onClose={closeModal}
        title={
          modal.stepName
            ? `Ajouter : ${STEP_LABELS[modal.stepName]}`
            : "Ajouter une étape"
        }
      >
        <p className="text-sm text-slate-600 mb-5">
          Vous allez ajouter l'étape{" "}
          <span className="font-semibold text-slate-800">
            {modal.stepName ? STEP_LABELS[modal.stepName] : ""}
          </span>{" "}
          à cette procédure. Elle sera initialisée en statut <em>En attente</em>
          .
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleAddStep}
            disabled={loading.updateStep}
            className="px-4 py-2 text-sm rounded bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.updateStep && (
              <RefreshCw size={13} className="animate-spin" />
            )}
            Confirmer
          </button>
        </div>
      </Modal>

      {/* ── Modal : Terminer la procédure ── */}
      <Modal
        open={modal.type === "complete"}
        onClose={closeModal}
        title="Terminer la procédure"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
            <Zap size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Marquer comme terminée
            </p>
            <p className="text-sm text-slate-500">
              Le statut de la procédure passera à <strong>Terminée</strong>. Le
              backend calculera automatiquement le statut final en fonction des
              étapes.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleComplete}
            disabled={loading.update}
            className="px-4 py-2 text-sm rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.update && <RefreshCw size={13} className="animate-spin" />}
            Confirmer
          </button>
        </div>
      </Modal>

      {/* ── Modal : Annuler la procédure ── */}
      <Modal
        open={modal.type === "cancel"}
        onClose={closeModal}
        title="Annuler la procédure"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-50 rounded-lg shrink-0">
            <Ban size={18} className="text-amber-600" />
          </div>
          <p className="text-sm text-slate-600">
            Cette action est <strong>irréversible</strong>. La procédure sera
            marquée comme annulée.
          </p>
        </div>
        <Field label="Motif d'annulation (optionnel)">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ex : Doublon, demande retirée par le candidat…"
          />
        </Field>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleCancel}
            disabled={loading.update}
            className="px-4 py-2 text-sm rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.update && <RefreshCw size={13} className="animate-spin" />}
            Confirmer l'annulation
          </button>
        </div>
      </Modal>

      {/* ── Modal : Supprimer la procédure ── */}
      <Modal
        open={modal.type === "delete"}
        onClose={closeModal}
        title="Supprimer la procédure"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-lg shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-slate-600">
            La procédure sera <strong>supprimée</strong> (soft delete). Cette
            action ne peut pas être annulée depuis l'interface.
          </p>
        </div>
        <Field label="Motif de suppression (optionnel)">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Ex : Doublon, erreur de saisie…"
          />
        </Field>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleDelete}
            disabled={loading.delete}
            className="px-4 py-2 text-sm rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading.delete && <RefreshCw size={13} className="animate-spin" />}
            Supprimer définitivement
          </button>
        </div>
      </Modal>
    </>
  );
}
