// ============================================================
// useRendezvous.ts
// Version alignée strictement sur le backend
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { rendezvousService } from "../services/rendezvous.service";
import { useAuth } from "./useAuth";
import type {
  TimeSlot,
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  CompleteRendezvousDto,
  RendezvousQueryDto,
  RendezvousResponseDto,
  RendezvousStatisticsDto,
  AvailableSlotsDto,
  AvailabilityCheckDto,
  AvailableDatesResponseDto,
  RendezvousFilters,
} from "../types/rendezvous.types";

interface UseRendezvousOptions {
  autoLoad?: boolean;
  initialParams?: RendezvousQueryDto;
  initialStartDate?: string;
  initialEndDate?: string;
  refreshInterval?: number;
}

interface LoadingState {
  list: boolean;
  details: boolean;
  statistics: boolean;
  create: boolean;
  update: boolean;
  cancel: boolean;
  complete: boolean;
  delete: boolean;
  availability: boolean;
  slots: boolean;
  dates: boolean;
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface UseRendezvousReturn {
  // État
  rendezvous: RendezvousResponseDto[];
  selectedRendezvous: RendezvousResponseDto | null;
  statistics: RendezvousStatisticsDto | null;
  availableSlots: AvailableSlotsDto[];
  availableDates: AvailableDatesResponseDto[];
  pagination: PaginationState;
  loading: LoadingState;
  error: string | null;
  filters: RendezvousFilters;

  // Actions utilisateur
  createRendezvous: (
    data: CreateRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  getRendezvousByEmail: (email: string) => Promise<RendezvousResponseDto[]>;
  cancelRendezvous: (
    id: string,
    data: CancelRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  checkAvailability: (
    date: string,
    time: TimeSlot,
  ) => Promise<AvailabilityCheckDto | null>;

  // Actions admin
  loadRendezvous: (params?: RendezvousQueryDto) => Promise<void>;
  loadRendezvousById: (id: string) => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadAvailableDates: (startDate?: string, endDate?: string) => Promise<void>;
  getAvailableDates: (
    startDate?: string,
    endDate?: string,
  ) => Promise<AvailableDatesResponseDto[]>;
  getAvailableSlots: (date: string) => Promise<AvailableSlotsDto>;
  updateRendezvous: (
    id: string,
    data: UpdateRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  completeRendezvous: (
    id: string,
    data: CompleteRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  deleteRendezvous: (id: string) => Promise<boolean>;
  getRendezvousByDate: (date: string) => Promise<RendezvousResponseDto[]>;
  refreshTodayRendezvous: () => Promise<void>;
  getUpcomingRendezvous: (limit?: number) => Promise<RendezvousResponseDto[]>;
  exportRendezvous: (filters?: RendezvousFilters) => Promise<string>;

  // Utilitaires
  clearSelectedRendezvous: () => void;
  setQueryParams: (params: Partial<RendezvousQueryDto>) => void;
  setFilters: (filters: RendezvousFilters) => void;
  resetFilters: () => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export const useRendezvous = (
  options: UseRendezvousOptions = {},
): UseRendezvousReturn => {
  const {
    autoLoad = true,
    initialParams = {},
    initialStartDate,
    initialEndDate,
    refreshInterval,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const initialParamsRef = useRef(initialParams);
  const initialStartDateRef = useRef(initialStartDate);
  const initialEndDateRef = useRef(initialEndDate);

  // État
  const [rendezvous, setRendezvous] = useState<RendezvousResponseDto[]>([]);
  const [selectedRendezvous, setSelectedRendezvous] =
    useState<RendezvousResponseDto | null>(null);
  const [statistics, setStatistics] = useState<RendezvousStatisticsDto | null>(
    null,
  );
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotsDto[]>([]);
  const [availableDates, setAvailableDates] = useState<
    AvailableDatesResponseDto[]
  >([]);
  const [filters, setFiltersState] = useState<RendezvousFilters>({});
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [loading, setLoading] = useState<LoadingState>({
    list: false,
    details: false,
    statistics: false,
    create: false,
    update: false,
    cancel: false,
    complete: false,
    delete: false,
    availability: false,
    slots: false,
    dates: false,
  });

  const setLoadingKey = (key: keyof LoadingState, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  const handleError = (err: unknown, defaultMessage: string): string => {
    const message = err instanceof Error ? err.message : defaultMessage;
    setError(message);
    return message;
  };

  // Helper pour obtenir les paramètres par défaut (PENDING + CONFIRMED)
  const getDefaultParams = useCallback((): RendezvousQueryDto => {
    return {
      page: 1,
      limit: 10,
      sortBy: "date",
      sortOrder: "desc",
    };
  }, []);

  // Helper pour filtrer par statuts actifs uniquement
  const getActiveParams = useCallback(
    (params: RendezvousQueryDto = {}): RendezvousQueryDto => {
      return {
        ...getDefaultParams(),
        ...params,
        // Si un statut est spécifié, l'utiliser, sinon laisser le backend appliquer le filtre par défaut
        ...(params.status ? {} : {}),
      };
    },
    [getDefaultParams],
  );

  // Actions admin
  const loadRendezvous = useCallback(
    async (params: RendezvousQueryDto = {}) => {
      if (!isAdmin) return;

      setLoadingKey("list", true);
      setError(null);

      try {
        // Utiliser les helpers pour garantir la logique par défaut du backend
        const mergedParams = getActiveParams(params);
        const res = await rendezvousService.searchRendezvous(mergedParams);

        setRendezvous(res.data || res);
        setPagination({
          total: res.total || (Array.isArray(res) ? res.length : 0),
          page: res.page || 1,
          limit: res.limit || 10,
          totalPages: res.totalPages || 1,
          hasNext: res.hasNext || false,
          hasPrevious: res.hasPrevious || false,
        });
      } catch (err) {
        handleError(err, "Erreur lors du chargement des rendez-vous");
      } finally {
        setLoadingKey("list", false);
      }
    },
    [isAdmin, getActiveParams],
  );

  const loadRendezvousById = useCallback(async (id: string) => {
    setLoadingKey("details", true);
    setError(null);

    try {
      const data = await rendezvousService.getRendezvousById(id);
      setSelectedRendezvous(data);
    } catch (err) {
      handleError(err, "Rendez-vous introuvable");
    } finally {
      setLoadingKey("details", false);
    }
  }, []);

  const loadStatistics = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingKey("statistics", true);

    try {
      const stats = await rendezvousService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error("Erreur chargement statistiques:", err);
    } finally {
      setLoadingKey("statistics", false);
    }
  }, [isAdmin]);

  const loadAvailableDates = useCallback(
    async (startDate?: string, endDate?: string) => {
      setLoadingKey("dates", true);

      try {
        const dates = await rendezvousService.getAvailableDates(
          startDate,
          endDate,
        );
        setAvailableDates(dates);
      } catch {
        setAvailableDates([]);
      } finally {
        setLoadingKey("dates", false);
      }
    },
    [],
  );

  const getAvailableDates = useCallback(
    async (
      startDate?: string,
      endDate?: string,
    ): Promise<AvailableDatesResponseDto[]> => {
      try {
        return await rendezvousService.getAvailableDates(startDate, endDate);
      } catch {
        return [];
      }
    },
    [],
  );

  const getAvailableSlots = useCallback(
    async (date: string): Promise<AvailableSlotsDto> => {
      setLoadingKey("slots", true);

      try {
        const slots = await rendezvousService.getAvailableSlots(date);

        // Normaliser la date pour la comparaison (YYYY-MM-DD)
        const normalizedDate = slots.date.split("T")[0];

        setAvailableSlots((prev) => {
          const exists = prev.some((s) => s.date === normalizedDate);
          if (exists) {
            return prev.map((s) =>
              s.date === normalizedDate
                ? { ...slots, date: normalizedDate }
                : s,
            );
          }
          return [...prev, { ...slots, date: normalizedDate }];
        });

        return slots;
      } catch {
        const defaultSlots: AvailableSlotsDto = {
          date: new Date().toISOString().split("T")[0],
          available: false,
          availableSlots: [],
          totalSlots: 16,
          occupiedSlots: 0,
        };
        return defaultSlots;
      } finally {
        setLoadingKey("slots", false);
      }
    },
    [],
  );

  const updateRendezvous = useCallback(
    async (
      id: string,
      data: UpdateRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAdmin) return null;

      setLoadingKey("update", true);

      try {
        const updated = await rendezvousService.updateRendezvous(id, data);

        setRendezvous((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );

        if (selectedRendezvous?.id === updated.id) {
          setSelectedRendezvous(updated);
        }

        return updated;
      } catch (err) {
        handleError(err, "Erreur lors de la mise à jour");
        return null;
      } finally {
        setLoadingKey("update", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  const getRendezvousByDate = useCallback(
    async (date: string): Promise<RendezvousResponseDto[]> => {
      if (!isAdmin) return [];

      try {
        return await rendezvousService.getRendezvousByDate(date);
      } catch {
        return [];
      }
    },
    [isAdmin],
  );

  const completeRendezvous = useCallback(
    async (
      id: string,
      data: CompleteRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAdmin) return null;

      setLoadingKey("complete", true);

      try {
        const completed = await rendezvousService.completeRendezvous(id, data);

        setRendezvous((prev) =>
          prev.map((r) => (r.id === completed.id ? completed : r)),
        );

        if (selectedRendezvous?.id === completed.id) {
          setSelectedRendezvous(completed);
        }

        return completed;
      } catch (err) {
        handleError(err, "Erreur lors de la validation");
        return null;
      } finally {
        setLoadingKey("complete", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  const deleteRendezvous = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAdmin) return false;

      setLoadingKey("delete", true);

      try {
        await rendezvousService.deleteRendezvous(id);

        setRendezvous((prev) => prev.filter((r) => r.id !== id));

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(null);
        }

        return true;
      } catch (err) {
        handleError(err, "Erreur lors de la suppression");
        return false;
      } finally {
        setLoadingKey("delete", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  const refreshTodayRendezvous = useCallback(async () => {
    if (!isAdmin) return;

    const today = new Date().toISOString().split("T")[0];
    try {
      const todayRdv = await rendezvousService.getRendezvousByDate(today);
      
      setRendezvous((prev) => [
        ...prev.filter((r) => r.date !== today),
        ...todayRdv,
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des rendez-vous du jour:", error);
    }
  }, [isAdmin]);

  const getUpcomingRendezvous = useCallback(
    async (limit = 10): Promise<RendezvousResponseDto[]> => {
      if (!isAdmin) return [];

      try {
        return await rendezvousService.getUpcomingRendezvous(limit);
      } catch {
        return [];
      }
    },
    [isAdmin],
  );

  const exportRendezvous = useCallback(
    async (filters?: RendezvousFilters): Promise<string> => {
      if (!isAdmin) return "";

      try {
        return await rendezvousService.exportToCSV(filters);
      } catch {
        return "";
      }
    },
    [isAdmin],
  );

  // Actions utilisateur
  const createRendezvous = useCallback(
    async (
      data: CreateRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAuthenticated) return null;

      setLoadingKey("create", true);

      try {
        return await rendezvousService.createRendezvous(data);
      } catch (err) {
        handleError(err, "Erreur lors de la création");
        return null;
      } finally {
        setLoadingKey("create", false);
      }
    },
    [isAuthenticated],
  );

  const getRendezvousByEmail = useCallback(
    async (email: string): Promise<RendezvousResponseDto[]> => {
      if (!isAuthenticated) return [];

      try {
        const data = await rendezvousService.getRendezvousByEmail(email);
        setRendezvous(data);
        return data;
      } catch {
        return [];
      }
    },
    [isAuthenticated],
  );

  const cancelRendezvous = useCallback(
    async (
      id: string,
      data: CancelRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAuthenticated) return null;

      setLoadingKey("cancel", true);

      try {
        const updated = await rendezvousService.cancelRendezvous(id, data);

        setRendezvous((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );

        if (selectedRendezvous?.id === updated.id) {
          setSelectedRendezvous(updated);
        }

        return updated;
      } catch (err) {
        handleError(err, "Erreur lors de l'annulation");
        return null;
      } finally {
        setLoadingKey("cancel", false);
      }
    },
    [isAuthenticated, selectedRendezvous],
  );

  const checkAvailability = useCallback(
    async (
      date: string,
      time: TimeSlot,
    ): Promise<AvailabilityCheckDto | null> => {
      setLoadingKey("availability", true);

      try {
        return await rendezvousService.checkAvailability(date, time);
      } catch {
        return null;
      } finally {
        setLoadingKey("availability", false);
      }
    },
    [],
  );

  // Utilitaires
  const clearSelectedRendezvous = useCallback(() => {
    setSelectedRendezvous(null);
  }, []);

  const setQueryParams = useCallback(
    (params: Partial<RendezvousQueryDto>) => {
      loadRendezvous({ ...initialParamsRef.current, ...params });
    },
    [loadRendezvous],
  );

  const setFilters = useCallback((newFilters: RendezvousFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Effet pour charger les rendez-vous quand les filtres changent
  useEffect(() => {
    if (!autoLoad || !isAuthenticated || !isAdmin) return;

    const timeoutId = setTimeout(() => {
      loadRendezvous(filters as RendezvousQueryDto);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    filters,
    autoLoad,
    isAuthenticated,
    isAdmin,
    loadRendezvous,
    loadStatistics,
  ]);

  const resetFilters = useCallback(() => {
    setFiltersState({});
    loadRendezvous(initialParamsRef.current);
  }, [loadRendezvous]);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      loadRendezvous({
        ...initialParamsRef.current,
        page: pagination.page + 1,
      });
    }
  }, [pagination.hasNext, pagination.page, loadRendezvous]);

  const previousPage = useCallback(() => {
    if (pagination.hasPrevious) {
      loadRendezvous({
        ...initialParamsRef.current,
        page: pagination.page - 1,
      });
    }
  }, [pagination.hasPrevious, pagination.page, loadRendezvous]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        loadRendezvous({ ...initialParamsRef.current, page });
      }
    },
    [pagination.totalPages, loadRendezvous],
  );

  const setLimit = useCallback(
    (limit: number) => {
      loadRendezvous({ ...initialParamsRef.current, limit, page: 1 });
    },
    [loadRendezvous],
  );

  // Effets
  useEffect(() => {
    if (!autoLoad || !isAuthenticated) return;

    if (isAdmin) {
      loadRendezvous(initialParamsRef.current);
      loadStatistics();
    }

    loadAvailableDates(initialStartDateRef.current, initialEndDateRef.current);
  }, [
    autoLoad,
    isAuthenticated,
    isAdmin,
    // Retirer les fonctions instables pour éviter la boucle
  ]);

  useEffect(() => {
    if (!refreshInterval || !isAdmin) return;

    const intervalId = setInterval(() => {
      refreshTodayRendezvous();
      loadStatistics(); // Toujours charger les stats même si statistics est null
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [
    refreshInterval,
    isAdmin,
    // Retirer les fonctions et objets instables
  ]);

  return {
    rendezvous,
    selectedRendezvous,
    statistics,
    availableSlots,
    availableDates,
    pagination,
    loading,
    error,
    filters,

    createRendezvous,
    getRendezvousByEmail,
    cancelRendezvous,
    checkAvailability,

    loadRendezvous,
    loadRendezvousById,
    loadStatistics,
    loadAvailableDates,
    getAvailableDates,
    getAvailableSlots,
    updateRendezvous,
    completeRendezvous,
    deleteRendezvous,
    getRendezvousByDate,
    refreshTodayRendezvous,
    getUpcomingRendezvous,
    exportRendezvous,

    clearSelectedRendezvous,
    setQueryParams,
    setFilters,
    resetFilters,
    nextPage,
    previousPage,
    goToPage,
    setLimit,
  };
};
