// ============================================================
// useRendezvous.ts
// Version anti-boucle - deps stables, fetch unique par rôle
// Structure: COMMUN > USER > ADMIN
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  userRendezvousService,
  adminRendezvousService,
} from "../services/rendezvous.service";
import { useAuth } from "./useAuth";
import type {
  RendezvousTimeHHMM,
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
  AdminOpinion,
} from "../types/rendezvous.types";

// ==================== TYPES ====================

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

interface UseUserRendezvousOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
  userEmail?: string;
}

interface UseAdminRendezvousOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
  initialQuery?: RendezvousQueryDto;
}

// ==================== HOOK UTILISATEUR ====================

export const useUserRendezvous = (options: UseUserRendezvousOptions = {}) => {
  const { autoLoad = true, refreshInterval = 0, userEmail } = options;
  const { user } = useAuth();

  const [userRendezvous, setUserRendezvous] = useState<RendezvousResponseDto[]>([]);
  const [selectedRendezvous, setSelectedRendezvous] = useState<RendezvousResponseDto | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotsDto | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDatesResponseDto[]>([]);
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityCheckDto | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    list: false, details: false, create: false, update: false,
    cancel: false, complete: false, delete: false,
    availability: false, slots: false, dates: false, statistics: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Refs stables — ne causent jamais de re-render
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref pour lire l'email courant dans l'interval sans le mettre en dep
  const emailRef = useRef<string | undefined>(undefined);

  const email = userEmail || user?.email;
  emailRef.current = email;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setLoadingKey = useCallback((key: keyof LoadingState, value: boolean) => {
    if (mountedRef.current) setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : "Une erreur est survenue";
    if (mountedRef.current) setError(message);
    console.error(`[UserRendezvous] ${message}`);
    return message;
  }, []);

  const clearError = useCallback(() => {
    if (mountedRef.current) setError(null);
  }, []);

  // ==================== FETCH INTERNE (stable - pas dans les deps publiques) ====================

  const fetchByEmail = useCallback(async (targetEmail: string) => {
    if (!targetEmail || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingKey("list", true);
    setError(null);
    try {
      const data = await userRendezvousService.getRendezvousByEmail(targetEmail);
      if (mountedRef.current) setUserRendezvous(data);
    } catch (err) {
      handleError(err);
    } finally {
      if (mountedRef.current) setLoadingKey("list", false);
      fetchingRef.current = false;
    }
  }, [setLoadingKey, handleError]);

  // ==================== MÉTHODES PUBLIQUES ====================

  const loadUserRendezvous = useCallback(async () => {
    if (!emailRef.current) { setError("Aucun email fourni"); return; }
    await fetchByEmail(emailRef.current);
  }, [fetchByEmail]);

  const getRendezvousById = useCallback(async (id: string): Promise<RendezvousResponseDto> => {
    setLoadingKey("details", true);
    setError(null);
    try {
      const data = await userRendezvousService.getRendezvousById(id);
      if (mountedRef.current) setSelectedRendezvous(data);
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("details", false);
    }
  }, [setLoadingKey, handleError]);

  const getAvailableSlots = useCallback(async (date: Date | string): Promise<AvailableSlotsDto> => {
    setLoadingKey("slots", true);
    setError(null);
    try {
      const data = await userRendezvousService.getAvailableSlots(date);
      if (mountedRef.current) setAvailableSlots(data);
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("slots", false);
    }
  }, [setLoadingKey, handleError]);

  const getAvailableDates = useCallback(async (
    startDate?: Date | string,
    endDate?: Date | string,
  ): Promise<AvailableDatesResponseDto[]> => {
    setLoadingKey("dates", true);
    setError(null);
    try {
      const data = await userRendezvousService.getAvailableDates(startDate, endDate);
      if (mountedRef.current) setAvailableDates(data);
      return data;
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      if (mountedRef.current) setLoadingKey("dates", false);
    }
  }, [setLoadingKey, handleError]);

  const checkAvailability = useCallback(async (
    date: Date | string,
    time: RendezvousTimeHHMM,
  ): Promise<AvailabilityCheckDto> => {
    setLoadingKey("availability", true);
    setError(null);
    try {
      const data = await userRendezvousService.checkAvailability(date, time);
      if (mountedRef.current) setAvailabilityCheck(data);
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("availability", false);
    }
  }, [setLoadingKey, handleError]);

  const createRendezvous = useCallback(async (data: CreateRendezvousDto): Promise<RendezvousResponseDto> => {
    setLoadingKey("create", true);
    setError(null);
    try {
      const newRdv = await userRendezvousService.createRendezvous(data);
      // Optimistic update local — pas de refetch global
      if (mountedRef.current && data.email === emailRef.current) {
        setUserRendezvous((prev) => [...prev, newRdv]);
      }
      return newRdv;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("create", false);
    }
  }, [setLoadingKey, handleError]);

  const cancelRendezvous = useCallback(async (id: string, reason: string): Promise<RendezvousResponseDto> => {
    setLoadingKey("cancel", true);
    setError(null);
    try {
      const dto: CancelRendezvousDto = { reason };
      const updated = await userRendezvousService.cancelRendezvous(id, dto);
      if (mountedRef.current) {
        setUserRendezvous((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setSelectedRendezvous((prev) => (prev?.id === id ? updated : prev));
      }
      return updated;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("cancel", false);
    }
  }, [setLoadingKey, handleError]);

  const refresh = useCallback(async () => {
    if (emailRef.current) await fetchByEmail(emailRef.current);
  }, [fetchByEmail]);

  // ==================== EFFETS ====================

  // Chargement initial unique — déclenché uniquement quand email devient disponible
  useEffect(() => {
    if (autoLoad && email && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchByEmail(email);
    }
    // Intentionnellement: email seul. fetchByEmail est stable (useCallback []).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Refresh interval — stable via emailRef, pas de dep sur email
  useEffect(() => {
    if (refreshInterval <= 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (emailRef.current && !fetchingRef.current) fetchByEmail(emailRef.current);
    }, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // Intentionnellement: refreshInterval seul. fetchByEmail est stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  return {
    userRendezvous,
    selectedRendezvous,
    availableSlots,
    availableDates,
    availabilityCheck,
    loading,
    error,
    loadUserRendezvous,
    getRendezvousById,
    getAvailableSlots,
    getAvailableDates,
    checkAvailability,
    createRendezvous,
    cancelRendezvous,
    refresh,
    clearError,
    setSelectedRendezvous,
  };
};

// ==================== HOOK ADMINISTRATEUR ====================

export const useAdminRendezvous = (options: UseAdminRendezvousOptions = {}) => {
  const { autoLoad = true, refreshInterval = 0, initialQuery } = options;

  const [rendezvousList, setRendezvousList] = useState<RendezvousResponseDto[]>([]);
  const [selectedRendezvous, setSelectedRendezvous] = useState<RendezvousResponseDto | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrevious: false,
  });
  const [statistics, setStatistics] = useState<RendezvousStatisticsDto | null>(null);
  const [query, setQuery] = useState<RendezvousQueryDto>(
    initialQuery ?? { page: 1, limit: 20 },
  );
  const [loading, setLoading] = useState<LoadingState>({
    list: false, details: false, create: false, update: false,
    cancel: false, complete: false, delete: false,
    availability: false, slots: false, dates: false, statistics: false,
  });
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetchingListRef = useRef(false);
  const fetchingStatsRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref pour lire la query courante dans les callbacks sans la mettre en dep
  const queryRef = useRef<RendezvousQueryDto>(query);
  queryRef.current = query;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setLoadingKey = useCallback((key: keyof LoadingState, value: boolean) => {
    if (mountedRef.current) setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : "Une erreur est survenue";
    if (mountedRef.current) setError(message);
    console.error(`[AdminRendezvous] ${message}`);
    return message;
  }, []);

  const clearError = useCallback(() => {
    if (mountedRef.current) setError(null);
  }, []);

  // ==================== FETCH INTERNES STABLES ====================

  const fetchList = useCallback(async (q: RendezvousQueryDto) => {
    if (fetchingListRef.current) return;
    fetchingListRef.current = true;
    setLoadingKey("list", true);
    setError(null);
    try {
      const result = await adminRendezvousService.searchRendezvous(q);
      if (mountedRef.current) {
        setRendezvousList(result.data);
        setPagination({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrevious: result.hasPrevious,
        });
      }
      return result;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("list", false);
      fetchingListRef.current = false;
    }
  }, [setLoadingKey, handleError]);

  const fetchStats = useCallback(async () => {
    if (fetchingStatsRef.current) return;
    fetchingStatsRef.current = true;
    setLoadingKey("statistics", true);
    setError(null);
    try {
      const data = await adminRendezvousService.getStatistics();
      if (mountedRef.current) setStatistics(data);
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("statistics", false);
      fetchingStatsRef.current = false;
    }
  }, [setLoadingKey, handleError]);

  // ==================== MÉTHODES PUBLIQUES ====================

  const searchRendezvous = useCallback(async (overrideQuery?: RendezvousQueryDto) => {
    return fetchList(overrideQuery ?? queryRef.current);
  }, [fetchList]);

  const getRendezvousById = useCallback(async (id: string): Promise<RendezvousResponseDto> => {
    setLoadingKey("details", true);
    setError(null);
    try {
      const data = await adminRendezvousService.getRendezvousById(id);
      if (mountedRef.current) setSelectedRendezvous(data);
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("details", false);
    }
  }, [setLoadingKey, handleError]);

  const getStatistics = useCallback(async () => {
    return fetchStats();
  }, [fetchStats]);

  const createRendezvous = useCallback(async (data: CreateRendezvousDto): Promise<RendezvousResponseDto> => {
    setLoadingKey("create", true);
    setError(null);
    try {
      const newRdv = await userRendezvousService.createRendezvous(data);
      // Refetch la liste courante pour rester cohérent avec la pagination
      await fetchList(queryRef.current);
      return newRdv;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("create", false);
    }
  }, [setLoadingKey, handleError, fetchList]);

  const updateRendezvous = useCallback(async (id: string, data: UpdateRendezvousDto): Promise<RendezvousResponseDto> => {
    setLoadingKey("update", true);
    setError(null);
    try {
      const updated = await adminRendezvousService.updateRendezvous(id, data);
      if (mountedRef.current) {
        setRendezvousList((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setSelectedRendezvous((prev) => (prev?.id === id ? updated : prev));
      }
      return updated;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("update", false);
    }
  }, [setLoadingKey, handleError]);

  const completeRendezvous = useCallback(async (
    id: string,
    avisAdmin: AdminOpinion,
    comments?: string,
  ): Promise<RendezvousResponseDto> => {
    setLoadingKey("complete", true);
    setError(null);
    try {
      const dto: CompleteRendezvousDto = { avisAdmin, comments };
      const completed = await adminRendezvousService.completeRendezvous(id, dto);
      if (mountedRef.current) {
        setRendezvousList((prev) => prev.map((r) => (r.id === id ? completed : r)));
        setSelectedRendezvous((prev) => (prev?.id === id ? completed : prev));
      }
      return completed;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("complete", false);
    }
  }, [setLoadingKey, handleError]);

  const cancelRendezvous = useCallback(async (id: string, reason: string): Promise<RendezvousResponseDto> => {
    setLoadingKey("cancel", true);
    setError(null);
    try {
      const dto: CancelRendezvousDto = { reason };
      const updated = await adminRendezvousService.cancelRendezvousAsAdmin(id, dto);
      if (mountedRef.current) {
        setRendezvousList((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setSelectedRendezvous((prev) => (prev?.id === id ? updated : prev));
      }
      return updated;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("cancel", false);
    }
  }, [setLoadingKey, handleError]);

  const deleteRendezvous = useCallback(async (id: string): Promise<void> => {
    setLoadingKey("delete", true);
    setError(null);
    try {
      await adminRendezvousService.deleteRendezvous(id);
      if (mountedRef.current) {
        setRendezvousList((prev) => prev.filter((r) => r.id !== id));
        setSelectedRendezvous((prev) => (prev?.id === id ? null : prev));
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("delete", false);
    }
  }, [setLoadingKey, handleError]);

  const getRendezvousByDate = useCallback(async (date: string): Promise<RendezvousResponseDto[]> => {
    setLoadingKey("list", true);
    setError(null);
    try {
      return await adminRendezvousService.getRendezvousByDate(date);
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      if (mountedRef.current) setLoadingKey("list", false);
    }
  }, [setLoadingKey, handleError]);

  const exportToCSV = useCallback(async (filters?: RendezvousFilters): Promise<string> => {
    setLoadingKey("list", true);
    setError(null);
    try {
      return await adminRendezvousService.exportToCSV(filters);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoadingKey("list", false);
    }
  }, [setLoadingKey, handleError]);

  // Navigation / filtres — mettent à jour query ET lancent le fetch en une seule opération
  const applyFilters = useCallback((newFilters: Partial<RendezvousQueryDto>) => {
    const updated = { ...queryRef.current, ...newFilters, page: 1 };
    setQuery(updated);
    fetchList(updated);
  }, [fetchList]);

  const resetFilters = useCallback(() => {
    const defaultQuery: RendezvousQueryDto = { page: 1, limit: queryRef.current.limit ?? 20 };
    setQuery(defaultQuery);
    fetchList(defaultQuery);
  }, [fetchList]);

  const changePage = useCallback((page: number) => {
    const updated = { ...queryRef.current, page };
    setQuery(updated);
    fetchList(updated);
  }, [fetchList]);

  const changeLimit = useCallback((limit: number) => {
    const updated = { ...queryRef.current, limit, page: 1 };
    setQuery(updated);
    fetchList(updated);
  }, [fetchList]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchList(queryRef.current), fetchStats()]);
  }, [fetchList, fetchStats]);

  // ==================== EFFETS ====================

  // Chargement initial unique — [] intentionnel, fetchList/fetchStats sont stables
  useEffect(() => {
    if (autoLoad && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchList(queryRef.current);
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh interval — stable via queryRef, pas de dep sur query
  useEffect(() => {
    if (refreshInterval <= 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!fetchingListRef.current && !fetchingStatsRef.current) {
        fetchList(queryRef.current);
        fetchStats();
      }
    }, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // Intentionnellement: refreshInterval seul. fetchList/fetchStats sont stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  return {
    rendezvousList,
    selectedRendezvous,
    pagination,
    statistics,
    query,
    loading,
    error,
    searchRendezvous,
    getRendezvousById,
    getStatistics,
    createRendezvous,
    updateRendezvous,
    completeRendezvous,
    cancelRendezvous,
    deleteRendezvous,
    getRendezvousByDate,
    exportToCSV,
    changePage,
    changeLimit,
    applyFilters,
    resetFilters,
    refresh,
    clearError,
    setSelectedRendezvous,
    setQuery,
  };
};

// ==================== HOOK COMBINÉ ====================
export const useRendezvous = (
  options: UseUserRendezvousOptions & UseAdminRendezvousOptions = {},
) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const userHook = useUserRendezvous(isAdmin ? { autoLoad: false } : options);
  const adminHook = useAdminRendezvous(isAdmin ? options : { autoLoad: false });

  if (isAdmin) {
    return { ...adminHook, isAdmin: true as const, isUser: false as const };
  }

  return { ...userHook, isAdmin: false as const, isUser: true as const };
};
