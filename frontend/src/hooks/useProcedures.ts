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
  const listLoadingRef = useRef(false);  // garde séparé pour la liste seulement
  const statsLoadedRef = useRef(false);  // stats chargées une fois au montage
  const isMountedRef = useRef(true);
  // Ref vers query pour l'accéder dans loadProcedures sans en faire une dépendance
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

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

  // Déwrappe l'enveloppe API { data: T } si présente, sinon retourne tel quel.
  const unwrapProcedure = useCallback((raw: unknown): ProcedureResponseDto => {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (
        "data" in obj &&
        obj.data &&
        typeof obj.data === "object" &&
        "id" in (obj.data as object)
      ) {
        return obj.data as ProcedureResponseDto;
      }
      if ("id" in obj) {
        return raw as ProcedureResponseDto;
      }
    }
    throw new Error("Réponse invalide : structure inattendue");
  }, []);

  // ─── loadProcedures ───────────────────────────────────────────────────────
  // Utilise queryRef pour lire query sans en faire une dépendance → pas de boucle.
  // Un override optionnel permet de passer une query ponctuelle (pagination, filtres…).
  const loadProcedures = useCallback(
    async (override?: ProcedureQueryDto) => {
      if (listLoadingRef.current || !isAdmin) return;
      listLoadingRef.current = true;
      setLoad("list", true);
      setError(null);

      try {
        const merged = { ...queryRef.current, ...override };
        const res = await ProceduresService.findAll(merged);
        if (isMountedRef.current) {
          setProcedures(Array.isArray(res.data) ? res.data : []);
          syncPagination(res);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        setLoad("list", false);
        listLoadingRef.current = false;
      }
    },
    // isAdmin : si le rôle change (connexion/déconnexion), on doit recréer la fonction.
    // setLoad et syncPagination sont stables (useCallback sans deps instables).
    // queryRef n'est pas une dépendance : c'est un ref, toujours à jour via l'effet ci-dessus.
    [isAdmin, setLoad, syncPagination],
  );

  // ─── loadStatistics ───────────────────────────────────────────────────────
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

  // ─── loadById ─────────────────────────────────────────────────────────────
  const loadById = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      setLoad("details", true);
      setError(null);

      try {
        const raw = await ProceduresService.findById(id);
        const procedure = unwrapProcedure(raw);
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
    [setLoad, unwrapProcedure],
  );

  // ─── refresh ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([loadProcedures(), loadStatistics()]);
  }, [loadProcedures, loadStatistics]);

  // ─── create ───────────────────────────────────────────────────────────────
  const create = useCallback(
    async (data: CreateProcedureDto): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;
      setLoad("create", true);
      setError(null);

      try {
        const procedure = unwrapProcedure(await ProceduresService.create(data));
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
    [isAdmin, loadStatistics, setLoad, unwrapProcedure],
  );

  // ─── update ───────────────────────────────────────────────────────────────
  const update = useCallback(
    async (
      id: string,
      data: UpdateProcedureDto,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("update", true);
      setError(null);

      const original = procedures.find((p) => p.id === id);

      try {
        const updated = unwrapProcedure(await ProceduresService.update(id, data));
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
    [procedures, selectedProcedure, setLoad, unwrapProcedure],
  );

  // ─── updateStep ───────────────────────────────────────────────────────────
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
        const updated = unwrapProcedure(
          await ProceduresService.updateStep(id, stepName, data),
        );
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
    [isAdmin, procedures, selectedProcedure, setLoad, unwrapProcedure],
  );

  // ─── addStep ──────────────────────────────────────────────────────────────
  const addStep = useCallback(
    async (
      id: string,
      stepName: StepName,
    ): Promise<ProcedureResponseDto | null> => {
      if (!isAdmin) return null;
      setLoad("updateStep", true);
      setError(null);

      try {
        const updated = unwrapProcedure(
          await ProceduresService.addStep(id, stepName),
        );
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
    [isAdmin, selectedProcedure, setLoad, unwrapProcedure],
  );

  // ─── completeProcedure ────────────────────────────────────────────────────
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
          lastUpdated = unwrapProcedure(
            await ProceduresService.updateStep(id, step.nom, {
              statut: "COMPLETED",
            }),
          );
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
    [isAdmin, procedures, selectedProcedure, setLoad, unwrapProcedure],
  );

  // ─── remove ───────────────────────────────────────────────────────────────
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

  // ─── exportProcedures ─────────────────────────────────────────────────────
  const exportProcedures = useCallback(
    async (format: ExportFormat): Promise<Blob | null> => {
      if (!isAdmin) return null;
      setLoad("export", true);
      setError(null);

      try {
        return await ProceduresService.exportProcedures(format, queryRef.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'export");
        return null;
      } finally {
        setLoad("export", false);
      }
    },
    [isAdmin, setLoad],
  );

  // ─── cancelProcedure ──────────────────────────────────────────────────────
  const cancelProcedure = useCallback(
    async (
      id: string,
      reason?: string,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("update", true);
      setError(null);

      try {
        const updated = unwrapProcedure(
          await ProceduresService.cancel(id, reason),
        );
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
    [selectedProcedure, setLoad, unwrapProcedure],
  );

  // ─── findByEmail ──────────────────────────────────────────────────────────
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

  // ─── findByRendezvousId ───────────────────────────────────────────────────
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
        ...queryRef.current,
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
        setProcedures(Array.isArray(res.data) ? res.data : []);
        syncPagination(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de filtrage");
    } finally {
      setLoad("list", false);
    }
  }, [filters, setLoad, syncPagination]);

  const resetFilters = useCallback(() => {
    setFiltersState({});
    setQueryState(DEFAULT_QUERY);
  }, []);

  // ─── Effets ───────────────────────────────────────────────────────────────

  // Effet 1 : chargement initial des stats — une seule fois dès que isAdmin est confirmé.
  // Séparé de la liste pour ne pas bloquer l'une par l'autre.
  useEffect(() => {
    if (!isAdmin) return;
    if (statsLoadedRef.current) return;
    statsLoadedRef.current = true;
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]); // loadStatistics exclu volontairement : sa ref est stable, isAdmin suffit

  // Effet 2 : rechargement de la liste quand query change (ou au montage si isAdmin prêt).
  // loadProcedures est dans les deps MAIS sa définition ne dépend que de [isAdmin, setLoad, syncPagination]
  // qui sont toutes stables → pas de boucle. Elle lit query via queryRef (ref, pas state).
  useEffect(() => {
    if (!isAdmin) return;
    loadProcedures();
  }, [
    isAdmin,
    loadProcedures,
    query.page,
    query.limit,
    query.status,
    query.search,
    query.sortBy,
    query.sortOrder,
    query.includeCompleted,
    query.includeDeleted,
    query.destination,
    query.filiere,
    query.email,
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