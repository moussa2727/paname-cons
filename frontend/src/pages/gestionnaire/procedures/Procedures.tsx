import { useState, useMemo, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import React from "react";
import {
  Search,
  Filter,
  X,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useProcedures } from "../../../hooks/useProcedures";
import { useAuth } from "../../../hooks/useAuth";
import type {
  ProcedureStatus,
  SortOrder,
  ExportFormat,
  ProcedureResponseDto,
} from "../../../types/procedures.types";
import { ProceduresService } from "../../../services/procedures.service";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProcedureStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "En attente",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: <Clock size={12} />,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "text-sky-600",
    bg: "bg-sky-50 border-sky-200",
    icon: <TrendingUp size={12} />,
  },
  COMPLETED: {
    label: "Complétée",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 size={12} />,
  },
  REJECTED: {
    label: "Rejetée",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle size={12} />,
  },
  CANCELLED: {
    label: "Annulée",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200",
    icon: <AlertCircle size={12} />,
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  sub,
  accent = "sky",
}) => (
  <div className="bg-white rounded border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p
          className={`text-2xl sm:text-3xl font-bold text-${accent}-600 leading-none`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded bg-${accent}-50 text-${accent}-500`}>
        {icon}
      </div>
    </div>
  </div>
);

// ─── Badge de statut ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ProcedureStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-slate-100 rounded overflow-hidden">
      <div
        className="h-full bg-sky-500 rounded transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-xs text-slate-500 w-8 text-right">{value}%</span>
  </div>
);

// ─── Confirmation modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  loading,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-50 rounded">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {loading ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Procedure Row ────────────────────────────────────────────────────────────

interface ProcedureRowProps {
  procedure: ProcedureResponseDto;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProcedureRow: React.FC<ProcedureRowProps> = ({
  procedure,
  onView,
  onEdit,
  onDelete,
}) => {
  const createdAt = new Date(procedure.createdAt);
  const dateStr = createdAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <tr className="group hover:bg-sky-50/40 transition-colors border-b border-slate-100 last:border-0">
      {/* Candidat */}
      <td className="px-4 py-3">
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            {procedure.fullName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{procedure.email}</p>
        </div>
      </td>
      {/* Destination / Filière */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <Globe size={10} className="text-sky-500" />
            {procedure.effectiveDestination}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <BookOpen size={10} />
            {procedure.effectiveFiliere}
          </span>
        </div>
      </td>
      {/* Statut */}
      <td className="px-4 py-3">
        <StatusBadge status={procedure.statut} />
      </td>
      {/* Progression */}
      <td className="px-4 py-3 hidden md:table-cell min-w-[120px]">
        <ProgressBar value={procedure.progress} />
      </td>
      {/* Date */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Calendar size={10} />
          {dateStr}
        </span>
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(procedure.id)}
            title="Voir les détails"
            className="p-1.5 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-100 transition-colors"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => onEdit(procedure.id)}
            title="Modifier"
            className="p-1.5 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-100 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(procedure.id)}
            title="Supprimer"
            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Mobile card ──────────────────────────────────────────────────────────────

const ProcedureCard: React.FC<ProcedureRowProps> = ({
  procedure,
  onView,
  onEdit,
  onDelete,
}) => {
  const dateStr = new Date(procedure.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            {procedure.fullName}
          </p>
          <p className="text-xs text-slate-400">{procedure.email}</p>
        </div>
        <StatusBadge status={procedure.statut} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Globe size={10} className="text-sky-500" />
          {procedure.effectiveDestination}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={10} />
          {procedure.effectiveFiliere}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {dateStr}
        </span>
      </div>
      <ProgressBar value={procedure.progress} />
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={() => onView(procedure.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-sky-50 text-sky-600 text-xs font-medium hover:bg-sky-100 transition-colors"
        >
          <Eye size={13} /> Voir
        </button>
        <button
          onClick={() => onEdit(procedure.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-sky-50 text-sky-600 text-xs font-medium hover:bg-sky-100 transition-colors"
        >
          <Pencil size={13} /> Modifier
        </button>
        <button
          onClick={() => onDelete(procedure.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function Procedures() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [exporting, setExporting] = useState(false);

  const {
    procedures,
    statistics,
    loading,
    error,
    query,
    pagination,
    setQuery,
    setPage,
    setLimit,
    remove,
    refresh,
  } = useProcedures({
    autoLoad: true,
    shouldLoadStatistics: true,
    initialQuery: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
  });

  // ── Navigation ──────────────────────────────────────────────────────────

  const handleViewDetails = useCallback(
    (id: string) => navigate(`/gestionnaire/procedures/${id}`),
    [navigate],
  );

  const handleEdit = useCallback(
    (id: string) => navigate(`/gestionnaire/procedures/${id}`),
    [navigate],
  );

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmModal({ open: true, id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmModal.id) return;
    await remove(confirmModal.id);
    setConfirmModal({ open: false, id: null });
  }, [confirmModal.id, remove]);

  // ── Export ──────────────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(true);
      try {
        const blob = await ProceduresService.exportProcedures(format, query);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `procedures.${format === "excel" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setExporting(false);
      }
    },
    [query],
  );

  // ── Filtres locaux ──────────────────────────────────────────────────────

  const [localSearch, setLocalSearch] = useState(query.search ?? "");
  const [localStatus, setLocalStatus] = useState<ProcedureStatus | "">(
    (query.status as ProcedureStatus) ?? "",
  );

  const handleApplyFilters = useCallback(() => {
    setQuery({
      search: localSearch || undefined,
      status: localStatus ? (localStatus as ProcedureStatus) : undefined,
      page: 1,
    });
    setShowFilters(false);
  }, [localSearch, localStatus, setQuery]);

  const handleResetFilters = useCallback(() => {
    setLocalSearch("");
    setLocalStatus("");
    setQuery({ search: undefined, status: undefined, page: 1 });
    setShowFilters(false);
  }, [setQuery]);

  // ── Stats résumées ──────────────────────────────────────────────────────

  const statsCards = useMemo(() => {
    if (!statistics) return [];
    return [
      {
        label: "Total",
        value: statistics.total,
        icon: <Users size={18} />,
        sub: `+${statistics.newProcedures.thisMonth} ce mois`,
        accent: "sky",
      },
      {
        label: "En cours",
        value: statistics.byStatus?.IN_PROGRESS ?? 0,
        icon: <TrendingUp size={18} />,
        sub: `Taux complétion ${statistics.completionRate.toFixed(0)}%`,
        accent: "sky",
      },
      {
        label: "Complétées",
        value: statistics.byStatus?.COMPLETED ?? 0,
        icon: <CheckCircle2 size={18} />,
        sub: `Moy. ${statistics.averageCompletionTime}j`,
        accent: "emerald",
      },
      {
        label: "Rejetées",
        value: statistics.byStatus?.REJECTED ?? 0,
        icon: <XCircle size={18} />,
        sub: `Taux ${statistics.rejectionRate.toFixed(0)}%`,
        accent: "red",
      },
    ];
  }, [statistics]);

  // ─────────────────────────────────────────────────────────────────────────

  // Debug pour vérifier les données
  useEffect(() => {
    console.log("🔍 Procedures state:", {
      procedures,
      loading,
      error,
      pagination,
      statistics,
      query,
      user,
      isAdmin,
    });
  }, [procedures, loading, error, pagination, statistics, query, user, isAdmin]);

  return (
    <>
      <Helmet>
        <title>Gestion Des Procédures - Paname Consulting</title>
        <meta
          name="description"
          content="Gestion des procédures d'immigration"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen pb-16">
        {/* ── Header ── */}
        <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-sky-600 rounded">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-none">
                    Procédures
                  </h1>
                  
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refresh()}
                  disabled={loading.list}
                  title="Rafraîchir"
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    size={15}
                    className={loading.list ? "animate-spin" : ""}
                  />
                </button>

                {/* Export dropdown */}
                <div className="relative group">
                  <button
                    disabled={exporting}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors disabled:opacity-60"
                  >
                    <Download size={13} />
                    {exporting ? "Export…" : "Exporter"}
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg py-1 hidden group-hover:block min-w-[120px] z-10">
                    {(["csv", "excel", "pdf"] as ExportFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => handleExport(f)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-sky-50 hover:text-sky-600 capitalize"
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
          {/* ── Stats ── */}
          {statistics && (
            <section>
              <button
                onClick={() => setShowStats((v) => !v)}
                className="flex items-center gap-2 text-xs text-slate-400 mb-3 hover:text-sky-600 transition-colors"
              >
                <BarChart3 size={12} />
                Statistiques
                {showStats ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              {showStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statsCards.map((s) => (
                    <StatCard key={s.label} {...s} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Toolbar ── */}
          <div className="bg-white rounded border border-slate-100 shadow-sm p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Rechercher (nom, email…)"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded border border-slate-200 focus:outline-none focus:ring-none focus:border-sky-400 placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-2">
                {/* Status quick filter */}
                <select
                  value={localStatus}
                  onChange={(e) =>
                    setLocalStatus(e.target.value as ProcedureStatus | "")
                  }
                  className="flex-1 sm:flex-none text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-none focus:border-sky-400 bg-white text-slate-600"
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                {/* More filters */}
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded border text-sm font-medium transition-colors ${
                    showFilters
                      ? "bg-sky-600 text-white border-sky-600"
                      : "border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600"
                  }`}
                >
                  <Filter size={13} />
                  <span className="hidden sm:inline">Filtres</span>
                </button>

                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700 transition-colors"
                >
                  <span className="hidden sm:inline">Appliquer</span>
                  <Search size={14} className="sm:hidden" />
                </button>
              </div>
            </div>

            {/* Extended filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Trier par
                    </label>
                    <select
                      value={query.sortBy ?? "createdAt"}
                      onChange={(e) =>
                        setQuery({ sortBy: e.target.value, page: 1 })
                      }
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-none focus:border-sky-400 bg-white"
                    >
                      <option value="createdAt">Date de création</option>
                      <option value="updatedAt">Dernière maj</option>
                      <option value="nom">Nom</option>
                      <option value="statut">Statut</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Ordre
                    </label>
                    <select
                      value={query.sortOrder ?? "desc"}
                      onChange={(e) =>
                        setQuery({
                          sortOrder: e.target.value as SortOrder,
                          page: 1,
                        })
                      }
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-none focus:border-sky-400 bg-white"
                    >
                      <option value="desc">Décroissant</option>
                      <option value="asc">Croissant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Par page
                    </label>
                    <select
                      value={query.limit ?? 10}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-none focus:border-sky-400 bg-white"
                    >
                      {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} /> Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded p-4 text-sm text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* ── Table desktop / Cards mobile ── */}
          <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden">
            {/* Header info */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                {loading.list ? (
                  "Chargement…"
                ) : (
                  <>
                    <span className="font-semibold text-slate-700">
                      {pagination.total}
                    </span>{" "}
                    procédure{pagination.total !== 1 ? "s" : ""}
                  </>
                )}
              </p>
              {pagination.totalPages > 1 && (
                <p className="text-xs text-slate-400">
                  Page {pagination.page}/{pagination.totalPages}
                </p>
              )}
            </div>

            {/* Loading skeleton */}
            {loading.list && (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-100 rounded animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading.list && procedures.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <AlertCircle className="mx-auto mb-3 opacity-40" size={36} />
                <p className="text-sm">Aucune procédure trouvée</p>
              </div>
            )}

            {/* Desktop table */}
            {!loading.list && procedures.length > 0 && (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        {[
                          "Candidat",
                          "Destination / Filière",
                          "Statut",
                          "Progression",
                          "Créée le",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {procedures.map((p) => (
                        <ProcedureRow
                          key={p.id}
                          procedure={p}
                          onView={handleViewDetails}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-3 space-y-3">
                  {procedures.map((p) => (
                    <ProcedureCard
                      key={p.id}
                      procedure={p}
                      onView={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={!pagination.hasPrevious || loading.list}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} /> Préc.
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) })
                    .map((_, i) => {
                      const p = pagination.page;
                      const t = pagination.totalPages;
                      let page: number;
                      if (t <= 5) {
                        page = i + 1;
                      } else if (p <= 3) {
                        page = i + 1;
                      } else if (p >= t - 2) {
                        page = t - 4 + i;
                      } else {
                        page = p - 2 + i;
                      }
                      return page;
                    })
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => setPage(page)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          page === pagination.page
                            ? "bg-sky-600 text-white"
                            : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading.list}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suiv. <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* ── Top destinations & filières ── */}
          {statistics &&
            (statistics.topDestinations?.length > 0 ||
              statistics.topFilieres?.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {statistics.topDestinations?.length > 0 && (
                  <div className="bg-white rounded border border-slate-100 shadow-sm p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Globe size={12} className="text-sky-500" />
                      Top destinations
                    </h3>
                    <div className="space-y-2">
                      {statistics.topDestinations.slice(0, 5).map((d) => (
                        <div
                          key={d.destination}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-slate-600 truncate max-w-[70%]">
                            {d.destination}
                          </span>
                          <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                            {d.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {statistics.topFilieres?.length > 0 && (
                  <div className="bg-white rounded border border-slate-100 shadow-sm p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-sky-500" />
                      Top filières
                    </h3>
                    <div className="space-y-2">
                      {statistics.topFilieres.slice(0, 5).map((f) => (
                        <div
                          key={f.filiere}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-slate-600 truncate max-w-[70%]">
                            {f.filiere}
                          </span>
                          <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                            {f.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* ── Confirm delete modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        title="Supprimer la procédure"
        description="Cette action est irréversible. La procédure sera définitivement supprimée."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmModal({ open: false, id: null })}
        loading={loading.delete}
      />
    </>
  );
}