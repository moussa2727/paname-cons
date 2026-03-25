// hooks/useProcedures.ts
// STRICTEMENT CALQUÉ sur ProceduresService + procedures.types.ts

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ProceduresService,
  ProcedureValidation,
} from "../services/procedures.service";
import { useAuth } from "./useAuth";
import type {
  ProcedureResponseDto,
  PaginatedProcedureResponseDto,
  ProcedureStatisticsDto,
  CreateProcedureDto,
  UpdateProcedureDto,
  UpdateStepDto,
  ProcedureQueryDto,
  ProcedureFilters,
  ProcedureLoadingState,
  ProcedurePagination,
  StepName,
} from "../types/procedures.types";

// ─── Types du hook ────────────────────────────────────────────────────────────

export interface UseProceduresOptions {
  autoLoad?: boolean;
  shouldLoadStatistics?: boolean;
  initialQuery?: ProcedureQueryDto;
  refreshInterval?: number;
}

export interface UseProceduresState {
  procedures: ProcedureResponseDto[];
  selectedProcedure: ProcedureResponseDto | null;
  statistics: ProcedureStatisticsDto | null;
  overdue: ProcedureResponseDto[];
  loading: ProcedureLoadingState;
  error: string | null;
  query: ProcedureQueryDto;
  filters: ProcedureFilters;
  pagination: ProcedurePagination;
}

export interface UseProceduresActions {
  // Chargement
  loadProcedures: (q?: ProcedureQueryDto) => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadById: (id: string) => Promise<ProcedureResponseDto | null>;
  refresh: () => Promise<void>;

  // Navigation
  selectProcedure: (p: ProcedureResponseDto | null) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Filtres
  setQuery: (partial: Partial<ProcedureQueryDto>) => void;
  setFilters: (
    f: ProcedureFilters | ((prev: ProcedureFilters) => ProcedureFilters),
  ) => void;
  applyFilters: () => Promise<void>;
  resetFilters: () => void;

  // CRUD admin
  create: (data: CreateProcedureDto) => Promise<ProcedureResponseDto | null>;
  update: (
    id: string,
    data: UpdateProcedureDto,
  ) => Promise<ProcedureResponseDto | null>;
  updateStep: (
    id: string,
    stepName: StepName,
    data: UpdateStepDto,
  ) => Promise<ProcedureResponseDto | null>;
  addStep: (
    id: string,
    stepName: StepName,
  ) => Promise<ProcedureResponseDto | null>;
  remove: (id: string, reason?: string) => Promise<boolean>;
  completeProcedure: (id: string) => Promise<ProcedureResponseDto | null>;

  // Actions utilisateur
  cancelProcedure: (
    id: string,
    reason?: string,
  ) => Promise<ProcedureResponseDto | null>;

  // Lecture
  findByEmail: (email: string) => Promise<ProcedureResponseDto[]>;
  findByRendezvousId: (
    rendezVousId: string,
  ) => Promise<ProcedureResponseDto | null>;

  // Validation client
  validate: (data: Partial<CreateProcedureDto>) => Record<string, string>;
  isValid: (data: Partial<CreateProcedureDto>) => boolean;
}

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

const DEFAULT_QUERY: ProcedureQueryDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const DEFAULT_FILTERS: ProcedureFilters = {};

const DEFAULT_PAGINATION: ProcedurePagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const DEFAULT_LOADING: ProcedureLoadingState = {
  list: false,
  details: false,
  statistics: false,
  create: false,
  update: false,
  updateStep: false,
  delete: false,
  report: false,
  export: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProcedures(
  options: UseProceduresOptions = {},
): UseProceduresState & UseProceduresActions {
  const {
    autoLoad = true,
    shouldLoadStatistics = false,
    initialQuery = {},
    refreshInterval,
  } = options;

  const { user } = useAuth();
  const isAuthenticated = !!user;

  // ── State ─────────────────────────────────────────────────────────────────
  const [procedures, setProcedures] = useState<ProcedureResponseDto[]>([]);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureResponseDto | null>(null);
  const [statistics, setStatistics] = useState<ProcedureStatisticsDto | null>(
    null,
  );
  const [overdue, setOverdue] = useState<ProcedureResponseDto[]>([]);
  const [loading, setLoading] =
    useState<ProcedureLoadingState>(DEFAULT_LOADING);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryState] = useState<ProcedureQueryDto>({
    ...DEFAULT_QUERY,
    ...initialQuery,
  });
  const [filters, setFiltersState] =
    useState<ProcedureFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] =
    useState<ProcedurePagination>(DEFAULT_PAGINATION);

  const loadingRef = useRef(false);
  const isFirstRender = useRef(true);

  // ── Helpers ───────────────────────────────────────────────────────
  const setLoad = useCallback(
    (k: keyof ProcedureLoadingState, v: boolean) => {
      setLoading((prev: ProcedureLoadingState) => ({ ...prev, [k]: v }));
    },
    [],
  );

  // Debug pour suivre les changements de loading

  const syncPagination = useCallback((res: PaginatedProcedureResponseDto) => {
    if (!res) return;
    setPagination({
      total: res.total ?? 0,
      page: res.page ?? 1,
      limit: res.limit ?? 10,
      totalPages: res.totalPages ?? 0,
      hasNext: res.hasNext ?? false,
      hasPrevious: res.hasPrevious ?? false,
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // loadProcedures — GET /admin/procedures/all
  // ─────────────────────────────────────────────────────────────────────────
  const loadProcedures = useCallback(
    async (override?: ProcedureQueryDto) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoad("list", true);
      setError(null);

      try {
        // Pour les admins, on inclut toutes les procédures par défaut
        // sauf si le caller a explicitement passé includeCompleted: false
        const adminDefaults: Partial<ProcedureQueryDto> =
          user?.role === "ADMIN" && override?.includeCompleted === undefined
            ? { includeCompleted: true }
            : {};

        const merged = { ...adminDefaults, ...query, ...override };
        const res = await ProceduresService.findAll(merged);

        if (!res || !Array.isArray(res.data)) {
          setProcedures([]);
          syncPagination({
            data: [],
            total: 0,
            page: merged.page ?? 1,
            limit: merged.limit ?? 10,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
          });
          return;
        }

        setProcedures(res.data);
        syncPagination(res);
      } catch (err: unknown) {
        console.log("🔍 Error in loadProcedures:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement",
        );
      } finally {
        setLoad("list", false);
        loadingRef.current = false;
      }
    },
    [query, user?.role, setLoad, syncPagination],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // loadStatistics — GET /admin/procedures/statistics
  // ─────────────────────────────────────────────────────────────────────────
  const loadStatistics = useCallback(async () => {
    if (user?.role !== "ADMIN") return;

    setLoad("statistics", true);
    try {
      const stats = await ProceduresService.getStatistics();
      setStatistics(stats);
    } catch {
      // L'erreur est déjà notifiée via toast dans le service
    } finally {
      setLoad("statistics", false);
    }
  }, [user?.role, setLoad]);

  // ─────────────────────────────────────────────────────────────────────────
  // loadById — GET /procedures/:id/details
  // ─────────────────────────────────────────────────────────────────────────
  const loadById = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      setLoad("details", true);
      setError(null);
      try {
        const procedure = await ProceduresService.findById(id);
        setSelectedProcedure(procedure);
        return procedure;
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement",
        );
        return null;
      } finally {
        setLoad("details", false);
      }
    },
    [setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // refresh — recharge liste + stats en parallèle
  // ─────────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([loadProcedures(), loadStatistics()]);
  }, [loadProcedures, loadStatistics]);

  // ─────────────────────────────────────────────────────────────────────────
  // create — POST /admin/procedures/create
  // ─────────────────────────────────────────────────────────────────────────
  const create = useCallback(
    async (data: CreateProcedureDto): Promise<ProcedureResponseDto | null> => {
      setLoad("create", true);
      setError(null);
      try {
        const procedure = await ProceduresService.create(data);
        setProcedures((prev: ProcedureResponseDto[]) => [procedure, ...prev]);
        setPagination((prev: ProcedurePagination) => ({
          ...prev,
          total: prev.total + 1,
        }));
        await loadStatistics();
        return procedure;
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la création",
        );
        return null;
      } finally {
        setLoad("create", false);
      }
    },
    [loadStatistics, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // update — PATCH /procedures/:id/update
  // ─────────────────────────────────────────────────────────────────────────
  const update = useCallback(
    async (
      id: string,
      data: UpdateProcedureDto,
    ): Promise<ProcedureResponseDto | null> => {
      const original = procedures.find((p) => p.id === id) ?? null;

      setLoad("update", true);
      setError(null);
      try {
        const updated = await ProceduresService.update(id, data);
        setProcedures((prev: ProcedureResponseDto[]) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        return updated;
      } catch (err: unknown) {
        if (original)
          setProcedures((prev: ProcedureResponseDto[]) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        setError(
          err instanceof Error ? err.message : "Erreur lors de la mise à jour",
        );
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [procedures, selectedProcedure, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // updateStep — PATCH /admin/procedures/:id/steps/:stepName
  // ─────────────────────────────────────────────────────────────────────────
  const updateStep = useCallback(
    async (
      id: string,
      stepName: StepName,
      data: UpdateStepDto,
    ): Promise<ProcedureResponseDto | null> => {
      const original = procedures.find((p) => p.id === id) ?? null;

      setLoad("updateStep", true);
      setError(null);
      try {
        const updated = await ProceduresService.updateStep(id, stepName, data);
        setProcedures((prev: ProcedureResponseDto[]) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        return updated;
      } catch (err: unknown) {
        if (original)
          setProcedures((prev: ProcedureResponseDto[]) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour de l'étape",
        );
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [procedures, selectedProcedure, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // addStep — POST /admin/procedures/:id/steps/:stepName
  // ─────────────────────────────────────────────────────────────────────────
  const addStep = useCallback(
    async (
      id: string,
      stepName: StepName,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("updateStep", true);
      setError(null);
      try {
        const updated = await ProceduresService.addStep(id, stepName);
        setProcedures((prev: ProcedureResponseDto[]) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        return updated;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'ajout de l'étape",
        );
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [selectedProcedure, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // remove — DELETE /admin/procedures/:id/delete
  // ─────────────────────────────────────────────────────────────────────────
  const remove = useCallback(
    async (id: string, reason?: string): Promise<boolean> => {
      const original = procedures.find((p) => p.id === id) ?? null;

      // Optimistic update
      setProcedures((prev: ProcedureResponseDto[]) =>
        prev.filter((p) => p.id !== id),
      );
      setPagination((prev: ProcedurePagination) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      setLoad("delete", true);
      setError(null);
      try {
        await ProceduresService.remove(id, reason);
        if (selectedProcedure?.id === id) setSelectedProcedure(null);
        await loadStatistics();
        return true;
      } catch (err: unknown) {
        // Rollback
        if (original) {
          setProcedures((prev: ProcedureResponseDto[]) => [...prev, original]);
          setPagination((prev: ProcedurePagination) => ({
            ...prev,
            total: prev.total + 1,
          }));
        }
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression",
        );
        return false;
      } finally {
        setLoad("delete", false);
      }
    },
    [procedures, selectedProcedure, loadStatistics, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // cancelProcedure — PATCH /procedures/:id/cancel
  // ─────────────────────────────────────────────────────────────────────────
  const cancelProcedure = useCallback(
    async (
      id: string,
      reason?: string,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("delete", true);
      setError(null);
      try {
        const updated = await ProceduresService.cancel(id, reason);
        setProcedures((prev: ProcedureResponseDto[]) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        return updated;
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de l'annulation",
        );
        return null;
      } finally {
        setLoad("delete", false);
      }
    },
    [selectedProcedure, setLoad],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // findByEmail — GET /procedures/by-email/:email
  // ─────────────────────────────────────────────────────────────────────────
  const findByEmail = useCallback(
    async (email: string): Promise<ProcedureResponseDto[]> => {
      if (!isAuthenticated) return [];

      setLoad("list", true);
      setError(null);

      try {
        const data = await ProceduresService.findByEmail(email);
        setProcedures(data);
        syncPagination({
          data,
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        });
        return data;
      } catch {
        return [];
      } finally {
        setLoad("list", false);
      }
    },
    [isAuthenticated, setLoad, syncPagination],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // findByRendezvousId — GET /procedures/by-rendezvous/:rendezVousId
  // ─────────────────────────────────────────────────────────────────────────
  const findByRendezvousId = useCallback(
    async (rendezVousId: string): Promise<ProcedureResponseDto | null> => {
      try {
        return await ProceduresService.findByRendezvousId(rendezVousId);
      } catch {
        return null;
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Gestion des filtres & pagination
  // ─────────────────────────────────────────────────────────────────────────
  const setQuery = useCallback((partial: Partial<ProcedureQueryDto>) => {
    setQueryState((prev: ProcedureQueryDto) => ({
      ...prev,
      ...partial,
      page: 1,
    }));
  }, []);

  const setFilters = useCallback(
    (f: ProcedureFilters | ((prev: ProcedureFilters) => ProcedureFilters)) => {
      setFiltersState(f);
    },
    [],
  );

  const applyFilters = useCallback(async () => {
    try {
      const adminDefaults: Partial<ProcedureQueryDto> =
        user?.role === "ADMIN" ? { includeCompleted: true } : {};

      const res = await ProceduresService.findAll({
        ...adminDefaults,
        ...query,
        // Mapping ProcedureFilters → ProcedureQueryDto (noms identiques au backend)
        status: filters.status,
        email: filters.email,
        destination: filters.destination,
        filiere: filters.filiere,
        includeDeleted: filters.includeDeleted,
        includeCompleted: filters.includeCompleted ?? adminDefaults.includeCompleted,
        search: filters.searchTerm,          // searchTerm → search (nom du DTO backend)
        startDate: filters.dateRange?.start.toISOString().split("T")[0],
        endDate: filters.dateRange?.end.toISOString().split("T")[0],
      });
      setProcedures(res.data);
      syncPagination(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du filtrage");
    }
  }, [filters, query, user?.role, syncPagination]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setQueryState({ ...DEFAULT_QUERY, ...initialQuery });
  }, [initialQuery]);

  const setPage = useCallback(
    (page: number) =>
      setQueryState((prev: ProcedureQueryDto) => ({ ...prev, page })),
    [],
  );

  const setLimit = useCallback(
    (limit: number) =>
      setQueryState((prev: ProcedureQueryDto) => ({ ...prev, limit, page: 1 })),
    [],
  );

  // Validation (utilise ProcedureValidation)
  // ─────────────────────────────────────────────────────────────────────────
  const validate = useCallback(
    (data: Partial<CreateProcedureDto>) => ProcedureValidation.validate(data),
    [],
  );

  const isValid = useCallback(
    (data: Partial<CreateProcedureDto>) => ProcedureValidation.isValid(data),
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Terminer une procédure complète (toutes les étapes)
  // ─────────────────────────────────────────────────────────────────────────
  const completeProcedure = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      if (user?.role !== "ADMIN") return null;

      setLoad("update", true);
      setError(null);
      try {
        // Le backend va automatiquement déterminer le statut final
        const updated = await ProceduresService.completeProcedure(id);
        setProcedures((prev: ProcedureResponseDto[]) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        return updated;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la complétion de la procédure",
        );
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [
      user?.role,
      setLoad,
      selectedProcedure,
      setProcedures,
      setSelectedProcedure,
    ],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Chargement des procédures en retard
  // ─────────────────────────────────────────────────────────────────────────
  const loadOverdue = useCallback(async () => {
    try {
      const result = await ProceduresService.findAll({
        status: "IN_PROGRESS" as ProcedureQueryDto["status"],
        limit: 100,
        includeCompleted: false,
      });
      setOverdue(result.data.filter((p) => p.isOverdue));
    } catch {
      // Silently fail
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effets
  // ─────────────────────────────────────────────────────────────────────────

  // Chargement initial
  useEffect(() => {
    if (!autoLoad) return;
    const loadData = async () => {
      const promises: Promise<unknown>[] = [loadProcedures()];
      if (shouldLoadStatistics) promises.push(loadStatistics());
      await Promise.all(promises);
    };
    loadData();
  }, [autoLoad, shouldLoadStatistics, loadProcedures, loadStatistics]);

  // Rechargement quand le query change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const currentLoadProcedures = loadProcedures;
    currentLoadProcedures();
  }, [
    query.page,
    query.limit,
    query.status,
    query.search,
    query.sortBy,
    query.sortOrder,
    query.startDate,
    query.endDate,
    query.includeDeleted,
    query.includeCompleted,
    query.destination,
    query.filiere,
    query.email,
  ]);

  // Rafraîchissement périodique des procédures en retard
  useEffect(() => {
    if (!autoLoad || !refreshInterval) return;
    loadOverdue();
    const id = setInterval(loadOverdue, refreshInterval);
    return () => clearInterval(id);
  }, [autoLoad, refreshInterval, loadOverdue]);

  // ─────────────────────────────────────────────────────────────────────────
  // Retour du hook
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // State
    procedures,
    selectedProcedure,
    statistics,
    overdue,
    loading,
    error,
    query,
    filters,
    pagination,

    // Chargement
    loadProcedures,
    loadStatistics,
    loadById,
    refresh,

    // Navigation
    selectProcedure: setSelectedProcedure,
    setPage,
    setLimit,

    // Filtres
    setQuery,
    setFilters,
    applyFilters,
    resetFilters,

    // CRUD admin
    create,
    update,
    updateStep,
    addStep,
    remove,
    completeProcedure,

    // Actions utilisateur
    cancelProcedure,

    // Lecture
    findByEmail,
    findByRendezvousId,

    // Validation
    validate,
    isValid,
  };
}