// hooks/useProcedures.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { ProceduresService } from "../services/procedures.service";
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
  ExportFormat,
  StepResponseDto,
} from "../types/procedures.types";

// ─── Constantes ───────────────────────────────────────────────────────────────
const STEP_ORDER: StepName[] = [
  "DEMANDE_ADMISSION",
  "DEMANDE_VISA",
  "PREPARATIF_VOYAGE",
];

const DEFAULT_QUERY: ProcedureQueryDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

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
  export: false,
};

// ─── Types du hook ───────────────────────────────────────────────────────────
export interface UseProceduresReturn {
  // State
  procedures: ProcedureResponseDto[];
  selectedProcedure: ProcedureResponseDto | null;
  statistics: ProcedureStatisticsDto | null;
  overdue?: ProcedureResponseDto[];
  loading: ProcedureLoadingState;
  error: string | null;
  query: ProcedureQueryDto;
  filters: ProcedureFilters;
  pagination: ProcedurePagination;

  // Dérivés pour la page de détail
  canBeModified: boolean;
  canBeCancelled: boolean;
  canBeCompleted: boolean;
  hasRejectedStep: boolean;
  availableStepsToAdd: StepName[];
  sortedSteps: StepResponseDto[];

  // Actions de chargement
  loadProcedures: (q?: ProcedureQueryDto) => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadById: (id: string) => Promise<ProcedureResponseDto | null>;
  refresh: () => Promise<void>;

  // Navigation et filtres
  selectProcedure: (procedure: ProcedureResponseDto | null) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setQuery: (partial: Partial<ProcedureQueryDto>) => void;
  setFilters: (
    filters: ProcedureFilters | ((prev: ProcedureFilters) => ProcedureFilters),
  ) => void;
  applyFilters: () => Promise<void>;
  resetFilters: () => void;

  // CRUD Admin
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
  exportProcedures: (format: ExportFormat) => Promise<Blob | null>;

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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProcedures(): UseProceduresReturn {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isAuthenticated = !!user;

  // ── State ─────────────────────────────────────────────────────────────────
  const [procedures, setProcedures] = useState<ProcedureResponseDto[]>([]);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureResponseDto | null>(null);
  const [statistics, setStatistics] = useState<ProcedureStatisticsDto | null>(
    null,
  );
  const [loading, setLoading] =
    useState<ProcedureLoadingState>(DEFAULT_LOADING);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryState] = useState<ProcedureQueryDto>(DEFAULT_QUERY);
  const [filters, setFiltersState] = useState<ProcedureFilters>({});
  const [pagination, setPagination] =
    useState<ProcedurePagination>(DEFAULT_PAGINATION);

  // Refs
  const loadingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Nettoyage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Dérivés pour la page de détail ───────────────────────────────────────
  const canBeModified = selectedProcedure
    ? !["COMPLETED", "CANCELLED", "REJECTED"].includes(selectedProcedure.statut)
    : false;

  const canBeCancelled = selectedProcedure
    ? !["COMPLETED", "CANCELLED"].includes(selectedProcedure.statut)
    : false;

  const canBeCompleted = selectedProcedure?.statut === "IN_PROGRESS";

  const hasRejectedStep =
    selectedProcedure?.steps?.some((s) => s.statut === "REJECTED") ?? false;

  const existingStepNames = new Set(
    selectedProcedure?.steps?.map((s) => s.nom) ?? [],
  );
  const availableStepsToAdd = STEP_ORDER.filter(
    (s) => !existingStepNames.has(s),
  );

  const sortedSteps = [...(selectedProcedure?.steps ?? [])].sort(
    (a, b) => STEP_ORDER.indexOf(a.nom) - STEP_ORDER.indexOf(b.nom),
  );

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const setLoad = useCallback(
    (key: keyof ProcedureLoadingState, value: boolean) => {
      if (isMountedRef.current) {
        setLoading((prev) => ({ ...prev, [key]: value }));
      }
    },
    [],
  );

  const syncPagination = useCallback((res: PaginatedProcedureResponseDto) => {
    if (isMountedRef.current) {
      setPagination({
        total: res.total,
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages,
        hasNext: res.hasNext,
        hasPrevious: res.hasPrevious,
      });
    }
  }, []);

  // ─── loadProcedures (Admin) ───────────────────────────────────────────────
  const loadProcedures = useCallback(
    async (override?: ProcedureQueryDto) => {
      if (loadingRef.current || !isAdmin) return;
      loadingRef.current = true;
      setLoad("list", true);
      setError(null);

      try {
        const merged = { ...query, ...override };
        const res = await ProceduresService.findAll(merged);
        if (isMountedRef.current) {
          setProcedures(res.data);
          syncPagination(res);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        setLoad("list", false);
        loadingRef.current = false;
      }
    },
    [isAdmin, query, setLoad, syncPagination],
  );

  // ─── loadStatistics (Admin) ───────────────────────────────────────────────
  const loadStatistics = useCallback(async () => {
    if (!isAdmin) return;
    setLoad("statistics", true);

    try {
      const stats = await ProceduresService.getStatistics();
      if (isMountedRef.current) {
        setStatistics(stats);
      }
    } catch (err) {
      console.error("Error loading statistics:", err);
    } finally {
      setLoad("statistics", false);
    }
  }, [isAdmin, setLoad]);

  // ─── loadById (User + Admin) ──────────────────────────────────────────────
  const loadById = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      setLoad("details", true);
      setError(null);

      try {
        const procedure = await ProceduresService.findById(id);
        if (isMountedRef.current) {
          setSelectedProcedure(procedure);
        }
        return procedure;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
        return null;
      } finally {
        setLoad("details", false);
      }
    },
    [setLoad],
  );

  // ─── refresh ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([loadProcedures(), loadStatistics()]);
  }, [loadProcedures, loadStatistics]);

  // ─── create (Admin) ───────────────────────────────────────────────────────
  const create = useCallback(
    async (data: CreateProcedureDto): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;
      setLoad("create", true);
      setError(null);

      try {
        const procedure = await ProceduresService.create(data);
        if (isMountedRef.current) {
          setProcedures((prev) => [procedure, ...prev]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
          await loadStatistics();
        }
        return procedure;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de création");
        return null;
      } finally {
        setLoad("create", false);
      }
    },
    [isAdmin, loadStatistics, setLoad],
  );

  // ─── update (User + Admin) ────────────────────────────────────────────────
  const update = useCallback(
    async (
      id: string,
      data: UpdateProcedureDto,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("update", true);
      setError(null);

      const original = procedures.find((p) => p.id === id);

      try {
        const updated = await ProceduresService.update(id, data);
        if (isMountedRef.current) {
          setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
          if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        }
        return updated;
      } catch (err) {
        if (original && isMountedRef.current) {
          setProcedures((prev) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        }
        setError(err instanceof Error ? err.message : "Erreur de mise à jour");
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [procedures, selectedProcedure, setLoad],
  );

  // ─── updateStep (Admin) ───────────────────────────────────────────────────
  const updateStep = useCallback(
    async (
      id: string,
      stepName: StepName,
      data: UpdateStepDto,
    ): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;
      setLoad("updateStep", true);
      setError(null);

      const original = procedures.find((p) => p.id === id);

      try {
        const updated = await ProceduresService.updateStep(id, stepName, data);
        if (isMountedRef.current) {
          setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
          if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        }
        return updated;
      } catch (err) {
        if (original && isMountedRef.current) {
          setProcedures((prev) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        }
        setError(
          err instanceof Error
            ? err.message
            : "Erreur de mise à jour de l'étape",
        );
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [isAdmin, procedures, selectedProcedure, setLoad],
  );

  // ─── addStep (Admin) ──────────────────────────────────────────────────────
  const addStep = useCallback(
    async (
      id: string,
      stepName: StepName,
    ): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;
      setLoad("updateStep", true);
      setError(null);

      try {
        const updated = await ProceduresService.addStep(id, stepName);
        if (isMountedRef.current) {
          setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
          if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'ajout d'étape");
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [isAdmin, selectedProcedure, setLoad],
  );

  // ─── completeProcedure (Admin) ────────────────────────────────────────────
  const completeProcedure = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;

      const target = procedures.find((p) => p.id === id) ?? selectedProcedure;
      if (!target) return null;

      setLoad("update", true);
      setError(null);

      try {
        const stepsToComplete = target.steps.filter(
          (s) => s.statut === "IN_PROGRESS" || s.statut === "PENDING",
        );

        let lastUpdated: ProcedureResponseDto | null = null;
        for (const step of stepsToComplete) {
          lastUpdated = await ProceduresService.updateStep(id, step.nom, {
            statut: "COMPLETED",
          });
        }

        const result = lastUpdated ?? target;
        if (isMountedRef.current) {
          setProcedures((prev) => prev.map((p) => (p.id === id ? result : p)));
          if (selectedProcedure?.id === id) setSelectedProcedure(result);
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de complétion");
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [isAdmin, procedures, selectedProcedure, setLoad],
  );

  // ─── remove (Admin) ───────────────────────────────────────────────────────
  const remove = useCallback(
    async (id: string, reason?: string): Promise<boolean> => {
      if (!isAdmin) return false;

      const original = procedures.find((p) => p.id === id);

      // Optimistic update
      if (isMountedRef.current) {
        setProcedures((prev) => prev.filter((p) => p.id !== id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
      }

      setLoad("delete", true);
      setError(null);

      try {
        await ProceduresService.remove(id, reason);
        if (selectedProcedure?.id === id && isMountedRef.current) {
          setSelectedProcedure(null);
        }
        await loadStatistics();
        return true;
      } catch (err) {
        // Rollback
        if (original && isMountedRef.current) {
          setProcedures((prev) => [...prev, original]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }
        setError(err instanceof Error ? err.message : "Erreur de suppression");
        return false;
      } finally {
        setLoad("delete", false);
      }
    },
    [isAdmin, procedures, selectedProcedure, loadStatistics, setLoad],
  );

  // ─── exportProcedures (Admin) ─────────────────────────────────────────────
  const exportProcedures = useCallback(
    async (format: ExportFormat): Promise<Blob | null> => {
      if (!isAdmin) return null;
      setLoad("export", true);
      setError(null);

      try {
        return await ProceduresService.exportProcedures(format, query);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'export");
        return null;
      } finally {
        setLoad("export", false);
      }
    },
    [isAdmin, query, setLoad],
  );

  // ─── cancelProcedure (User + Admin) ───────────────────────────────────────
  const cancelProcedure = useCallback(
    async (
      id: string,
      reason?: string,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("update", true);
      setError(null);

      try {
        const updated = await ProceduresService.cancel(id, reason);
        if (isMountedRef.current) {
          setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
          if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'annulation");
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [selectedProcedure, setLoad],
  );

  // ─── findByEmail (User + Admin) ───────────────────────────────────────────
  const findByEmail = useCallback(
    async (email: string): Promise<ProcedureResponseDto[]> => {
      if (!isAuthenticated) return [];
      setLoad("list", true);

      try {
        const data = await ProceduresService.findByEmail(email);
        if (isMountedRef.current) {
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
        }
        return data;
      } catch {
        return [];
      } finally {
        setLoad("list", false);
      }
    },
    [isAuthenticated, setLoad, syncPagination],
  );

  // ─── findByRendezvousId (User + Admin) ────────────────────────────────────
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

  // ─── Gestion des filtres ──────────────────────────────────────────────────
  const setQuery = useCallback((partial: Partial<ProcedureQueryDto>) => {
    setQueryState((prev) => ({ ...prev, ...partial, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQueryState((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setFilters = useCallback(
    (f: ProcedureFilters | ((prev: ProcedureFilters) => ProcedureFilters)) => {
      setFiltersState(f);
    },
    [],
  );

  const applyFilters = useCallback(async () => {
    setLoad("list", true);
    try {
      const res = await ProceduresService.findAll({
        ...query,
        status: filters.status,
        email: filters.email,
        destination: filters.destination,
        filiere: filters.filiere,
        includeDeleted: filters.includeDeleted,
        includeCompleted: filters.includeCompleted,
        search: filters.searchTerm,
        startDate: filters.startDate?.toISOString().split("T")[0],
        endDate: filters.endDate?.toISOString().split("T")[0],
      });
      if (isMountedRef.current) {
        setProcedures(res.data);
        syncPagination(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de filtrage");
    } finally {
      setLoad("list", false);
    }
  }, [filters, query, setLoad, syncPagination]);

  const resetFilters = useCallback(() => {
    setFiltersState({});
    setQueryState(DEFAULT_QUERY);
  }, []);

  // ─── Effets ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin && isMountedRef.current) {
      loadProcedures();
      loadStatistics();
    }
  }, [isAdmin, loadProcedures, loadStatistics]);

  // Rechargement quand query change
  useEffect(() => {
    if (isAdmin && isMountedRef.current) {
      loadProcedures();
    }
  }, [
    isAdmin,
    loadProcedures,
    query.page,
    query.limit,
    query.status,
    query.search,
    query.sortBy,
    query.sortOrder,
  ]);

  return {
    // State
    procedures,
    selectedProcedure,
    statistics,
    loading,
    error,
    query,
    filters,
    pagination,

    // Dérivés
    canBeModified,
    canBeCancelled,
    canBeCompleted,
    hasRejectedStep,
    availableStepsToAdd,
    sortedSteps,

    // Actions de chargement
    loadProcedures,
    loadStatistics,
    loadById,
    refresh,

    // Navigation et filtres
    selectProcedure: setSelectedProcedure,
    setPage,
    setLimit,
    setQuery,
    setFilters,
    applyFilters,
    resetFilters,

    // CRUD Admin
    create,
    update,
    updateStep,
    addStep,
    remove,
    completeProcedure,
    exportProcedures,

    // Actions utilisateur
    cancelProcedure,

    // Lecture
    findByEmail,
    findByRendezvousId,
  };
}
