import { useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import React from "react";
import {
  Search,
  Filter,
  X,
  Eye,
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
  ArrowRight,
} from "lucide-react";
import { useProcedures } from "../../../hooks/useProcedures";
import {
  type ProcedureResponseDto,
  type ProcedureStatus,
  type SortOrder,
  type ExportFormat,
} from "../../../types/procedures.types";

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

// ─── Procedure Row ────────────────────────────────────────────────────────────

interface ProcedureRowProps {
  procedure: ProcedureResponseDto;
  onView: (id: string) => void;
}

const ProcedureRow: React.FC<ProcedureRowProps> = ({ procedure, onView }) => {
  const dateStr = new Date(procedure.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <tr
      className="group hover:bg-sky-50/40 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
      onClick={() => onView(procedure.id)}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            {procedure.fullName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{procedure.email}</p>
        </div>
      </td>
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
      <td className="px-4 py-3">
        <StatusBadge status={procedure.statut} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell min-w-[120px]">
        <ProgressBar value={procedure.progress} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Calendar size={10} />
          {dateStr}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(procedure.id);
          }}
          title="Voir les détails"
          className="p-1.5 rounded text-slate-300 group-hover:text-sky-600 group-hover:bg-sky-100 transition-colors"
        >
          <ArrowRight size={15} />
        </button>
      </td>
    </tr>
  );
};

// ─── Mobile card ──────────────────────────────────────────────────────────────

const ProcedureCard: React.FC<ProcedureRowProps> = ({ procedure, onView }) => {
  const dateStr = new Date(procedure.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="bg-white rounded border border-slate-100 p-4 shadow-sm cursor-pointer hover:border-sky-200 hover:shadow-md transition-all"
      onClick={() => onView(procedure.id)}
    >
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
      <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(procedure.id);
          }}
          className="flex items-center gap-1.5 py-2 px-3 rounded bg-sky-50 text-sky-600 text-xs font-medium hover:bg-sky-100 transition-colors"
        >
          <Eye size={13} /> Voir le détail
        </button>
      </div>
    </div>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function Procedures() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Hook unique ── TOUTE la logique est ici
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
    refresh,
    loadStatistics,
    applyFilters,
    resetFilters,
    exportProcedures,
  } = useProcedures();

  // ── Navigation vers la page détail ──────────────────────────────────────
  const handleViewDetails = useCallback(
    (id: string) => navigate(`/gestionnaire/procedures/${id}`),
    [navigate],
  );

  // ── Rafraîchissement manuel des stats ───────────────────────────────────
  const handleRefreshStats = useCallback(() => {
    loadStatistics();
  }, [loadStatistics]);

  // ── Export ──────────────────────────────────────────────────────────────
  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(true);
      try {
        const blob = await exportProcedures(format);
        if (!blob) {
          console.error("Export failed: no data received");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `procedures.${format === "excel" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setExporting(false);
      }
    },
    [exportProcedures],
  );

  // ── Gestion des filtres via le hook ─────────────────────────────────────
  const handleStatusFilter = useCallback(
    (status: ProcedureStatus | "") => {
      if (status) {
        setQuery({ status, page: 1 });
      } else {
        // ✅ Créer un nouvel objet sans la propriété status
        const newQuery = { ...query };
        delete newQuery.status;
        setQuery({ ...newQuery, page: 1 });
      }
      setShowFilters(false);
    },
    [query, setQuery],
  );

  const handleSearchFilter = useCallback(
    (search: string) => {
      setQuery({ search: search || undefined, page: 1 });
    },
    [setQuery],
  );

  const handleApplyFilters = useCallback(() => {
    applyFilters();
    setShowFilters(false);
  }, [applyFilters]);

  const handleResetAllFilters = useCallback(() => {
    resetFilters();
    setShowFilters(false);
  }, [resetFilters]);

  // ── Stats cards ──────────────────────────────────────────────────────────
  const statsCards = useMemo(() => {
    if (!statistics) return [];

    return [
      {
        label: "Total",
        value: statistics.total ?? 0,
        icon: <Users size={18} />,
        sub: `+${statistics.newProcedures?.thisMonth ?? 0} ce mois`,
        accent: "sky",
      },
      {
        label: "En cours",
        value: statistics.byStatus?.IN_PROGRESS ?? 0,
        icon: <TrendingUp size={18} />,
        sub: `Taux complétion ${(statistics.completionRate ?? 0).toFixed(0)}%`,
        accent: "sky",
      },
      {
        label: "Complétées",
        value: statistics.byStatus?.COMPLETED ?? 0,
        icon: <CheckCircle2 size={18} />,
        sub: `Moy. ${statistics.averageCompletionTime ?? 0}j`,
        accent: "emerald",
      },
      {
        label: "En attente",
        value: statistics.byStatus?.PENDING ?? 0,
        icon: <Clock size={18} />,
        sub: `+${statistics.newProcedures?.thisWeek ?? 0} cette semaine`,
        accent: "amber",
      },
      {
        label: "Rejetées",
        value: statistics.byStatus?.REJECTED ?? 0,
        icon: <XCircle size={18} />,
        sub: `Taux ${(statistics.rejectionRate ?? 0).toFixed(0)}%`,
        accent: "red",
      },
    ];
  }, [statistics]);

  // ── Valeurs actuelles des filtres pour l'UI ─────────────────────────────
  const currentSearch = query.search ?? "";
  const currentStatus = query.status ?? "";

  // ── Helper pour générer les numéros de page sans ESLint warning ─────────
  const getPageNumbers = useCallback(() => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return Array.from(
        { length: maxVisible },
        (_, i) => totalPages - maxVisible + i + 1,
      );
    }

    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  }, [pagination]);

  // ─────────────────────────────────────────────────────────────────────────

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
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-none">
                  Procédures
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Rafraîchir tout */}
                <button
                  onClick={() => refresh()}
                  disabled={loading.list || loading.statistics}
                  title="Rafraîchir"
                  className="p-2 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    size={15}
                    className={
                      loading.list || loading.statistics ? "animate-spin" : ""
                    }
                  />
                </button>

                {/* Rafraîchir uniquement les stats */}
                <button
                  onClick={handleRefreshStats}
                  disabled={loading.statistics}
                  title="Rafraîchir les stats"
                  className="hidden sm:flex p-2 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                >
                  <BarChart3
                    size={14}
                    className={loading.statistics ? "animate-spin" : ""}
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
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded shadow-lg py-1 hidden group-hover:block min-w-[120px] z-10">
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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
              {/* Search - utilise le hook directement */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Rechercher (nom, email…)"
                  value={currentSearch}
                  onChange={(e) => handleSearchFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded border border-slate-200 focus:outline-none focus:border-sky-400 placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-2">
                {/* Status quick filter - utilise le hook directement */}
                <select
                  value={currentStatus}
                  onChange={(e) =>
                    handleStatusFilter(e.target.value as ProcedureStatus | "")
                  }
                  className="flex-1 sm:flex-none text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white text-slate-600"
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                {/* More filters - utilise le hook pour applyFilters */}
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

            {/* Extended filters - utilise setQuery directement */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Trier par
                    </label>
                    <select
                      value={query.sortBy ?? "createdAt"}
                      onChange={(e) =>
                        setQuery({ sortBy: e.target.value, page: 1 })
                      }
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white"
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
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white"
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
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Inclure terminées
                    </label>
                    <select
                      value={query.includeCompleted ? "true" : "false"}
                      onChange={(e) =>
                        setQuery({
                          includeCompleted: e.target.value === "true",
                          page: 1,
                        })
                      }
                      className="w-full text-sm rounded border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400 bg-white"
                    >
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleResetAllFilters}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} /> Réinitialiser tous les filtres
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
                      {pagination?.total ?? 0}
                    </span>{" "}
                    procédure{(pagination?.total ?? 0) !== 1 ? "s" : ""}
                  </>
                )}
              </p>
              {pagination && pagination.totalPages > 1 && (
                <p className="text-xs text-slate-400">
                  Page {pagination.page}/{pagination.totalPages}
                </p>
              )}
            </div>

            {/* Loading skeleton */}
            {loading.list && (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 bg-slate-100 rounded animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading.list && (!Array.isArray(procedures) || procedures.length === 0) && (
              <div className="text-center py-16 text-slate-400">
                <AlertCircle className="mx-auto mb-3 opacity-40" size={36} />
                <p className="text-sm">Aucune procédure trouvée</p>
                {(currentSearch || currentStatus) && (
                  <button
                    onClick={handleResetAllFilters}
                    className="mt-3 text-xs text-sky-600 hover:text-sky-700"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}

            {/* Desktop table */}
            {!loading.list && Array.isArray(procedures) && procedures.length > 0 && (
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
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                          >
                            {header}
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
                    />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={!pagination.hasPrevious || loading.list}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} /> Préc.
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page) => (
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

          {/* ── Top destinations & filières & steps analytics ── */}
          {statistics && !loading.statistics && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Top destinations - only if exists and has data */}
              {statistics.topDestinations &&
                statistics.topDestinations.length > 0 && (
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

              {/* Top filières - only if exists and has data */}
              {statistics.topFilieres && statistics.topFilieres.length > 0 && (
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

              {/* Stats additionnelles - always show if statistics exists */}
              <div className="bg-white rounded border border-slate-100 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-slate-500" />
                  Autres stats
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Procédures annulées
                    </span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      {statistics.byStatus?.CANCELLED ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Nouvelles aujourd'hui
                    </span>
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {statistics.newProcedures?.today ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Nouvelles cette semaine
                    </span>
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {statistics.newProcedures?.thisWeek ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Nouvelles ce mois
                    </span>
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {statistics.newProcedures?.thisMonth ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Taux de réussite
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {(statistics.completionRate ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Temps moyen de complétion
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {statistics.averageCompletionTime ?? 0} jours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
