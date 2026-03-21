import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Filter,
  Search,
  ChevronRight,
  MapPin,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useProcedures } from "../../../hooks/useProcedures";
import { Helmet } from "react-helmet-async";
import { pageConfigs } from "../../../components/shared/user/UserHeader.config";
import type {
  ProcedureResponseDto,
  ProcedureStatus,
  StepResponseDto,
  StepName,
} from "../../../types/procedures.types";
import Loader from "../../../components/shared/user/Loader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProcedureStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    dot: string;
  }
> = {
  PENDING: {
    label: "En attente",
    color: "text-slate-500",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "text-sky-600",
    bg: "bg-sky-50",
    dot: "bg-sky-500",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: "Terminée",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: "Rejetée",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-500",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: "Annulée",
    color: "text-orange-500",
    bg: "bg-orange-50",
    dot: "bg-orange-400",
    icon: <Ban className="w-3.5 h-3.5" />,
  },
};

const STEP_LABELS: Record<StepName, string> = {
  DEMANDE_ADMISSION: "Demande d'admission",
  ENTRETIEN_MOTIVATION: "Entretien de motivation",
  DEMANDE_VISA: "Demande de visa",
  PREPARATIF_VOYAGE: "Préparatifs voyage",
};

function formatDate(d: Date | string | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProcedureStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: ProcedureStatus;
}) {
  const color =
    status === "COMPLETED"
      ? "bg-emerald-500"
      : status === "REJECTED" || status === "CANCELLED"
        ? "bg-red-400"
        : "bg-gradient-to-r from-sky-400 to-blue-500";

  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// ─── StepTimeline ─────────────────────────────────────────────────────────────

function StepTimeline({ steps }: { steps: StepResponseDto[] }) {
  const sorted = [...steps].sort((a, b) => {
    const order: Record<string, number> = {
      DEMANDE_ADMISSION: 0,
      ENTRETIEN_MOTIVATION: 1,
      DEMANDE_VISA: 2,
      PREPARATIF_VOYAGE: 3,
    };
    return (order[a.nom] ?? 99) - (order[b.nom] ?? 99);
  });

  return (
    <div className="space-y-2 mt-3">
      {sorted.map((step, i) => {
        const isDone = step.statut === "COMPLETED";
        const isActive = step.statut === "IN_PROGRESS";
        const isRejected =
          step.statut === "REJECTED" || step.statut === "CANCELLED";

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold
                  ${isDone ? "bg-emerald-500" : isActive ? "bg-sky-500 ring-4 ring-sky-100" : isRejected ? "bg-red-400" : "bg-slate-200"}`}
              >
                {isDone ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : isRejected ? (
                  <X className="w-3 h-3" />
                ) : (
                  <span className={isActive ? "text-white" : "text-slate-400"}>
                    {i + 1}
                  </span>
                )}
              </div>
              {i < sorted.length - 1 && (
                <div
                  className={`w-px flex-1 min-h-[10px] mt-1 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`}
                />
              )}
            </div>

            {/* content */}
            <div className="pb-2 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`text-xs font-medium truncate ${isActive ? "text-sky-700" : isDone ? "text-slate-700" : isRejected ? "text-red-500" : "text-slate-400"}`}
                >
                  {STEP_LABELS[step.nom] ?? step.nom}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
                  ${isDone ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-sky-100 text-sky-700" : isRejected ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}
                >
                  {step.statusLabel}
                </span>
              </div>
              {step.raisonRefus && (
                <p className="text-[11px] text-red-500 mt-0.5 truncate">
                  {step.raisonRefus}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ProcedureDetailModal ─────────────────────────────────────────────────────

function ProcedureDetailModal({
  procedure,
  onClose,
  onCancel,
  cancelling,
}: {
  procedure: ProcedureResponseDto;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
  cancelling: boolean;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* header */}
        <div className="relative bg-linear-to-br from-sky-500 to-blue-600 px-5 pt-6 pb-5 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="pr-10">
            <p className="text-sky-100 text-xs font-medium uppercase tracking-widest mb-1">
              Procédure
            </p>
            <h2 className="text-xl font-bold leading-tight">
              {procedure.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                {procedure.effectiveDestination}
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                <GraduationCap className="w-3 h-3" />
                {procedure.effectiveFiliere}
              </span>
            </div>
          </div>

          {/* progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-sky-100 mb-1.5">
              <span>
                {procedure.completedSteps}/{procedure.totalSteps} étapes
              </span>
              <span className="font-semibold">{procedure.progress}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${procedure.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* meta */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              label="Statut"
              value={<StatusBadge status={procedure.statut} />}
            />
            <InfoCard label="Niveau" value={procedure.effectiveNiveauEtude} />
            <InfoCard
              label="Créée le"
              value={formatDate(procedure.createdAt)}
            />
            <InfoCard
              label="Modifiée le"
              value={formatDate(
                procedure.dateDerniereModification ?? procedure.updatedAt,
              )}
            />
            {procedure.dateCompletion && (
              <InfoCard
                label="Complétée le"
                value={formatDate(procedure.dateCompletion)}
              />
            )}
            {procedure.cancelledAt && (
              <InfoCard
                label="Annulée le"
                value={formatDate(procedure.cancelledAt)}
              />
            )}
            {procedure.raisonRejet && (
              <div className="col-span-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs text-red-500 font-medium mb-0.5">
                  Motif de rejet
                </p>
                <p className="text-sm text-red-700">{procedure.raisonRejet}</p>
              </div>
            )}
            {procedure.cancelledReason && (
              <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs text-orange-500 font-medium mb-0.5">
                  Raison d'annulation
                </p>
                <p className="text-sm text-orange-700">
                  {procedure.cancelledReason}
                </p>
              </div>
            )}
          </div>

          {/* steps */}
          {procedure.steps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Suivi des étapes
              </h3>
              <StepTimeline steps={procedure.steps} />
            </div>
          )}

          {/* overdue warning */}
          {procedure.isOverdue && procedure.statut === "IN_PROGRESS" && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Cette procédure est en retard ({procedure.daysSinceCreation}{" "}
                jours depuis la création).
              </p>
            </div>
          )}
        </div>

        {/* footer actions */}
        {procedure.canBeModified && (
          <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50">
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <Ban className="w-4 h-4" />
                Annuler cette procédure
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 text-center font-medium">
                  Confirmer l'annulation ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    Non
                  </button>
                  <button
                    disabled={cancelling}
                    onClick={() => onCancel(procedure.id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {cancelling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-slate-700 font-medium">{value}</div>
    </div>
  );
}

// ─── ProcedureCard ────────────────────────────────────────────────────────────

function ProcedureCard({
  procedure,
  onView,
}: {
  procedure: ProcedureResponseDto;
  onView: (p: ProcedureResponseDto) => void;
}) {
  return (
    <div
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200 overflow-hidden cursor-pointer active:scale-[0.99]"
      onClick={() => onView(procedure)}
    >
      {/* top accent line */}
      <div
        className={`h-1 w-full ${
          procedure.statut === "COMPLETED"
            ? "bg-emerald-400"
            : procedure.statut === "IN_PROGRESS"
              ? "bg-linear-to-r from-sky-400 to-blue-500"
              : procedure.statut === "REJECTED"
                ? "bg-red-400"
                : procedure.statut === "CANCELLED"
                  ? "bg-orange-400"
                  : "bg-slate-300"
        }`}
      />

      <div className="px-4 pt-3 pb-4">
        {/* header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {procedure.effectiveDestination}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {procedure.effectiveFiliere} · {procedure.effectiveNiveauEtude}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={procedure.statut} />
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
          </div>
        </div>

        {/* progress */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>
              {procedure.completedSteps}/{procedure.totalSteps} étapes
            </span>
            <span className="font-semibold text-sky-600">
              {procedure.progress}%
            </span>
          </div>
          <ProgressBar
            progress={procedure.progress}
            status={procedure.statut}
          />
        </div>

        {/* footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(procedure.createdAt)}</span>
          </div>
          {procedure.isOverdue && procedure.statut === "IN_PROGRESS" && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <AlertTriangle className="w-3 h-3" />
              En retard
            </span>
          )}
          {procedure.activeStep && (
            <span className="text-sky-500 font-medium truncate max-w-[120px]">
              {STEP_LABELS[procedure.activeStep] ?? procedure.activeStep}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-sky-300" />
      </div>
      <h3 className="font-semibold text-slate-700 mb-1">
        {hasFilters ? "Aucun résultat" : "Aucune procédure"}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs">
        {hasFilters
          ? "Essayez de modifier vos filtres pour trouver vos procédures."
          : "Vous n'avez pas encore de procédure en cours. Commencez par prendre un rendez-vous."}
      </p>
    </div>
  );
}

// ─── FilterSheet ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ProcedureStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminée" },
  { value: "REJECTED", label: "Rejetée" },
  { value: "CANCELLED", label: "Annulée" },
];

function FilterSheet({
  open,
  selectedStatus,
  onStatusChange,
  onClose,
}: {
  open: boolean;
  selectedStatus: ProcedureStatus | "ALL";
  onStatusChange: (s: ProcedureStatus | "ALL") => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 py-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-base">
            Filtrer par statut
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onStatusChange(opt.value);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${selectedStatus === opt.value ? "bg-sky-50 text-sky-700 border border-sky-200" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span>{opt.label}</span>
              {selectedStatus === opt.value && (
                <CheckCircle className="w-4 h-4 text-sky-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MaProcedures (main page) ─────────────────────────────────────────────────

export default function MaProcedures() {
  const { user } = useAuth();

  const {
    procedures,
    error,
    cancelProcedure,
    findByEmail,
    refresh,
    loading: { list: isLoading },
    overdue,
  } = useProcedures({
    autoLoad: false,
    refreshInterval: 30000,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProcedureStatus | "ALL">(
    "ALL",
  );
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureResponseDto | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Charger les procédures de l'utilisateur connecté
  useEffect(() => {
    if (user?.email) {
      findByEmail(user.email).catch((err) => {
        console.error("Erreur chargement procédures:", err);
      });
    }
  }, [user?.email, findByEmail]);

  // Filtrage local uniquement pour l'affichage UI
  const filtered = useMemo(() => {
    let list = [...procedures];

    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.statut === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.effectiveDestination.toLowerCase().includes(q) ||
          p.effectiveFiliere.toLowerCase().includes(q) ||
          p.effectiveNiveauEtude.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [procedures, statusFilter, search]);

  // Compteurs pour les statistiques
  const counts = useMemo(() => {
    const c: Partial<Record<ProcedureStatus | "ALL", number>> = {
      ALL: procedures.length,
    };
    for (const p of procedures) {
      c[p.statut] = (c[p.statut] ?? 0) + 1;
    }
    return c;
  }, [procedures]);

  const hasFilters = statusFilter !== "ALL" || search.trim().length > 0;

  const handleCancel = useCallback(
    async (id: string) => {
      setCancelling(true);
      try {
        const result = await cancelProcedure(
          id,
          "Annulation par l'utilisateur",
        );
        if (result) {
          setSelectedProcedure(result);
        }
      } catch (err) {
        console.error("Erreur annulation procédure:", err);
      } finally {
        setCancelling(false);
      }
    },
    [cancelProcedure],
  );

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      console.error("Erreur rafraîchissement:", err);
    }
  }, [refresh]);

  const pageConfig = pageConfigs["/mes-procedures"];

  return (
    <>
      <Helmet>
        <title>{pageConfig?.title ?? "Mes Procédures"}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 pb-20 mt-35">
        {/* Page hero */}
        <div className="bg-linear-to-br from-sky-500 via-sky-600 to-blue-700 px-5 pt-8 pb-6">
          <div className="mb-4">
            <p className="text-sky-200 text-xs font-medium uppercase tracking-widest">
              Tableau de bord
            </p>
            <h1 className="text-white text-2xl font-bold mt-0.5 leading-tight">
              Mes procédures
            </h1>
            {user?.firstName && (
              <p className="text-sky-100 text-sm mt-1">
                Bonjour, {user.firstName}
              </p>
            )}
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-2">
            <StatPill
              label="Total"
              value={procedures.length}
              accent="bg-white/20"
            />
            <StatPill
              label="En cours"
              value={counts.IN_PROGRESS ?? 0}
              accent="bg-white/20"
            />
            <StatPill
              label="Terminées"
              value={counts.COMPLETED ?? 0}
              accent="bg-white/20"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatPill
              label="En retard"
              value={overdue?.length ?? 0}
              accent="bg-amber-500/20"
            />
            <StatPill
              label="En attente"
              value={counts.PENDING ?? 0}
              accent="bg-yellow-500/20"
            />
            <StatPill
              label="Annulées"
              value={counts.CANCELLED ?? 0}
              accent="bg-red-500/20"
            />
          </div>
        </div>

        <div className="px-4 -mt-3">
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Destination, filière…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0
                ${statusFilter !== "ALL" ? "bg-sky-500 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Filtrer</span>
              {statusFilter !== "ALL" && (
                <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Chips de statut */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
            {STATUS_OPTIONS.map((opt) => {
              const count = counts[opt.value] ?? 0;
              const active = statusFilter === opt.value;
              if (opt.value !== "ALL" && count === 0) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${active ? "bg-sky-500 text-white shadow-sm shadow-sky-200" : "bg-white text-slate-500 border border-slate-200 hover:border-sky-300 hover:text-sky-600"}`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contenu */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm text-slate-600">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-sky-600 text-sm font-medium underline underline-offset-2"
              >
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              <div className="space-y-3">
                {filtered.map((p) => (
                  <ProcedureCard
                    key={p.id}
                    procedure={p}
                    onView={setSelectedProcedure}
                  />
                ))}
              </div>

              {/* Compteur de résultats */}
              <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pb-2">
                <span>
                  {filtered.length} procédure{filtered.length > 1 ? "s" : ""}
                </span>
                {hasFilters && (
                  <span> trouvée{filtered.length > 1 ? "s" : ""}</span>
                )}
                {filtered.length > 0 && (
                  <span>
                    •{" "}
                    {Math.round(
                      (filtered.filter((p) => p.statut === "COMPLETED").length /
                        filtered.length) *
                        100,
                    )}
                    % terminées
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de détail */}
      {selectedProcedure && (
        <ProcedureDetailModal
          procedure={selectedProcedure}
          onClose={() => setSelectedProcedure(null)}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}

      {/* Filtre sheet */}
      <FilterSheet
        open={filterOpen}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        onClose={() => setFilterOpen(false)}
      />
    </>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`${accent} rounded-xl px-3 py-2.5 text-center`}>
      <p className="text-white text-lg font-bold leading-none">{value}</p>
      <p className="text-sky-100 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
