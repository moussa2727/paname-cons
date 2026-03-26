// Rendezvous.tsx - Version corrigée (sans boucles)

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../hooks/useAuth";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import {
  Calendar,
  Search,
  Trash2,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Filter,
  Download,
  RefreshCw,
  Clock,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Ban,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  CalendarDays,
  Star,
  ArrowUpRight,
  X,
  Eye,
  BookOpen,
  Plus,
  Lock,
} from "lucide-react";
import { useAdminRendezvous } from "../../../hooks/useRendezvous";
import { useDestinations } from "../../../hooks/useDestinations";
import {
  RendezvousStatus,
  AdminOpinion,
  DESTINATION_OPTIONS,
  NIVEAU_ETUDE_OPTIONS,
  FILIERE_OPTIONS,
  TIME_SLOT_OPTIONS,
  RendezvousStatusLabels,
  AdminOpinionLabels,
  type RendezvousResponseDto,
  type UpdateRendezvousDto,
  type TimeSlot,
  type CreateRendezvousDto,
  type RendezvousQueryDto,
  timeSlotToDisplay,
} from "../../../types/rendezvous.types";

// Types locaux
type ModalType = "detail" | "complete" | "cancel" | "update" | "create" | null;

interface ModalState {
  type: ModalType;
  rdv: RendezvousResponseDto | null;
}

// Configuration des statuts
const STATUS_CFG: Record<
  RendezvousStatus,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    Icon: React.ElementType;
    label: string;
  }
> = {
  [RendezvousStatus.CONFIRMED]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircle,
    label: RendezvousStatusLabels.CONFIRMED,
  },
  [RendezvousStatus.PENDING]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
    Icon: AlertCircle,
    label: RendezvousStatusLabels.PENDING,
  },
  [RendezvousStatus.CANCELLED]: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-400",
    Icon: XCircle,
    label: RendezvousStatusLabels.CANCELLED,
  },
  [RendezvousStatus.COMPLETED]: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
    Icon: CheckCircle,
    label: RendezvousStatusLabels.COMPLETED,
  },
};

// Helper pour afficher la valeur effective ou "Non renseigné"
const displayEffectiveValue = (
  value: string,
  fallback: string = "Non renseigné",
) => {
  if (!value || value.trim() === "") return fallback;
  return value;
};

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return (fullName || "??")
    .split(" ")
    .map((n) => n?.[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const StatusBadge = ({ status }: { status: RendezvousStatus }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG[RendezvousStatus.PENDING];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

const ModalHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
    <h2 className="font-bold text-lg text-gray-900">{title}</h2>
    <button
      onClick={onClose}
      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <X className="w-5 h-5 text-gray-500" />
    </button>
  </div>
);

const PanelRow = ({
  rdv,
  onView,
}: {
  rdv: RendezvousResponseDto;
  onView: () => void;
}) => (
  <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
    <div className="w-9 h-9 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
      {getInitials(rdv.firstName, rdv.lastName)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm text-gray-900 truncate">
        {rdv.firstName} {rdv.lastName}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {displayEffectiveValue(rdv.effectiveDestination)}
      </p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <StatusBadge status={rdv.status} />
      <div className="text-right">
        <p className="text-sm font-medium text-gray-800">{rdv.date}</p>
        <p className="text-xs text-gray-400">{timeSlotToDisplay(rdv.time)}</p>
      </div>
      <button
        onClick={onView}
        className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Composant principal
const RendezvousAdmin = () => {
  const { isAdmin } = useAuth();

  const {
    rendezvousList,
    selectedRendezvous,
    statistics,
    pagination,
    loading,
    error,
    searchRendezvous,
    getRendezvousById,
    getStatistics,
    updateRendezvous,
    completeRendezvous,
    cancelRendezvous,
    deleteRendezvous,
    createRendezvous,
    getRendezvousByDate,
    getUpcomingRendezvous,
    exportToCSV,
    applyFilters,
    resetFilters,
    changePage,
  } = useAdminRendezvous({
    autoLoadList: true,
    refreshInterval: 0, // ✅ Désactivé pour éviter les appels automatiques
  });

  const { destinations = [], loading: loadingDestinations } = useDestinations();

  // État local
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null, rdv: null });
  const [activeTab, setActiveTab] = useState<"list" | "today" | "upcoming">(
    "list",
  );
  const [todayList, setTodayList] = useState<RendezvousResponseDto[]>([]);
  const [upcomingList, setUpcomingList] = useState<RendezvousResponseDto[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completeOpinion, setCompleteOpinion] = useState<AdminOpinion>(
    AdminOpinion.FAVORABLE,
  );
  const [completeComment, setCompleteComment] = useState("");

  // ✅ Ref pour éviter les appels multiples
  const hasLoadedTodayRef = useRef(false);
  const hasLoadedUpcomingRef = useRef(false);

  // État local pour les filtres
  const [localFilters, setLocalFilters] = useState<RendezvousQueryDto>({
    page: 1,
    limit: 20,
    status: undefined,
    destination: undefined,
    startDate: undefined,
    endDate: undefined,
    search: undefined,
  });

  // Formulaire d'édition
  const [editForm, setEditForm] = useState<UpdateRendezvousDto>({
    firstName: "",
    lastName: "",
    telephone: "",
    destination: "",
    destinationAutre: "",
    niveauEtude: "",
    niveauEtudeAutre: "",
    filiere: "",
    filiereAutre: "",
    date: "",
    time: "" as TimeSlot,
  });

  const [showOtherDestination, setShowOtherDestination] = useState(false);
  const [showOtherNiveau, setShowOtherNiveau] = useState(false);
  const [showOtherFiliere, setShowOtherFiliere] = useState(false);

  const [createForm, setCreateForm] = useState<CreateRendezvousDto>({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    destination: "",
    destinationAutre: "",
    niveauEtude: "",
    niveauEtudeAutre: "",
    filiere: "",
    filiereAutre: "",
    date: "",
    time: "" as TimeSlot,
  });

  const [showOtherDestinationCreate, setShowOtherDestinationCreate] =
    useState(false);
  const [showOtherNiveauCreate, setShowOtherNiveauCreate] = useState(false);
  const [showOtherFiliereCreate, setShowOtherFiliereCreate] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce recherche
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      applyFilters({
        ...localFilters,
        search: searchTerm.trim() || undefined,
      });
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchTerm, localFilters, applyFilters]);

  // ✅ Panels - fonctions stables
  const loadTodayPanel = useCallback(async () => {
    if (loadingPanel) return; // ✅ Évite les appels multiples

    setLoadingPanel(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await getRendezvousByDate(today);
      setTodayList(Array.isArray(data) ? data : []);
      hasLoadedTodayRef.current = true;
    } catch (error) {
      console.error("Erreur chargement aujourd'hui:", error);
      setTodayList([]);
    } finally {
      setLoadingPanel(false);
    }
  }, [getRendezvousByDate, loadingPanel]);

  const loadUpcomingPanel = useCallback(
    async (limit = 10) => {
      if (loadingPanel) return; // ✅ Évite les appels multiples

      setLoadingPanel(true);
      try {
        const data = await getUpcomingRendezvous(limit);
        setUpcomingList(Array.isArray(data) ? data : []);
        hasLoadedUpcomingRef.current = true;
      } catch (error) {
        console.error("Erreur chargement à venir:", error);
        setUpcomingList([]);
      } finally {
        setLoadingPanel(false);
      }
    },
    [getUpcomingRendezvous, loadingPanel],
  );

  // ✅ Switch d'onglet - sans auto-reload
  const switchTab = useCallback((tab: "list" | "today" | "upcoming") => {
    setActiveTab(tab);
  }, []);

  // ✅ Effet pour charger les panels UNIQUEMENT quand l'onglet change ET que les données ne sont pas déjà chargées
  useEffect(() => {
    if (activeTab === "today" && !hasLoadedTodayRef.current && !loadingPanel) {
      loadTodayPanel();
    } else if (
      activeTab === "upcoming" &&
      !hasLoadedUpcomingRef.current &&
      !loadingPanel
    ) {
      loadUpcomingPanel();
    }
  }, [activeTab]); // Seulement quand l'onglet change

  // ✅ Réinitialisation des refs quand les données sont modifiées (création, suppression, etc.)
  const resetPanelCache = useCallback(() => {
    hasLoadedTodayRef.current = false;
    hasLoadedUpcomingRef.current = false;
  }, []);

  // Filtre rapide par date
  const handleDateQuickFilter = useCallback(
    async (date: string) => {
      if (!date) {
        await searchRendezvous();
        return;
      }
      setActiveTab("today");
      hasLoadedTodayRef.current = false; // Force le rechargement
      setLoadingPanel(true);
      try {
        const data = await getRendezvousByDate(date);
        setTodayList(Array.isArray(data) ? data : []);
        hasLoadedTodayRef.current = true;
      } catch (error) {
        console.error("Erreur filtre par date:", error);
        setTodayList([]);
      } finally {
        setLoadingPanel(false);
      }
    },
    [getRendezvousByDate, searchRendezvous],
  );

  // Gestionnaires de filtres
  const handleStatusFilter = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const newFilters = {
        ...localFilters,
        status: value ? (value as RendezvousStatus) : undefined,
        page: 1,
      };
      setLocalFilters(newFilters);
      applyFilters(newFilters);
    },
    [localFilters, applyFilters],
  );

  const handleDestinationFilter = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const newFilters = {
        ...localFilters,
        destination: value || undefined,
        page: 1,
      };
      setLocalFilters(newFilters);
      applyFilters(newFilters);
    },
    [localFilters, applyFilters],
  );

  const handleStartDateFilter = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newFilters = {
        ...localFilters,
        startDate: value || undefined,
        page: 1,
      };
      setLocalFilters(newFilters);
      applyFilters(newFilters);
    },
    [localFilters, applyFilters],
  );

  const handleEndDateFilter = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newFilters = {
        ...localFilters,
        endDate: value || undefined,
        page: 1,
      };
      setLocalFilters(newFilters);
      applyFilters(newFilters);
    },
    [localFilters, applyFilters],
  );

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setLocalFilters({
      page: 1,
      limit: 20,
      status: undefined,
      destination: undefined,
      startDate: undefined,
      endDate: undefined,
      search: undefined,
    });
    resetFilters();
  }, [resetFilters]);

  // Ouvrir modal
  const openModal = useCallback(
    async (type: ModalType, rdv: RendezvousResponseDto | null = null) => {
      if (type !== "create" && rdv?.id) {
        try {
          await getRendezvousById(rdv.id);
        } catch (error) {
          console.error("Erreur chargement détails:", error);
        }
      }

      const data = selectedRendezvous ?? rdv;

      setModal({ type, rdv: data });

      if (type === "update" && data) {
        const isDestAutre = data.destination === "Autre";
        const isNiveauAutre = data.niveauEtude === "Autre";
        const isFiliereAutre = data.filiere === "Autre";

        setShowOtherDestination(isDestAutre);
        setShowOtherNiveau(isNiveauAutre);
        setShowOtherFiliere(isFiliereAutre);

        setEditForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          telephone: data.telephone || "",
          destination: isDestAutre ? "Autre" : data.destination || "",
          destinationAutre: data.destinationAutre || "",
          niveauEtude: isNiveauAutre ? "Autre" : data.niveauEtude || "",
          niveauEtudeAutre: data.niveauEtudeAutre || "",
          filiere: isFiliereAutre ? "Autre" : data.filiere || "",
          filiereAutre: data.filiereAutre || "",
          date: data.date || "",
          time: data.time,
        });
      } else if (type === "complete") {
        setCompleteOpinion(AdminOpinion.FAVORABLE);
        setCompleteComment("");
      } else if (type === "cancel") {
        setCancelReason("");
      }
    },
    [getRendezvousById, selectedRendezvous],
  );

  const closeModal = () => {
    setModal({ type: null, rdv: null });
    setCancelReason("");
    setCompleteComment("");
  };

  const handleComplete = async () => {
    if (!modal.rdv?.id) return;

    try {
      const result = await completeRendezvous(
        modal.rdv.id,
        completeOpinion,
        completeComment.trim() || undefined,
      );
      if (result) {
        closeModal();
        await getStatistics();
        resetPanelCache(); // ✅ Invalide le cache
        if (activeTab === "today") await loadTodayPanel();
        if (activeTab === "upcoming") await loadUpcomingPanel();
      }
    } catch (error) {
      console.error("Erreur complétion:", error);
    }
  };

  const handleCancel = async () => {
    if (!modal.rdv?.id || !cancelReason.trim()) return;

    try {
      const result = await cancelRendezvous(modal.rdv.id, cancelReason.trim());
      if (result) {
        closeModal();
        await getStatistics();
        resetPanelCache(); // ✅ Invalide le cache
        if (activeTab === "today") await loadTodayPanel();
        if (activeTab === "upcoming") await loadUpcomingPanel();
      }
    } catch (error) {
      console.error("Erreur annulation:", error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.rdv?.id) return;

    try {
      const cleanData: UpdateRendezvousDto = {
        ...editForm,
        destinationAutre:
          editForm.destination === "Autre"
            ? editForm.destinationAutre
            : undefined,
        niveauEtudeAutre:
          editForm.niveauEtude === "Autre"
            ? editForm.niveauEtudeAutre
            : undefined,
        filiereAutre:
          editForm.filiere === "Autre" ? editForm.filiereAutre : undefined,
      };

      const result = await updateRendezvous(modal.rdv.id, cleanData);
      if (result) {
        closeModal();
        await getStatistics();
        resetPanelCache(); // ✅ Invalide le cache
        if (activeTab === "today") await loadTodayPanel();
        if (activeTab === "upcoming") await loadUpcomingPanel();
      }
    } catch (error) {
      console.error("Erreur mise à jour:", error);
    }
  };

  const handleCreate = async () => {
    try {
      const cleanData: CreateRendezvousDto = {
        ...createForm,
        destinationAutre:
          createForm.destination === "Autre"
            ? createForm.destinationAutre
            : undefined,
        niveauEtudeAutre:
          createForm.niveauEtude === "Autre"
            ? createForm.niveauEtudeAutre
            : undefined,
        filiereAutre:
          createForm.filiere === "Autre" ? createForm.filiereAutre : undefined,
      };

      const result = await createRendezvous(cleanData);
      if (result) {
        closeModal();
        await getStatistics();
        resetPanelCache(); // ✅ Invalide le cache
        if (activeTab === "today") await loadTodayPanel();
        if (activeTab === "upcoming") await loadUpcomingPanel();

        setCreateForm({
          firstName: "",
          lastName: "",
          email: "",
          telephone: "",
          destination: "",
          destinationAutre: "",
          niveauEtude: "",
          niveauEtudeAutre: "",
          filiere: "",
          filiereAutre: "",
          date: "",
          time: "" as TimeSlot,
        });
        setShowOtherDestinationCreate(false);
        setShowOtherNiveauCreate(false);
        setShowOtherFiliereCreate(false);
      }
    } catch (error) {
      console.error("Erreur création:", error);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    if (confirmModal.id) {
      try {
        await deleteRendezvous(confirmModal.id);
        await getStatistics();
        resetPanelCache(); // ✅ Invalide le cache
        if (activeTab === "today") await loadTodayPanel();
        if (activeTab === "upcoming") await loadUpcomingPanel();
      } catch (error) {
        console.error("Erreur suppression:", error);
      }
    }
    setConfirmModal({ open: false, id: null });
  };

  const handleCancelDelete = () => {
    setConfirmModal({ open: false, id: null });
  };

  const handleSetPending = async (id: string) => {
    try {
      await updateRendezvous(id, { status: RendezvousStatus.PENDING });
      await getStatistics();
      resetPanelCache(); // ✅ Invalide le cache
      if (activeTab === "today") await loadTodayPanel();
      if (activeTab === "upcoming") await loadUpcomingPanel();
    } catch (error) {
      console.error("Erreur mise en attente:", error);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await updateRendezvous(id, { status: RendezvousStatus.CONFIRMED });
      await getStatistics();
      resetPanelCache(); // ✅ Invalide le cache
      if (activeTab === "today") await loadTodayPanel();
      if (activeTab === "upcoming") await loadUpcomingPanel();
    } catch (error) {
      console.error("Erreur confirmation:", error);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportToCSV();
      if (!csv) return;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rendezvous-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur export:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      await searchRendezvous();
      await getStatistics();
      if (activeTab === "today") await loadTodayPanel();
      if (activeTab === "upcoming") await loadUpcomingPanel();
    } catch (error) {
      console.error("Erreur rafraîchissement:", error);
    }
  };

  // Calcul du nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    return [
      localFilters.status,
      localFilters.destination,
      localFilters.startDate && localFilters.endDate,
      searchTerm,
    ].filter(Boolean).length;
  }, [localFilters, searchTerm]);

  // Statistiques sécurisées avec valeurs par défaut
  const safeStatistics = useMemo(() => {
    if (!statistics) return null;

    return {
      total: statistics.total ?? 0,
      byStatus: {
        pending: statistics.byStatus?.pending ?? 0,
        confirmed: statistics.byStatus?.confirmed ?? 0,
        completed: statistics.byStatus?.completed ?? 0,
        cancelled: statistics.byStatus?.cancelled ?? 0,
      },
      completionRate: statistics.completionRate ?? 0,
      cancellationRate: statistics.cancellationRate ?? 0,
      upcoming: {
        today: statistics.upcoming?.today ?? 0,
        tomorrow: statistics.upcoming?.tomorrow ?? 0,
        thisWeek: statistics.upcoming?.thisWeek ?? 0,
        thisMonth: statistics.upcoming?.thisMonth ?? 0,
      },
      topDestinations: statistics.topDestinations ?? [],
    };
  }, [statistics]);

  // Rendu des statistiques
  const renderStatistics = () => {
    if (!isAdmin) return null;

    if (loading.statistics) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      );
    }

    if (!safeStatistics) {
      return (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">Aucune statistique disponible</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              Icon: BarChart2,
              color: "text-blue-500",
              bg: "bg-blue-50",
              value: safeStatistics.total,
              label: "Total",
            },
            {
              Icon: CheckCircle,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              value: safeStatistics.byStatus.confirmed,
              label: "Confirmés",
            },
            {
              Icon: AlertCircle,
              color: "text-amber-500",
              bg: "bg-amber-50",
              value: safeStatistics.byStatus.pending,
              label: "En attente",
            },
            {
              Icon: XCircle,
              color: "text-red-500",
              bg: "bg-red-50",
              value: safeStatistics.byStatus.cancelled,
              label: "Annulés",
            },
            {
              Icon: CheckCircle,
              color: "text-sky-500",
              bg: "bg-sky-50",
              value: safeStatistics.byStatus.completed,
              label: "Terminés",
            },
          ].map(({ Icon, color, bg, value, label }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            >
              <div
                className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}
              >
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Taux complétion / annulation */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Taux
            </h3>
            {[
              {
                label: "Complétion",
                pct: safeStatistics.completionRate,
                color: "bg-emerald-500",
                textColor: "text-emerald-600",
              },
              {
                label: "Annulation",
                pct: safeStatistics.cancellationRate,
                color: "bg-red-400",
                textColor: "text-red-500",
              },
            ].map(({ label, pct, color, textColor }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span>
                  <span className={`font-semibold ${textColor}`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
              {[
                {
                  label: "Cette semaine",
                  value: safeStatistics.upcoming.thisWeek,
                },
                {
                  label: "Ce mois",
                  value: safeStatistics.upcoming.thisMonth,
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top destinations */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" /> Top destinations
            </h3>
            {safeStatistics.topDestinations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Aucune donnée
              </p>
            ) : (
              <div className="space-y-2">
                {(safeStatistics.topDestinations || [])
                  .slice(0, 5)
                  .map(
                    (
                      dest: { destination: string; count: number },
                      index: number,
                    ) => {
                      const max = safeStatistics.topDestinations[0]?.count ?? 1;
                      const pct = Math.round((dest.count / max) * 100);
                      return (
                        <div
                          key={dest.destination}
                          className="flex items-center gap-2"
                        >
                          <span className="text-xs font-bold text-gray-400 w-4">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-medium text-gray-700 truncate">
                                {dest.destination}
                              </span>
                              <span className="text-gray-500 ml-2 shrink-0">
                                {dest.count}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-sky-500 h-1.5 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
              </div>
            )}
          </div>

          {/* Prévisions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-indigo-500" /> Prévisions
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Aujourd'hui",
                  value: safeStatistics.upcoming.today,
                  color: "text-sky-600",
                  Icon: ArrowUpRight,
                },
                {
                  label: "Demain",
                  value: safeStatistics.upcoming.tomorrow,
                  color: "text-indigo-600",
                  Icon: ArrowUpRight,
                },
                {
                  label: "Cette semaine",
                  value: safeStatistics.upcoming.thisWeek,
                  color: "text-violet-600",
                  Icon: TrendingUp,
                },
                {
                  label: "Ce mois",
                  value: safeStatistics.upcoming.thisMonth,
                  color: "text-purple-600",
                  Icon: TrendingDown,
                },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div
                    className={`flex items-center gap-2 text-sm text-gray-600`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                  </div>
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Rendu erreur
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-12 h-12 text-red-400" />
          <p className="text-red-800 font-semibold">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestion Des Rendez-vous — Paname Consulting</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Rendez-vous
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Gestion des consultations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => openModal("create", null)}
              className="flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Créer un RDV</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter CSV</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading.list || loading.statistics || loadingPanel}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading.list || loading.statistics || loadingPanel ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* STATISTIQUES ADMIN */}
        {renderStatistics()}

        {/* ONGLETS */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(
            [
              { key: "list", label: "Tous", count: pagination?.total ?? 0 },
              { key: "today", label: "Aujourd'hui", count: todayList.length },
              { key: "upcoming", label: "À venir", count: upcomingList.length },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === key
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === key
                      ? "bg-sky-100 text-sky-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* BARRE RECHERCHE + FILTRES */}
        {activeTab === "list" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher (nom, email, destination…)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>

              <input
                type="date"
                onChange={(e) => handleDateQuickFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
              />

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  activeFiltersCount > 0
                    ? "border-sky-400 bg-sky-50 text-sky-700"
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-sky-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" /> Effacer
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                {/* Statut */}
                <div className="relative">
                  <select
                    value={localFilters.status || ""}
                    onChange={handleStatusFilter}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-none focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Tous les statuts</option>
                    {Object.entries(STATUS_CFG).map(([val, cfg]) => (
                      <option key={val} value={val}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {/* Destination */}
                <div className="relative">
                  <select
                    value={localFilters.destination || ""}
                    onChange={handleDestinationFilter}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-none focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Toutes destinations</option>
                    {DESTINATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                <input
                  type="date"
                  value={localFilters.startDate || ""}
                  onChange={handleStartDateFilter}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-none focus:outline-none focus:border-sky-500"
                  placeholder="Date début"
                />

                <input
                  type="date"
                  value={localFilters.endDate || ""}
                  onChange={handleEndDateFilter}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-none focus:outline-none focus:border-sky-500"
                  placeholder="Date fin"
                />
              </div>
            )}
          </div>
        )}

        {/* PANEL AUJOURD'HUI */}
        {activeTab === "today" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-500" /> Rendez-vous du
                jour
              </h2>
              <button
                onClick={() => {
                  hasLoadedTodayRef.current = false;
                  loadTodayPanel();
                }}
                disabled={loadingPanel}
                className="text-xs text-sky-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loadingPanel ? "animate-spin" : ""}`}
                />
                Actualiser
              </button>
            </div>
            {loadingPanel ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
              </div>
            ) : todayList.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">
                Aucun rendez-vous aujourd'hui
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayList.map((rdv: RendezvousResponseDto) => (
                  <PanelRow
                    key={rdv.id}
                    rdv={rdv}
                    onView={() => openModal("detail", rdv)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL À VENIR */}
        {activeTab === "upcoming" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Prochains
                rendez-vous
              </h2>
              <button
                onClick={() => {
                  hasLoadedUpcomingRef.current = false;
                  loadUpcomingPanel(20);
                }}
                disabled={loadingPanel}
                className="text-xs text-indigo-600 hover:underline"
              >
                Voir les 20 prochains
              </button>
            </div>
            {loadingPanel ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : upcomingList.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">
                Aucun rendez-vous à venir
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingList.map((rdv: RendezvousResponseDto) => (
                  <PanelRow
                    key={rdv.id}
                    rdv={rdv}
                    onView={() => openModal("detail", rdv)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* LISTE PRINCIPALE */}
        {activeTab === "list" && (
          <>
            {loading.list ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
              </div>
            ) : (rendezvousList || []).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun rendez-vous</p>
                <p className="text-gray-400 text-sm mt-1">
                  {activeFiltersCount > 0
                    ? "Essayez d'autres critères"
                    : "Aucune donnée disponible"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(rendezvousList || []).map((rdv: RendezvousResponseDto) => (
                  <div
                    key={rdv.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {getInitials(rdv.firstName, rdv.lastName)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {rdv.firstName} {rdv.lastName}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {rdv.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {rdv.telephone}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge status={rdv.status} />
                              {(rdv.status === RendezvousStatus.CANCELLED ||
                                rdv.status === RendezvousStatus.COMPLETED) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
                                  <Lock className="w-3 h-3" />
                                  Immutable
                                </span>
                              )}
                              {rdv.avisAdmin && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                    rdv.avisAdmin === AdminOpinion.FAVORABLE
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {rdv.avisAdmin === AdminOpinion.FAVORABLE ? (
                                    <ThumbsUp className="w-3 h-3" />
                                  ) : (
                                    <ThumbsDown className="w-3 h-3" />
                                  )}
                                  {AdminOpinionLabels[rdv.avisAdmin]}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {displayEffectiveValue(rdv.effectiveDestination)}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                              {displayEffectiveValue(rdv.effectiveNiveauEtude)}{" "}
                              · {displayEffectiveValue(rdv.effectiveFiliere)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {rdv.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {timeSlotToDisplay(rdv.time)}
                            </span>
                          </div>

                          {rdv.cancellationReason && (
                            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mb-3">
                              Raison : {rdv.cancellationReason}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => openModal("detail", rdv)}
                              disabled={loading.details}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              {loading.details ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              Détails
                            </button>

                            {rdv.canModify &&
                              rdv.status !== RendezvousStatus.CANCELLED &&
                              rdv.status !== RendezvousStatus.COMPLETED && (
                                <button
                                  onClick={() => openModal("update", rdv)}
                                  disabled={loading.update}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
                                >
                                  {loading.update ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Edit2 className="w-3.5 h-3.5" />
                                  )}
                                  Modifier
                                </button>
                              )}

                            {rdv.status === RendezvousStatus.CONFIRMED && (
                              <button
                                onClick={() => openModal("complete", rdv)}
                                disabled={loading.complete}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              >
                                {loading.complete ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Terminer
                              </button>
                            )}

                            {rdv.status === RendezvousStatus.CONFIRMED && (
                              <button
                                onClick={() => handleSetPending(rdv.id)}
                                disabled={loading.update}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                              >
                                {loading.update ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                Mettre en attente
                              </button>
                            )}

                            {rdv.status === RendezvousStatus.PENDING && (
                              <button
                                onClick={() => handleConfirm(rdv.id)}
                                disabled={loading.update}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
                              >
                                {loading.update ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Confirmer
                              </button>
                            )}

                            {rdv.canCancel &&
                              rdv.status !== RendezvousStatus.COMPLETED && (
                                <button
                                  onClick={() => openModal("cancel", rdv)}
                                  disabled={loading.cancel}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                                >
                                  {loading.cancel ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Ban className="w-3.5 h-3.5" />
                                  )}
                                  Annuler
                                </button>
                              )}

                            {rdv.status !== RendezvousStatus.CANCELLED &&
                              rdv.status !== RendezvousStatus.COMPLETED && (
                                <button
                                  onClick={() => handleDelete(rdv.id)}
                                  disabled={loading.delete}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto disabled:opacity-50"
                                >
                                  {loading.delete ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                  Supprimer
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm">
                <p className="text-sm text-gray-500">
                  Page{" "}
                  <span className="font-semibold text-gray-900">
                    {pagination.page}
                  </span>{" "}
                  / {pagination.totalPages}
                  <span className="ml-2 text-gray-400">
                    · {pagination.total} rendez-vous
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changePage(pagination.page - 1)}
                    disabled={!pagination.hasPrevious || loading.list}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 5) },
                    (_, i) => {
                      let page = pagination.page;
                      if (pagination.totalPages <= 5) {
                        page = i + 1;
                      } else if (pagination.page <= 3) {
                        page = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        page = pagination.totalPages - 4 + i;
                      } else {
                        page = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => changePage(page)}
                          disabled={loading.list}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            page === pagination.page
                              ? "bg-sky-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    },
                  )}
                  <button
                    onClick={() => changePage(pagination.page + 1)}
                    disabled={!pagination.hasNext || loading.list}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DÉTAIL */}
      {modal.type === "detail" && modal.rdv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Détails du rendez-vous" onClose={closeModal} />
            <div className="p-6 space-y-5">
              {loading.details ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-linear-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {getInitials(modal.rdv.firstName, modal.rdv.lastName)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        {modal.rdv.firstName} {modal.rdv.lastName}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <StatusBadge status={modal.rdv.status} />
                        {modal.rdv.isToday && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      {
                        Icon: Mail,
                        label: "Email",
                        value: modal.rdv.email,
                      },
                      {
                        Icon: Phone,
                        label: "Téléphone",
                        value: modal.rdv.telephone,
                      },
                      {
                        Icon: MapPin,
                        label: "Destination",
                        value: displayEffectiveValue(
                          modal.rdv.effectiveDestination,
                        ),
                      },
                      {
                        Icon: GraduationCap,
                        label: "Niveau",
                        value: displayEffectiveValue(
                          modal.rdv.effectiveNiveauEtude,
                        ),
                      },
                      {
                        Icon: BookOpen,
                        label: "Filière",
                        value: displayEffectiveValue(
                          modal.rdv.effectiveFiliere,
                        ),
                      },
                      {
                        Icon: Calendar,
                        label: "Date",
                        value: modal.rdv.date,
                      },
                      {
                        Icon: Clock,
                        label: "Heure",
                        value: timeSlotToDisplay(modal.rdv.time),
                      },
                    ].map(({ Icon, label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs">{label}</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {value || "Non renseigné"}
                        </p>
                      </div>
                    ))}

                    {modal.rdv.avisAdmin && (
                      <div
                        className={`rounded-xl p-3 col-span-2 border ${
                          modal.rdv.avisAdmin === AdminOpinion.FAVORABLE
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          {modal.rdv.avisAdmin === AdminOpinion.FAVORABLE ? (
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className="text-xs">Avis admin</span>
                        </div>
                        <p className="font-semibold text-sm">
                          {AdminOpinionLabels[modal.rdv.avisAdmin]}
                        </p>
                      </div>
                    )}

                    {modal.rdv.cancellationReason && (
                      <div className="bg-red-50 rounded-xl p-3 col-span-2 border border-red-100">
                        <p className="text-xs text-red-400 mb-1">
                          Raison d'annulation
                        </p>
                        <p className="text-sm text-red-700">
                          {modal.rdv.cancellationReason}
                        </p>
                      </div>
                    )}

                    {modal.rdv.user && (
                      <div className="bg-sky-50 rounded-xl p-3 col-span-2 border border-sky-100">
                        <p className="text-xs text-sky-400 mb-1">
                          Compte utilisateur lié
                        </p>
                        <p className="text-sm font-semibold text-sky-800">
                          {modal.rdv.user.fullName}
                        </p>
                        <p className="text-xs text-sky-600">
                          {modal.rdv.user.email}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {modal.rdv.status === RendezvousStatus.CONFIRMED && (
                      <button
                        onClick={() => {
                          closeModal();
                          openModal("complete", modal.rdv!);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Terminer
                      </button>
                    )}
                    {modal.rdv.canCancel && (
                      <button
                        onClick={() => {
                          closeModal();
                          openModal("cancel", modal.rdv!);
                        }}
                        className="flex-1 py-2.5 border border-amber-300 text-amber-700 rounded-xl text-sm hover:bg-amber-50 transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    {modal.rdv.canModify && (
                      <button
                        onClick={() => {
                          closeModal();
                          openModal("update", modal.rdv!);
                        }}
                        className="flex-1 py-2.5 border border-sky-300 text-sky-700 rounded-xl text-sm hover:bg-sky-50 transition-colors"
                      >
                        Modifier
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TERMINER */}
      {modal.type === "complete" && modal.rdv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Terminer le rendez-vous" onClose={closeModal} />
            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {modal.rdv.fullName}
                </span>
                <span className="mx-2 text-gray-400">·</span>
                {modal.rdv.date} à {timeSlotToDisplay(modal.rdv.time)}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Avis administrateur *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [AdminOpinion.FAVORABLE, AdminOpinion.UNFAVORABLE] as const
                  ).map((op) => (
                    <button
                      key={op}
                      onClick={() => setCompleteOpinion(op)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        completeOpinion === op
                          ? op === AdminOpinion.FAVORABLE
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-red-400 bg-red-50 text-red-700 shadow-sm"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {op === AdminOpinion.FAVORABLE ? (
                        <>
                          <ThumbsUp className="w-4 h-4" /> Favorable
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="w-4 h-4" /> Défavorable
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire{" "}
                  <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={completeComment}
                  onChange={(e) => setCompleteComment(e.target.value)}
                  rows={3}
                  placeholder="Notes sur la consultation…"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleComplete}
                  disabled={loading.complete}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading.complete ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Confirmer
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANNULER */}
      {modal.type === "cancel" && modal.rdv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Annuler le rendez-vous" onClose={closeModal} />
            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                Cette action annulera le rendez-vous de{" "}
                <span className="font-semibold">{modal.rdv.fullName}</span>. Le
                client sera notifié.
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Expliquez la raison…"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {cancelReason.length}/500
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={loading.cancel || !cancelReason.trim()}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading.cancel ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Confirmer l'annulation
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉER */}
      {modal.type === "create" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Créer un rendez-vous" onClose={closeModal} />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={createForm.telephone}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        telephone: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Destination *
                </label>
                <select
                  value={createForm.destination}
                  onChange={(e) => {
                    const value = e.target.value;
                    setShowOtherDestinationCreate(value === "Autre");
                    setCreateForm({
                      ...createForm,
                      destination: value,
                      destinationAutre:
                        value !== "Autre" ? "" : createForm.destinationAutre,
                    });
                  }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-none focus:outline-none focus:border-sky-500"
                  disabled={loadingDestinations}
                >
                  <option value="">Sélectionner</option>
                  {destinations.map((dest: { id: string; country: string }) => (
                    <option key={dest.id} value={dest.country}>
                      {dest.country}
                    </option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>

                {showOtherDestinationCreate && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={createForm.destinationAutre || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          destinationAutre: e.target.value,
                        })
                      }
                      placeholder="Précisez la destination"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Niveau d'étude *
                  </label>
                  <select
                    value={createForm.niveauEtude}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShowOtherNiveauCreate(value === "Autre");
                      setCreateForm({
                        ...createForm,
                        niveauEtude: value,
                        niveauEtudeAutre:
                          value !== "Autre" ? "" : createForm.niveauEtudeAutre,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {NIVEAU_ETUDE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  {showOtherNiveauCreate && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={createForm.niveauEtudeAutre || ""}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            niveauEtudeAutre: e.target.value,
                          })
                        }
                        placeholder="Précisez votre niveau"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Filière *
                  </label>
                  <select
                    value={createForm.filiere}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShowOtherFiliereCreate(value === "Autre");
                      setCreateForm({
                        ...createForm,
                        filiere: value,
                        filiereAutre:
                          value !== "Autre" ? "" : createForm.filiereAutre,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {FILIERE_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  {showOtherFiliereCreate && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={createForm.filiereAutre || ""}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            filiereAutre: e.target.value,
                          })
                        }
                        placeholder="Précisez la filière"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        date: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Créneau horaire *
                  </label>
                  <select
                    value={createForm.time}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        time: e.target.value as TimeSlot,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {TIME_SLOT_OPTIONS.map((time) => (
                      <option
                        key={time}
                        value={`SLOT_${time.replace(":", "")}` as TimeSlot}
                      >
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={loading.create}
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading.create ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Créer
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER */}
      {modal.type === "update" && modal.rdv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Modifier le rendez-vous" onClose={closeModal} />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["firstName", "lastName"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {field === "firstName" ? "Prénom" : "Nom"}
                    </label>
                    <input
                      type="text"
                      value={editForm[field]}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          [field]: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editForm.telephone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, telephone: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Heure
                  </label>
                  <select
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        time: e.target.value as TimeSlot,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {TIME_SLOT_OPTIONS.map((t) => (
                      <option
                        key={t}
                        value={`SLOT_${t.replace(":", "")}` as TimeSlot}
                      >
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Niveau d'étude
                  </label>
                  <select
                    value={editForm.niveauEtude}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShowOtherNiveau(value === "Autre");
                      setEditForm({
                        ...editForm,
                        niveauEtude: value,
                        niveauEtudeAutre:
                          value !== "Autre" ? "" : editForm.niveauEtudeAutre,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {NIVEAU_ETUDE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  {showOtherNiveau && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editForm.niveauEtudeAutre || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            niveauEtudeAutre: e.target.value,
                          })
                        }
                        placeholder="Précisez votre niveau"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Filière
                  </label>
                  <select
                    value={editForm.filiere}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShowOtherFiliere(value === "Autre");
                      setEditForm({
                        ...editForm,
                        filiere: value,
                        filiereAutre:
                          value !== "Autre" ? "" : editForm.filiereAutre,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {FILIERE_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  {showOtherFiliere && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editForm.filiereAutre || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            filiereAutre: e.target.value,
                          })
                        }
                        placeholder="Précisez votre filière"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Destination
                </label>
                <div className="relative">
                  <select
                    value={editForm.destination}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShowOtherDestination(value === "Autre");
                      setEditForm({
                        ...editForm,
                        destination: value,
                        destinationAutre:
                          value !== "Autre" ? "" : editForm.destinationAutre,
                      });
                    }}
                    className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Sélectionner</option>
                    {DESTINATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {showOtherDestination && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={editForm.destinationAutre || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          destinationAutre: e.target.value,
                        })
                      }
                      placeholder="Précisez votre destination"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdate}
                  disabled={loading.update}
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading.update ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Edit2 className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        title="Supprimer le rendez-vous"
        content="Êtes-vous sûr de vouloir supprimer ce rendez-vous définitivement ? Cette action est irréversible."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        open={confirmModal.open}
      />
    </>
  );
};

export default RendezvousAdmin;
