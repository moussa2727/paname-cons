import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  Star,
  Filter,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useRendezvous } from "../../../hooks/useRendezvous";
import {
  type RendezvousResponseDto,
  type CancelRendezvousDto,
  RendezvousStatus,
  AdminOpinion,
  CancelledBy,
  RendezvousStatusLabels,
  AdminOpinionLabels,
  timeSlotToDisplay,
} from "../../../types/rendezvous.types";
import { pageConfigs } from "../../../components/shared/user/UserHeader.config";
import Loader from "../../../components/shared/user/Loader";

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Vérifie si un rendez-vous peut être annulé
 */
const canCancelRendezvous = (rdv: RendezvousResponseDto): boolean => {
  return (
    rdv.canCancel &&
    (rdv.status === RendezvousStatus.PENDING ||
      rdv.status === RendezvousStatus.CONFIRMED)
  );
};

/**
 * Calcule le temps restant avant le rendez-vous pour l'annulation
 */
const getRemainingCancellationTime = (
  rdv: RendezvousResponseDto,
): string | null => {
  if (!rdv.canCancel) return null;

  const now = new Date();
  const rdvDateTime = new Date(`${rdv.date}T${timeSlotToDisplay(rdv.time)}:00`);
  const diffMs = rdvDateTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return diffHours > 0
    ? `${diffHours}h ${diffMinutes}min`
    : `${diffMinutes}min`;
};

// ==================== CONSTANTES ====================

const statusOptions: { value: RendezvousStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: RendezvousStatus.PENDING, label: RendezvousStatusLabels.PENDING },
  {
    value: RendezvousStatus.CONFIRMED,
    label: RendezvousStatusLabels.CONFIRMED,
  },
  {
    value: RendezvousStatus.COMPLETED,
    label: RendezvousStatusLabels.COMPLETED,
  },
  {
    value: RendezvousStatus.CANCELLED,
    label: RendezvousStatusLabels.CANCELLED,
  },
];

const statusColors: Record<RendezvousStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CONFIRMED: "bg-sky-100 text-sky-800 border-sky-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

const avisColors: Record<AdminOpinion, string> = {
  FAVORABLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  UNFAVORABLE: "bg-red-100 text-red-800 border-red-300",
};

// ==================== UTILITAIRES ====================

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ==================== COMPOSANT MODAL ====================

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  rdv: RendezvousResponseDto | null;
  isCancelling: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rdv,
  isCancelling,
}) => {
  const [cancellationReason, setCancellationReason] = useState("");

  if (!isOpen || !rdv) return null;

  const timeLeft = getRemainingCancellationTime(rdv);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-red-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-2">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Confirmer l'annulation
                </h3>
                <p className="text-sm text-red-100">
                  Cette action est irréversible
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">
                Détails du rendez-vous à annuler :
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    <span className="font-medium">Date :</span>{" "}
                    {formatDate(rdv.date)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    <span className="font-medium">Heure :</span>{" "}
                    {timeSlotToDisplay(rdv.time)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    <span className="font-medium">Destination :</span>{" "}
                    {rdv.effectiveDestination}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    <span className="font-medium">Filière :</span>{" "}
                    {rdv.effectiveFiliere}
                  </span>
                </div>
              </div>
            </div>

            {timeLeft && (
              <div className="mb-4 rounded-lg bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Délai d'annulation
                    </p>
                    <p className="text-xs text-amber-700">
                      Il vous reste {timeLeft} pour annuler ce rendez-vous
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="cancellationReason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Raison de l'annulation (optionnelle)
              </label>
              <textarea
                id="cancellationReason"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Indiquez la raison de votre annulation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            </div>

            <div className="mb-6 rounded-lg bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs font-medium text-red-800">
                    Attention : Cette action est irréversible
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-red-700">
                    <li>Le rendez-vous sera définitivement annulé</li>
                    <li>Un email de confirmation vous sera envoyé</li>
                    <li>
                      Vous devrez reprendre un nouveau rendez-vous si nécessaire
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isCancelling}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Retour
              </button>
              <button
                onClick={() => onConfirm(cancellationReason || undefined)}
                disabled={isCancelling}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Annulation...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Confirmer l'annulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

const MesRendezvous: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(0);

  // ✅ DÉLÉGATION COMPLÈTE AU HOOK
  const {
    rendezvous,
    loading,
    pagination,
    getRendezvousByEmail,
    cancelRendezvous,
    setFilters,
    resetFilters,
    nextPage,
    previousPage,
    goToPage,
  } = useRendezvous({
    autoLoad: false,
    initialParams: {
      limit: 10,
      sortBy: "date",
      sortOrder: "desc",
    },
  });

  // État local pour le statut sélectionné
  const [selectedStatus, setSelectedStatus] = useState<RendezvousStatus | "">(
    "",
  );

  // Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRdvForCancel, setSelectedRdvForCancel] =
    useState<RendezvousResponseDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Hauteur du header
  useEffect(() => {
    const header = document.querySelector("header");
    if (header) setHeaderHeight(header.offsetHeight);
  }, []);

  // Config page courante
  const getCurrentPageConfig = useCallback(() => {
    const currentPath = location.pathname;

    if (pageConfigs[currentPath as keyof typeof pageConfigs]) {
      return pageConfigs[currentPath as keyof typeof pageConfigs];
    }

    const sortedPaths = Object.keys(pageConfigs).sort(
      (a, b) => b.length - a.length,
    );
    for (const path of sortedPaths) {
      if (
        currentPath === path ||
        (currentPath.startsWith(path) && !currentPath.includes("/user"))
      ) {
        return pageConfigs[path as keyof typeof pageConfigs];
      }
    }

    return pageConfigs["/mes-rendezvous"];
  }, [location.pathname]);

  const currentPage = getCurrentPageConfig();

  // ==================== CHARGEMENT ====================

  const fetchRendezvous = useCallback(async () => {
    if (!user?.email) return;
    try {
      await getRendezvousByEmail(user.email);
    } catch {
      // Les erreurs sont gérées par le hook
    }
  }, [user?.email, getRendezvousByEmail]);

  // Chargement initial
  useEffect(() => {
    if (user?.email) {
      fetchRendezvous();
    }
  }, [user?.email, fetchRendezvous]);

  // ✅ Appliquer le filtre de statut via le hook
  useEffect(() => {
    if (selectedStatus) {
      setFilters({ status: selectedStatus });
    } else {
      resetFilters();
    }
  }, [selectedStatus, setFilters, resetFilters]);

  // ==================== ANNULATION ====================

  const openCancelModal = (rdv: RendezvousResponseDto) => {
    setSelectedRdvForCancel(rdv);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedRdvForCancel(null);
  };

  const handleCancelRendezvous = async (reason?: string) => {
    if (!selectedRdvForCancel) return;
    setCancelling(true);
    try {
      const cancelData: CancelRendezvousDto = {
        reason: reason?.trim() || "Annulation par l'utilisateur",
        cancelledBy: CancelledBy.USER,
      };

      await cancelRendezvous(selectedRdvForCancel.id, cancelData);
      closeCancelModal();
    } catch {
      // Les erreurs sont gérées par le hook
    } finally {
      setCancelling(false);
    }
  };

  // ==================== GESTIONNAIRES ====================

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value as RendezvousStatus | "");
  };

  // ==================== BADGES ====================

  const renderStatusBadge = (status: RendezvousStatus) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusColors[status] ?? "bg-gray-100 text-gray-800 border-gray-300"
      }`}
    >
      {status === RendezvousStatus.PENDING && (
        <AlertCircle className="mr-1 h-3 w-3" />
      )}
      {status === RendezvousStatus.CONFIRMED && (
        <CheckCircle className="mr-1 h-3 w-3" />
      )}
      {status === RendezvousStatus.COMPLETED && (
        <CheckCircle className="mr-1 h-3 w-3" />
      )}
      {status === RendezvousStatus.CANCELLED && (
        <XCircle className="mr-1 h-3 w-3" />
      )}
      {RendezvousStatusLabels[status]}
    </span>
  );

  const renderAvisBadge = (avis: AdminOpinion) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${avisColors[avis]}`}
    >
      <Star className="mr-1 h-3 w-3" />
      {AdminOpinionLabels[avis]}
    </span>
  );

  // ==================== RENDU ====================

  if (!user || !isAuthenticated) {
    navigate("/connexion");
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name="description" content={currentPage.description} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen" style={{ paddingTop: `${headerHeight}px` }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Barre d'actions */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  disabled={loading.list}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white transition-all duration-200 hover:border-sky-400"
                >
                  {statusOptions.map((opt) => (
                    <option key={`status-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchRendezvous}
                disabled={loading.list}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading.list ? "animate-spin" : ""}`}
                />
                Actualiser
              </button>
            </div>

            {/* Pagination info du hook */}
            <div className="text-sm text-gray-600">
              {pagination.total > 0 ? (
                <>
                  {pagination.total} rendez-vous • Page {pagination.page}/
                  {pagination.totalPages}
                </>
              ) : (
                "Aucun rendez-vous"
              )}
            </div>
          </div>

          {/* Chargement */}
          {loading.list && (
            <div className="mb-6 text-center py-12">
              <Loader loading={true} size="md" />
              <p className="mt-3 text-sm text-gray-600">
                Chargement de vos rendez-vous...
              </p>
            </div>
          )}

          {/* Liste - utilise directement rendezvous du hook */}
          {!loading.list && rendezvous.length > 0 && (
            <div className="space-y-4 mb-8">
              {rendezvous.map((rdv, index) => {
                const canCancel = canCancelRendezvous(rdv);

                return (
                  <div
                    key={`rdv-${rdv.id}-${index}`}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {renderStatusBadge(rdv.status)}
                          {rdv.status === RendezvousStatus.COMPLETED &&
                            rdv.avisAdmin &&
                            renderAvisBadge(rdv.avisAdmin)}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-700">
                            <Calendar className="mr-2 h-4 w-4 text-sky-500" />
                            <span className="font-medium">
                              {formatDate(rdv.date)}
                            </span>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-sky-500" />
                            <span className="font-medium">
                              {timeSlotToDisplay(rdv.time)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="mr-2 h-4 w-4 text-sky-500" />
                            <span>{rdv.effectiveDestination}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <BookOpen className="mr-2 h-4 w-4 text-sky-500" />
                            <span>{rdv.effectiveFiliere}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Award className="mr-2 h-4 w-4 text-sky-500" />
                            <span>{rdv.effectiveNiveauEtude}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        {canCancel && (
                          <button
                            onClick={() => openCancelModal(rdv)}
                            disabled={cancelling}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Annuler
                          </button>
                        )}

                        {rdv.status === RendezvousStatus.COMPLETED &&
                          rdv.avisAdmin && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <Info className="mr-1 h-3 w-3" />
                              Avis administrateur reçu
                            </div>
                          )}

                        <div className="text-xs text-gray-400">
                          Créé le{" "}
                          {new Date(rdv.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>

                    {rdv.status === RendezvousStatus.CANCELLED &&
                      rdv.cancellationReason && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              Raison d'annulation :
                            </span>{" "}
                            {rdv.cancellationReason}
                          </div>
                          {rdv.cancelledAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Annulé le{" "}
                              {new Date(rdv.cancelledAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* État vide */}
          {!loading.list && rendezvous.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Aucun rendez-vous trouvé
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {selectedStatus
                  ? `Vous n'avez pas de rendez-vous avec le statut "${RendezvousStatusLabels[selectedStatus as RendezvousStatus]}"`
                  : "Vous n'avez pas encore pris de rendez-vous"}
              </p>
              <button
                onClick={() => navigate("/rendez-vous")}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Prendre un rendez-vous
              </button>
            </div>
          )}

          {/* Pagination - utilise les méthodes du hook */}
          {!loading.list && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.totalPages} • Total :{" "}
                {pagination.total} rendez-vous
                {pagination.total > 1 ? "s" : ""}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={previousPage}
                  disabled={!pagination.hasPrevious || loading.list}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
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
                          key={`page-${pageNum}`}
                          onClick={() => goToPage(pageNum)}
                          disabled={loading.list}
                          className={`min-w-10 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            pagination.page === pageNum
                              ? "bg-sky-600 text-white"
                              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  onClick={nextPage}
                  disabled={!pagination.hasNext || loading.list}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="mt-8 bg-sky-50 border border-sky-200 rounded-lg p-4">
            <h3 className="font-medium text-sky-800 mb-2 flex items-center">
              <Info className="mr-2 h-4 w-4" />
              Informations importantes
            </h3>
            <ul className="text-sm text-sky-700 space-y-1">
              <li>
                ✓ Les rendez-vous annulés apparaissent avec la raison
                d'annulation
              </li>
              <li>
                ✓ Vous pouvez annuler vos rendez-vous en attente ou confirmés à
                tout moment
              </li>
              <li>
                ✓ Pour les rendez-vous Terminés, l'avis administrateur est
                affiché
              </li>
              <li>
                ✓ Un rendez-vous Terminé avec avis Favorable peut déclencher une
                procédure
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={closeCancelModal}
        onConfirm={handleCancelRendezvous}
        rdv={selectedRdvForCancel}
        isCancelling={cancelling}
      />
    </>
  );
};

export default MesRendezvous;
