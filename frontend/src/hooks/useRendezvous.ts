// ============================================================
// useRendezvous.ts
// Version alignée strictement sur le backend
// Structure: COMMUN > USER > ADMIN
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  userRendezvousService,
  adminRendezvousService,
} from "../services/rendezvous.service";
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

// ==================== TYPES COMMUNS ====================

interface LoadingState {
  list: boolean;
  details: boolean;
  create: boolean;
  update: boolean;
  cancel: boolean;
  complete: boolean;
  delete: boolean;
  availability: boolean;
  slots: boolean;
  dates: boolean;
  statistics: boolean;
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ==================== OPTIONS TYPES ====================

interface UseBaseRendezvousOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
}

interface UseUserRendezvousOptions extends UseBaseRendezvousOptions {
  userEmail?: string;
}

interface UseAdminRendezvousOptions extends UseBaseRendezvousOptions {
  initialQuery?: RendezvousQueryDto;
  autoLoadList?: boolean;
}

interface UseRendezvousOptions extends UseBaseRendezvousOptions {
  userEmail?: string;
  initialQuery?: RendezvousQueryDto;
  autoLoadList?: boolean;
}

// ==================== HOOK DE BASE (COMMUN) ====================

const useBaseRendezvous = (options: UseBaseRendezvousOptions = {}) => {
  const { refreshInterval = 0 } = options;

  const [loading, setLoading] = useState<LoadingState>({
    list: false,
    details: false,
    create: false,
    update: false,
    cancel: false,
    complete: false,
    delete: false,
    availability: false,
    slots: false,
    dates: false,
    statistics: false,
  });

  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const setLoadingKey = useCallback(
    (key: keyof LoadingState, value: boolean) => {
      setLoading((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleError = useCallback((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Une erreur est survenue";
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setupRefreshInterval = useCallback(
    (callback: () => void) => {
      if (refreshInterval > 0) {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = setInterval(callback, refreshInterval);
      }
    },
    [refreshInterval],
  );

  const cleanupRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanupRefreshInterval;
  }, [cleanupRefreshInterval]);

  return {
    loading,
    setLoadingKey,
    error,
    setError,
    handleError,
    clearError,
    setupRefreshInterval,
    cleanupRefreshInterval,
  };
};

// ==================== HOOK UTILISATEUR ====================

export const useUserRendezvous = (options: UseUserRendezvousOptions = {}) => {
  const { autoLoad = true, refreshInterval = 0, userEmail } = options;
  const { user } = useAuth();
  const base = useBaseRendezvous({ refreshInterval });

  const [userRendezvous, setUserRendezvous] = useState<RendezvousResponseDto[]>(
    [],
  );
  const [selectedRendezvous, setSelectedRendezvous] =
    useState<RendezvousResponseDto | null>(null);
  const [availableSlots, setAvailableSlots] =
    useState<AvailableSlotsDto | null>(null);
  const [availableDates, setAvailableDates] = useState<
    AvailableDatesResponseDto[]
  >([]);
  const [availabilityCheck, setAvailabilityCheck] =
    useState<AvailabilityCheckDto | null>(null);

  const email = userEmail || user?.email;

  // ==================== MÉTHODES ====================

  const loadUserRendezvous = useCallback(async () => {
    if (!email) {
      base.setError("Aucun email fourni");
      return;
    }

    base.setLoadingKey("list", true);
    base.clearError();

    try {
      const data = await userRendezvousService.getRendezvousByEmail(email);
      setUserRendezvous(data);
      return data;
    } catch (err) {
      base.handleError(err);
      return [];
    } finally {
      base.setLoadingKey("list", false);
    }
  }, [email, base]);

  const getRendezvousById = useCallback(
    async (id: string) => {
      base.setLoadingKey("details", true);
      base.clearError();

      try {
        const data = await userRendezvousService.getRendezvousById(id);
        setSelectedRendezvous(data);
        return data;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("details", false);
      }
    },
    [base],
  );

  const getAvailableSlots = useCallback(
    async (date: Date | string) => {
      base.setLoadingKey("slots", true);
      base.clearError();

      try {
        const data = await userRendezvousService.getAvailableSlots(date);
        setAvailableSlots(data);
        return data;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("slots", false);
      }
    },
    [base],
  );

  const getAvailableDates = useCallback(
    async (startDate?: Date | string, endDate?: Date | string) => {
      base.setLoadingKey("dates", true);
      base.clearError();

      try {
        const data = await userRendezvousService.getAvailableDates(
          startDate,
          endDate,
        );
        setAvailableDates(data);
        return data;
      } catch (err) {
        base.handleError(err);
        return [];
      } finally {
        base.setLoadingKey("dates", false);
      }
    },
    [base],
  );

  const checkAvailability = useCallback(
    async (date: Date | string, time: TimeSlot) => {
      base.setLoadingKey("availability", true);
      base.clearError();

      try {
        const data = await userRendezvousService.checkAvailability(date, time);
        setAvailabilityCheck(data);
        return data;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("availability", false);
      }
    },
    [base],
  );

  const createRendezvous = useCallback(
    async (data: CreateRendezvousDto) => {
      base.setLoadingKey("create", true);
      base.clearError();

      try {
        const newRendezvous =
          await userRendezvousService.createRendezvous(data);
        if (email && data.email === email) {
          setUserRendezvous((prev) => [...prev, newRendezvous]);
        }
        return newRendezvous;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("create", false);
      }
    },
    [email, base],
  );

  const cancelRendezvous = useCallback(
    async (id: string, reason: string) => {
      base.setLoadingKey("cancel", true);
      base.clearError();

      try {
        const data: CancelRendezvousDto = { reason, cancelledBy: "USER" };
        const updated = await userRendezvousService.cancelRendezvous(id, data);

        setUserRendezvous((prev) =>
          prev.map((rdv) => (rdv.id === id ? updated : rdv)),
        );

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(updated);
        }

        return updated;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("cancel", false);
      }
    },
    [selectedRendezvous, base],
  );

  const refresh = useCallback(async () => {
    await loadUserRendezvous();
  }, [loadUserRendezvous]);

  useEffect(() => {
    if (autoLoad && email) {
      loadUserRendezvous();
    }
  }, [autoLoad, email, loadUserRendezvous]);

  useEffect(() => {
    if (refreshInterval > 0 && email) {
      base.setupRefreshInterval(refresh);
      return base.cleanupRefreshInterval;
    }
  }, [refreshInterval, email, refresh, base]);

  return {
    // State
    userRendezvous,
    selectedRendezvous,
    availableSlots,
    availableDates,
    availabilityCheck,
    loading: base.loading,
    error: base.error,

    // Methods
    loadUserRendezvous,
    getRendezvousById,
    getAvailableSlots,
    getAvailableDates,
    checkAvailability,
    createRendezvous,
    cancelRendezvous,
    refresh,
    clearError: base.clearError,
    setSelectedRendezvous,
  };
};

// ==================== HOOK ADMINISTRATEUR ====================

export const useAdminRendezvous = (options: UseAdminRendezvousOptions = {}) => {
  const { autoLoadList = true, refreshInterval = 0, initialQuery } = options;
  const base = useBaseRendezvous({ refreshInterval });

  const [rendezvousList, setRendezvousList] = useState<RendezvousResponseDto[]>(
    [],
  );
  const [selectedRendezvous, setSelectedRendezvous] =
    useState<RendezvousResponseDto | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [statistics, setStatistics] = useState<RendezvousStatisticsDto | null>(
    null,
  );
  const [query, setQuery] = useState<RendezvousQueryDto>(
    initialQuery || { page: 1, limit: 20 },
  );

  // ==================== MÉTHODES ====================

  const searchRendezvous = useCallback(
    async (searchQuery?: RendezvousQueryDto) => {
      const currentQuery = searchQuery || query;
      base.setLoadingKey("list", true);
      base.clearError();

      try {
        const result =
          await adminRendezvousService.searchRendezvous(currentQuery);
        setRendezvousList(result.data);
        setPagination({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrevious: result.hasPrevious,
        });
        return result;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("list", false);
      }
    },
    [query, base],
  );

  const getRendezvousById = useCallback(
    async (id: string) => {
      base.setLoadingKey("details", true);
      base.clearError();

      try {
        const data = await adminRendezvousService.getRendezvousById(id);
        setSelectedRendezvous(data);
        return data;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("details", false);
      }
    },
    [base],
  );

  const getStatistics = useCallback(async () => {
    base.setLoadingKey("statistics", true);
    base.clearError();

    try {
      const data = await adminRendezvousService.getStatistics();
      setStatistics(data);
      return data;
    } catch (err) {
      base.handleError(err);
      throw err;
    } finally {
      base.setLoadingKey("statistics", false);
    }
  }, [base]);

  const updateRendezvous = useCallback(
    async (id: string, data: UpdateRendezvousDto) => {
      base.setLoadingKey("update", true);
      base.clearError();

      try {
        const updated = await adminRendezvousService.updateRendezvous(id, data);

        setRendezvousList((prev) =>
          prev.map((rdv) => (rdv.id === id ? updated : rdv)),
        );

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(updated);
        }

        return updated;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("update", false);
      }
    },
    [selectedRendezvous, base],
  );

  const completeRendezvous = useCallback(
    async (
      id: string,
      avisAdmin: "FAVORABLE" | "UNFAVORABLE",
      comments?: string,
    ) => {
      base.setLoadingKey("complete", true);
      base.clearError();

      try {
        const data: CompleteRendezvousDto = { avisAdmin, comments };
        const completed = await adminRendezvousService.completeRendezvous(
          id,
          data,
        );

        setRendezvousList((prev) =>
          prev.map((rdv) => (rdv.id === id ? completed : rdv)),
        );

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(completed);
        }

        return completed;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("complete", false);
      }
    },
    [selectedRendezvous, base],
  );

  const cancelRendezvous = useCallback(
    async (id: string, reason: string) => {
      base.setLoadingKey("cancel", true);
      base.clearError();

      try {
        const data: UpdateRendezvousDto = {
          status: "CANCELLED",
          cancellationReason: reason,
        };
        const updated = await adminRendezvousService.updateRendezvous(id, data);

        setRendezvousList((prev) =>
          prev.map((rdv) => (rdv.id === id ? updated : rdv)),
        );

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(updated);
        }

        return updated;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("cancel", false);
      }
    },
    [selectedRendezvous, base],
  );

  const deleteRendezvous = useCallback(
    async (id: string) => {
      base.setLoadingKey("delete", true);
      base.clearError();

      try {
        await adminRendezvousService.deleteRendezvous(id);
        setRendezvousList((prev) => prev.filter((rdv) => rdv.id !== id));

        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(null);
        }

        return true;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("delete", false);
      }
    },
    [selectedRendezvous, base],
  );

  const getUpcomingRendezvous = useCallback(
    async (limit = 10) => {
      base.setLoadingKey("list", true);
      base.clearError();

      try {
        const data = await adminRendezvousService.getUpcomingRendezvous(limit);
        return data;
      } catch (err) {
        base.handleError(err);
        return [];
      } finally {
        base.setLoadingKey("list", false);
      }
    },
    [base],
  );

  // ✅ AJOUT: Méthode createRendezvous pour admin
  const createRendezvous = useCallback(
    async (data: CreateRendezvousDto) => {
      base.setLoadingKey("create", true);
      base.clearError();

      try {
        // Utiliser le service utilisateur pour la création (car c'est un rendez-vous utilisateur)
        const newRendezvous =
          await userRendezvousService.createRendezvous(data);

        // Rafraîchir la liste
        await searchRendezvous();

        return newRendezvous;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("create", false);
      }
    },
    [base, searchRendezvous],
  );

  // ✅ AJOUT: Méthode getRendezvousByDate pour admin
  const getRendezvousByDate = useCallback(
    async (date: string) => {
      base.setLoadingKey("list", true);
      base.clearError();

      try {
        const data = await adminRendezvousService.getRendezvousByDate(date);
        return data;
      } catch (err) {
        base.handleError(err);
        return [];
      } finally {
        base.setLoadingKey("list", false);
      }
    },
    [base],
  );

  const exportToCSV = useCallback(
    async (filters?: RendezvousFilters) => {
      base.setLoadingKey("list", true);
      base.clearError();

      try {
        const csv = await adminRendezvousService.exportToCSV(filters);
        return csv;
      } catch (err) {
        base.handleError(err);
        throw err;
      } finally {
        base.setLoadingKey("list", false);
      }
    },
    [base],
  );

  const applyFilters = useCallback(
    (newFilters: Partial<RendezvousQueryDto>) => {
      const updatedQuery = { ...query, ...newFilters, page: 1 };
      setQuery(updatedQuery);
      searchRendezvous(updatedQuery);
    },
    [query, searchRendezvous],
  );

  const resetFilters = useCallback(() => {
    const defaultQuery: RendezvousQueryDto = {
      page: 1,
      limit: query.limit || 20,
    };
    setQuery(defaultQuery);
    searchRendezvous(defaultQuery);
  }, [query.limit, searchRendezvous]);

  const changePage = useCallback(
    (page: number) => {
      const newQuery = { ...query, page };
      setQuery(newQuery);
      searchRendezvous(newQuery);
    },
    [query, searchRendezvous],
  );

  const changeLimit = useCallback(
    (limit: number) => {
      const newQuery = { ...query, limit, page: 1 };
      setQuery(newQuery);
      searchRendezvous(newQuery);
    },
    [query, searchRendezvous],
  );

  const refresh = useCallback(async () => {
    await searchRendezvous();
    await getStatistics();
  }, [searchRendezvous, getStatistics]);

  useEffect(() => {
    if (autoLoadList) {
      searchRendezvous();
      getStatistics();
    }
  }, [autoLoadList, searchRendezvous, getStatistics]);

  useEffect(() => {
    if (refreshInterval > 0) {
      base.setupRefreshInterval(refresh);
      return base.cleanupRefreshInterval;
    }
  }, [refreshInterval, refresh, base]);

  return {
    // State
    rendezvousList,
    selectedRendezvous,
    pagination,
    statistics,
    query,
    loading: base.loading,
    error: base.error,

    // Methods
    searchRendezvous,
    getRendezvousById,
    getStatistics,
    updateRendezvous,
    completeRendezvous,
    cancelRendezvous,
    deleteRendezvous,
    getUpcomingRendezvous,
    exportToCSV,
    // ✅ AJOUT: Nouvelles méthodes admin
    createRendezvous,
    getRendezvousByDate,
    // Pagination
    changePage,
    changeLimit,
    // Filters
    applyFilters,
    resetFilters,
    // Refresh
    refresh,
    clearError: base.clearError,
    setSelectedRendezvous,
    setQuery,
  };
};

// ==================== HOOK COMBINÉ (COMMUN) ====================

export const useRendezvous = (options: UseRendezvousOptions = {}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const userHook = useUserRendezvous(options);
  const adminHook = useAdminRendezvous(options);

  if (isAdmin) {
    return {
      ...adminHook,
      isAdmin: true as const,
      isUser: false as const,
    };
  }

  return {
    ...userHook,
    isAdmin: false as const,
    isUser: true as const,
  };
};
