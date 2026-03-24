import { useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useProcedures } from "../../../hooks/useProcedures";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/shared/admin/Loader";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import type {
  ProcedureStatus,
  SortOrder,
  StepName,
  ExportFormat,
} from "../../../types/procedures.types";
import {
  Search,
  Edit2,
  Trash2,
  Eye,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { ProceduresService } from "../../../services/procedures.service";
import type { JSX } from "react/jsx-runtime";
// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ProcedureStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminé" },
  { value: "REJECTED", label: "Rejeté" },
  { value: "CANCELLED", label: "Annulé" },
];

const STEP_LABELS: Record<StepName, string> = {
  DEMANDE_ADMISSION: "Demande d'admission",
  ENTRETIEN_MOTIVATION: "Entretien de motivation",
  DEMANDE_VISA: "Demande de visa",
  PREPARATIF_VOYAGE: "Préparatifs voyage",
};

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Plus récent" },
  { value: "createdAt-asc", label: "Plus ancien" },
  { value: "nom-asc", label: "Nom (A-Z)" },
  { value: "nom-desc", label: "Nom (Z-A)" },
  { value: "destination-asc", label: "Destination (A-Z)" },
  { value: "progress-desc", label: "Progression" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusBadge = (status: ProcedureStatus) => {
  const styles: Record<ProcedureStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const icons: Record<ProcedureStatus, JSX.Element> = {
    PENDING: <AlertCircle className="w-4 h-4" />,
    IN_PROGRESS: <Clock className="w-4 h-4" />,
    COMPLETED: <CheckCircle className="w-4 h-4" />,
    REJECTED: <XCircle className="w-4 h-4" />,
    CANCELLED: <Ban className="w-4 h-4" />,
  };

  const labels: Record<ProcedureStatus, string> = {
    PENDING: "En attente",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
    REJECTED: "Rejeté",
    CANCELLED: "Annulé",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {icons[status]}
      {labels[status]}
    </span>
  );
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Composant principal ─────────────────────────────────────────────────────

const Procedures = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // ─── Hook useProcedures (uniquement méthodes admin) ─────────────────────
  const {
    // Données
    procedures,
    pagination,
    statistics,
    error,
    query,
    overdue,

    // États de chargement
    loading: { list: loading, delete: loadingDelete, statistics: loadingStats },

    // Méthodes admin uniquement
    remove, // DELETE /admin/procedures/:id/delete
    setQuery, // Met à jour les query params
    resetFilters, // Réinitialise tous les filtres
    setPage, // Change la page
    setLimit, // Change la limite par page
    refresh, // Recharge les données
  } = useProcedures({
    autoLoad: true,
    shouldLoadStatistics: isAdmin,
    refreshInterval: 30000, // Rafraîchissement auto toutes les 30s
    initialQuery: {
      sortBy: "createdAt",
      sortOrder: "desc" as SortOrder,
      limit: 10,
      page: 1,
      includeDeleted: false, // Par défaut, on exclut les supprimés
    },
  });

  // Debug pour voir les statistiques
  console.log("Statistics:", statistics);

  // ─── Données pour les filtres (depuis les stats du backend) ────────────
  const destinations = useMemo(() => {
    if (statistics?.topDestinations) {
      return statistics.topDestinations.map((d) => d.destination).sort();
    }
    return [];
  }, [statistics]);

  const filieres = useMemo(() => {
    if (statistics?.topFilieres) {
      return statistics.topFilieres.map((f) => f.filiere).sort();
    }
    return [];
  }, [statistics]);

  // ─── Handlers pour les filtres (délégation totale au hook) ─────────────
  const handleSearch = useCallback(
    (term: string) => {
      setQuery({ search: term || undefined, page: 1 });
    },
    [setQuery],
  );

  const handleStatusFilter = useCallback(
    (status: string) => {
      setQuery({
        status: status === "ALL" ? undefined : (status as ProcedureStatus),
        page: 1,
      });
    },
    [setQuery],
  );

  const handleDestinationFilter = useCallback(
    (destination: string) => {
      setQuery({
        destination: destination === "ALL" ? undefined : destination,
        page: 1,
      });
    },
    [setQuery],
  );

  const handleFiliereFilter = useCallback(
    (filiere: string) => {
      setQuery({
        filiere: filiere === "ALL" ? undefined : filiere,
        page: 1,
      });
    },
    [setQuery],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortOrder] = value.split("-") as [string, SortOrder];
      setQuery({ sortBy, sortOrder, page: 1 });
    },
    [setQuery],
  );

  const handleIncludeCompleted = useCallback(
    (include: boolean) => {
      setQuery({ includeCompleted: include, page: 1 });
    },
    [setQuery],
  );

  const handleIncludeDeleted = useCallback(
    (include: boolean) => {
      setQuery({ includeDeleted: include, page: 1 });
    },
    [setQuery],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // ─── Handlers pour la pagination ───────────────────────────────────────
  const handlePageChange = useCallback(
    (pageNum: number) => {
      setPage(pageNum);
    },
    [setPage],
  );

  const handleLimitChange = useCallback(
    (limit: number) => {
      setLimit(limit);
    },
    [setLimit],
  );

  // ─── Handlers pour les actions ─────────────────────────────────────────
  const handleViewDetails = useCallback(
    (id: string) => {
      navigate(`/gestionnaire/procedures/${id}`);
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigate(`/gestionnaire/procedures/${id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback((id: string) => {
    setConfirmModal({ open: true, id });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (confirmModal.id) {
      try {
        await remove(confirmModal.id, "Suppression par l'administrateur");
        setConfirmModal({ open: false, id: null });
      } catch (err) {
        console.error("Erreur suppression:", err);
        setConfirmModal({ open: false, id: null });
      }
    }
  }, [confirmModal.id, remove]);

  const handleCancelDelete = useCallback(() => {
    setConfirmModal({ open: false, id: null });
  }, []);

  // ─── Export des données (utilise le service d'export) ───────────────────
  const handleExport = useCallback(
    async (format: ExportFormat = "excel") => {
      try {
        // Récupérer les query params actuels du hook
        const blob = await ProceduresService.exportProcedures(format, query);

        // Créer le lien de téléchargement
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `procedures-${new Date().toISOString().split("T")[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erreur export:", err);
      }
    },
    [query],
  );

  // ─── Vérification des permissions ──────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-red-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette
            page.
          </p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = !!(
    query.search ||
    query.status ||
    query.destination ||
    query.filiere
  );

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

      <div className="p-4 md:p-6 lg:p-8">
        {/* ─── Header ───────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gestion des procédures
            </h1>
            <p className="text-gray-600">
              {pagination?.total
                ? `${pagination.total} procédure${pagination.total > 1 ? "s" : ""} au total`
                : "Gérez les procédures en cours et en attente"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading || loadingStats}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading || loadingStats ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtres {hasActiveFilters && "(actifs)"}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Effacer
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* ─── Statistiques (depuis le hook) ────────────────────────────── */}
        {loadingStats ? (
          <div className="mb-6 p-8 bg-gray-50 rounded-lg text-center">
            <Loader loading={true} size="md" />
          </div>
        ) : (
          statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.total}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En cours</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.byStatus?.IN_PROGRESS ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Terminées</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.byStatus?.COMPLETED ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Taux complétion</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {!isAdmin
                        ? "N/A"
                        : loadingStats
                          ? "..."
                          : statistics
                            ? Math.round(statistics.completionRate)
                            : 0}
                      %
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {statistics.byStatus?.PENDING ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rejetées</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statistics.byStatus?.REJECTED ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Annulées</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {statistics.byStatus?.CANCELLED ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Ban className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En retard</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {overdue?.length ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* ─── Panneau de filtres ───────────────────────────────────────── */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email, destination..."
                    value={query.search || ""}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtre statut */}
              <div className="w-full lg:w-48">
                <select
                  value={query.status || "ALL"}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre destination */}
              <div className="w-full lg:w-48">
                <select
                  value={query.destination || "ALL"}
                  onChange={(e) => handleDestinationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={destinations.length === 0}
                >
                  <option value="ALL">Toutes destinations</option>
                  {destinations.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre filière */}
              <div className="w-full lg:w-48">
                <select
                  value={query.filiere || "ALL"}
                  onChange={(e) => handleFiliereFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={filieres.length === 0}
                >
                  <option value="ALL">Toutes filières</option>
                  {filieres.map((filiere) => (
                    <option key={filiere} value={filiere}>
                      {filiere}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tri */}
              <div className="w-full lg:w-48">
                <select
                  value={`${query.sortBy}-${query.sortOrder}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inclure terminées */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCompleted"
                  checked={query.includeCompleted || false}
                  onChange={(e) => handleIncludeCompleted(e.target.checked)}
                  className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                />
                <label
                  htmlFor="includeCompleted"
                  className="text-sm text-gray-700"
                >
                  Inclure terminées
                </label>
              </div>

              {/* Inclure supprimés */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeDeleted"
                  checked={query.includeDeleted || false}
                  onChange={(e) => handleIncludeDeleted(e.target.checked)}
                  className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                />
                <label
                  htmlFor="includeDeleted"
                  className="text-sm text-gray-700"
                >
                  Inclure supprimés
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tableau des procédures ───────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination / Filière
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progression
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!loading && !error && procedures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">
                          Aucune procédure trouvée
                        </p>
                        <p className="text-sm">
                          {hasActiveFilters
                            ? "Essayez de modifier vos filtres de recherche"
                            : "Aucune procédure n'a encore été créée"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-red-500">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <p className="text-lg font-medium mb-2">
                          Erreur de chargement
                        </p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                          onClick={handleRefresh}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          Réessayer
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : procedures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">
                          Aucune procédure trouvée
                        </p>
                        <p className="text-sm">
                          {hasActiveFilters
                            ? "Essayez de modifier vos filtres de recherche"
                            : "Aucune procédure n'a encore été créée"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  procedures.map((procedure) => (
                    <tr key={procedure.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {procedure.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {procedure.email}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            ID:{" "}
                            {procedure.id ? procedure.id.slice(0, 8) : "N/A"}...
                          </div>
                          {procedure.isDeleted && (
                            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              Supprimé
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900 font-medium">
                          {procedure.effectiveDestination}
                        </div>
                        <div className="text-sm text-gray-500">
                          {procedure.effectiveFiliere}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {procedure.effectiveNiveauEtude}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(procedure.statut)}
                        {procedure.cancelledAt && (
                          <div className="text-xs text-orange-500 mt-1">
                            {formatDate(procedure.cancelledAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900">
                          {formatDate(procedure.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {procedure.daysSinceCreation !== undefined
                            ? `Il y a ${procedure.daysSinceCreation} jour${procedure.daysSinceCreation > 1 ? "s" : ""}`
                            : ""}
                        </div>
                        {procedure.isOverdue && (
                          <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            En retard
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  procedure.statut === "COMPLETED"
                                    ? "bg-emerald-500"
                                    : procedure.statut === "REJECTED" ||
                                        procedure.statut === "CANCELLED"
                                      ? "bg-red-400"
                                      : "bg-sky-600"
                                }`}
                                style={{
                                  width: `${procedure.progress || 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {procedure.progress || 0}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {procedure.completedSteps}/{procedure.totalSteps}{" "}
                            étapes
                          </div>
                          {procedure.activeStep && (
                            <div className="text-xs text-sky-600">
                              {STEP_LABELS[procedure.activeStep] ??
                                procedure.activeStep.replace(/_/g, " ")}
                            </div>
                          )}
                          {procedure.dateCompletion && (
                            <div className="text-xs text-green-600">
                              Complété: {formatDate(procedure.dateCompletion)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(procedure.id)}
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(procedure.id)}
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            title="Modifier"
                            disabled={procedure.isDeleted}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            onClick={() => handleDelete(procedure.id)}
                            disabled={loadingDelete || procedure.isDeleted}
                            title={
                              procedure.isDeleted
                                ? "Déjà supprimé"
                                : "Supprimer"
                            }
                          >
                            {loadingDelete ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Pagination (depuis le hook) ───────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Affichage {(pagination.page - 1) * pagination.limit + 1} à{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  sur {pagination.total} résultats
                </span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value={10}>10 par page</option>
                  <option value={25}>25 par page</option>
                  <option value={50}>50 par page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevious}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border rounded-md text-sm ${
                            pageNum === pagination.page
                              ? "bg-sky-600 text-white border-sky-600"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal de confirmation pour suppression ─────────────────────── */}
      <ConfirmationModal
        title="Supprimer la procédure"
        content="Êtes-vous sûr de vouloir supprimer cette procédure définitivement ? Cette action est irréversible."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        open={confirmModal.open}
      />
    </>
  );
};

export default Procedures;
