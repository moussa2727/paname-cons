import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

// ==================== TYPES ====================
export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Refusée',
  CANCELLED = 'Annulée',
}

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminé',
  REJECTED = 'Rejeté',
  CANCELLED = 'Annulé',
}

export enum StepName {
  DEMANDE_ADMISSION = 'DEMANDE ADMISSION',
  DEMANDE_VISA = 'DEMANDE VISA',
  PREPARATIF_VOYAGE = 'PREPARATIF VOYAGE',
}

export interface Step {
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateCreation: Date;
  dateMaj: Date;
  dateCompletion?: Date;
}

export interface RendezvousInfo {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: string;
  avisAdmin?: string;
}

export interface UserProcedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  destination: string;
  destinationAutre?: string;
  filiere: string;
  filiereAutre?: string;
  niveauEtude: string;
  statut: ProcedureStatus;
  steps: Step[];
  raisonRejet?: string;
  dateCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
  rendezVousId?: RendezvousInfo | string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletionReason?: string;
  dateDerniereModification?: Date;
}

export interface PaginatedUserProcedures {
  data: UserProcedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProcedureFilterOptions {
  searchTerm?: string;
  status?: ProcedureStatus | 'ALL';
  destination?: string;
  filiere?: string;
  sortBy?: 'date' | 'status' | 'destination' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==================== SERVICE API USER ====================
class ProcedureApiService {
  private fetchWithAuth: (
    endpoint: string,
    options?: RequestInit
  ) => Promise<Response>;

  constructor(
    fetchWithAuth: (
      endpoint: string,
      options?: RequestInit
    ) => Promise<Response>
  ) {
    this.fetchWithAuth = fetchWithAuth;
  }

  /**
   * Récupérer les procédures de l'utilisateur connecté (GET /api/procedures/user)
   */
  async fetchUserProcedures(
    page: number = 1,
    limit: number = 10,
    filters?: Partial<ProcedureFilterOptions>
  ): Promise<PaginatedUserProcedures> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.searchTerm) {
        queryParams.append('search', filters.searchTerm);
      }
      if (filters?.status && filters.status !== 'ALL') {
        queryParams.append('status', filters.status);
      }
      if (filters?.destination) {
        queryParams.append('destination', filters.destination);
      }
      if (filters?.filiere) {
        queryParams.append('filiere', filters.filiere);
      }
      if (filters?.sortBy) {
        queryParams.append('sortBy', filters.sortBy);
      }
      if (filters?.sortOrder) {
        queryParams.append('sortOrder', filters.sortOrder);
      }

      const response = await this.fetchWithAuth(
        `/api/procedures/user?${queryParams.toString()}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED');
        }
        if (response.status === 403) {
          throw new Error('Accès non autorisé. Vérifiez vos permissions.');
        }
        
        // Vérifier si la réponse est vide
        const responseText = await response.text();
        if (!responseText) {
          throw new Error(`Réponse vide du serveur (${response.status})`);
        }
        
        throw new Error(
          `Erreur ${response.status}: Impossible de charger vos procédures`
        );
      }

      // Vérifier que la réponse contient du JSON valide
      const responseText = await response.text();
      if (!responseText) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const data = JSON.parse(responseText);
      
      // Vérifier la structure de la réponse
      if (!data || typeof data !== 'object') {
        throw new Error('Format de réponse invalide');
      }

      return {
        data: Array.isArray(data.data) ? data.data.map((procedure: any) =>
          this.normalizeProcedureData(procedure)
        ) : [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || Math.ceil((data.total || 0) / limit),
      };
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        throw error;
      }
      
      console.error('Erreur fetchUserProcedures:', error);
      throw new Error(`Erreur réseau: ${error.message}`);
    }
  }

  /**
   * Récupérer les détails d'une procédure (GET /api/procedures/:id)
   */
  async fetchProcedureDetails(procedureId: string): Promise<UserProcedure> {
    try {
      if (!procedureId || typeof procedureId !== 'string') {
        throw new Error('ID de procédure invalide ou manquant');
      }

      const response = await this.fetchWithAuth(`/api/procedures/${procedureId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Procédure non trouvée');
        }
        if (response.status === 403) {
          throw new Error("Accès interdit");
        }
        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED');
        }
        
        // Vérifier si la réponse est vide
        const responseText = await response.text();
        if (!responseText) {
          throw new Error(`Réponse vide du serveur (${response.status})`);
        }
        
        throw new Error(
          `Erreur ${response.status}: Impossible de charger les détails`
        );
      }

      // Vérifier que la réponse contient du JSON valide
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Réponse vide du serveur');
      }

      const data = JSON.parse(responseText);
      return this.normalizeProcedureData(data);
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        throw error;
      }
      
      console.error('Erreur fetchProcedureDetails:', error);
      throw new Error(`Erreur de chargement: ${error.message}`);
    }
  }

  /**
   * Annuler une procédure (PUT /api/procedures/:id/cancel)
   */
  async cancelProcedure(
    procedureId: string,
    reason?: string
  ): Promise<UserProcedure> {
    try {
      if (!procedureId) {
        throw new Error('ID de procédure manquant');
      }

      const response = await this.fetchWithAuth(
        `/api/procedures/${procedureId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason?.trim() }),
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = `Erreur ${response.status}`;
        
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = responseText;
          }
        }

        switch (response.status) {
          case 401:
            throw new Error('SESSION_EXPIRED');
          case 403:
            throw new Error('Vous ne pouvez annuler que vos propres procédures');
          case 404:
            throw new Error('Procédure non trouvée');
          case 400:
            throw new Error(`Requête invalide: ${errorMessage}`);
          default:
            throw new Error(`Erreur serveur: ${errorMessage}`);
        }
      }

      // Vérifier que la réponse contient du JSON valide
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Réponse vide du serveur');
      }

      const data = JSON.parse(responseText);
      return this.normalizeProcedureData(data);
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        throw error;
      }
      
      console.error('Erreur cancelProcedure:', error);
      throw new Error(`Erreur d'annulation: ${error.message}`);
    }
  }

  /**
   * Statistiques simplifiées pour l'utilisateur
   */
  async getUserProcedureStats(): Promise<{
    total: number;
    activeCount: number;
    completedCount: number;
    cancelledCount: number;
    rejectedCount: number;
  }> {
    try {
      // Récupérer seulement la première page pour calculer les stats
      const response = await this.fetchUserProcedures(1, 50);
      const allProcedures = response.data;

      const stats = {
        total: allProcedures.length,
        activeCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        rejectedCount: 0,
      };

      allProcedures.forEach(procedure => {
        switch (procedure.statut) {
          case ProcedureStatus.IN_PROGRESS:
            stats.activeCount++;
            break;
          case ProcedureStatus.COMPLETED:
            stats.completedCount++;
            break;
          case ProcedureStatus.CANCELLED:
            stats.cancelledCount++;
            break;
          case ProcedureStatus.REJECTED:
            stats.rejectedCount++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Erreur getUserProcedureStats:', error);
      // Retourner des stats par défaut en cas d'erreur
      return {
        total: 0,
        activeCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        rejectedCount: 0,
      };
    }
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private normalizeProcedureData(data: any): UserProcedure {
    // Vérifier que les données sont valides
    if (!data || typeof data !== 'object') {
      throw new Error('Données de procédure invalides');
    }

    try {
      return {
        _id: data._id || data.id || '',
        prenom: data.prenom || data.firstName || '',
        nom: data.nom || data.lastName || '',
        email: data.email || '',
        telephone: data.telephone || data.phone || undefined,
        destination: data.destination || '',
        destinationAutre: data.destinationAutre || undefined,
        filiere: data.filiere || '',
        filiereAutre: data.filiereAutre || undefined,
        niveauEtude: data.niveauEtude || '',
        statut: this.normalizeProcedureStatus(data.statut),
        steps: this.normalizeSteps(data.steps),
        raisonRejet: data.raisonRejet || data.rejectionReason || undefined,
        dateCompletion: data.dateCompletion
          ? new Date(data.dateCompletion)
          : undefined,
        createdAt: new Date(data.createdAt || new Date()),
        updatedAt: new Date(data.updatedAt || new Date()),
        rendezVousId: data.rendezVousId || undefined,
        isDeleted: data.isDeleted || false,
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
        deletionReason: data.deletionReason || undefined,
        dateDerniereModification: data.dateDerniereModification
          ? new Date(data.dateDerniereModification)
          : undefined,
      };
    } catch (error) {
      console.error('Erreur normalization:', error, data);
      throw new Error('Impossible de normaliser les données de la procédure');
    }
  }

  private normalizeProcedureStatus(status: any): ProcedureStatus {
    if (typeof status !== 'string') {
      return ProcedureStatus.IN_PROGRESS;
    }

    // Vérifier si le statut correspond à une valeur de l'enum
    const normalizedStatus = status as ProcedureStatus;
    if (Object.values(ProcedureStatus).includes(normalizedStatus)) {
      return normalizedStatus;
    }

    // Fallback pour les valeurs possibles
    const statusMap: Record<string, ProcedureStatus> = {
      'En cours': ProcedureStatus.IN_PROGRESS,
      'Terminée': ProcedureStatus.COMPLETED,
      'Refusée': ProcedureStatus.REJECTED,
      'Annulée': ProcedureStatus.CANCELLED,
      'en_cours': ProcedureStatus.IN_PROGRESS,
      'terminee': ProcedureStatus.COMPLETED,
      'refusee': ProcedureStatus.REJECTED,
      'annulee': ProcedureStatus.CANCELLED,
    };

    return statusMap[status] || ProcedureStatus.IN_PROGRESS;
  }

  private normalizeSteps(steps: any): Step[] {
    if (!Array.isArray(steps)) {
      // Retourner des étapes par défaut si aucune n'est fournie
      return [
        {
          nom: StepName.DEMANDE_ADMISSION,
          statut: StepStatus.IN_PROGRESS,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
        {
          nom: StepName.DEMANDE_VISA,
          statut: StepStatus.PENDING,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
        {
          nom: StepName.PREPARATIF_VOYAGE,
          statut: StepStatus.PENDING,
          dateCreation: new Date(),
          dateMaj: new Date(),
        },
      ];
    }

    return steps.map((step: any) => ({
      nom: this.normalizeStepName(step.nom || step.name),
      statut: this.normalizeStepStatus(step.statut || step.status),
      raisonRefus: step.raisonRefus || step.rejectionReason || undefined,
      dateCreation: new Date(step.dateCreation || step.createdAt || new Date()),
      dateMaj: new Date(step.dateMaj || step.updatedAt || new Date()),
      dateCompletion: step.dateCompletion
        ? new Date(step.dateCompletion)
        : undefined,
    }));
  }

  private normalizeStepName(name: any): StepName {
    if (typeof name !== 'string') {
      return StepName.DEMANDE_ADMISSION;
    }

    const normalizedName = name as StepName;
    if (Object.values(StepName).includes(normalizedName)) {
      return normalizedName;
    }

    // Fallback pour les noms d'étape
    const nameMap: Record<string, StepName> = {
      'DEMANDE ADMISSION': StepName.DEMANDE_ADMISSION,
      'DEMANDE_VISA': StepName.DEMANDE_VISA,
      'PREPARATIF VOYAGE': StepName.PREPARATIF_VOYAGE,
      'demande_admission': StepName.DEMANDE_ADMISSION,
      'demande_visa': StepName.DEMANDE_VISA,
      'preparatif_voyage': StepName.PREPARATIF_VOYAGE,
    };

    return nameMap[name] || StepName.DEMANDE_ADMISSION;
  }

  private normalizeStepStatus(status: any): StepStatus {
    if (typeof status !== 'string') {
      return StepStatus.PENDING;
    }

    const normalizedStatus = status as StepStatus;
    if (Object.values(StepStatus).includes(normalizedStatus)) {
      return normalizedStatus;
    }

    // Fallback pour les statuts d'étape
    const statusMap: Record<string, StepStatus> = {
      'En attente': StepStatus.PENDING,
      'En cours': StepStatus.IN_PROGRESS,
      'Terminé': StepStatus.COMPLETED,
      'Rejeté': StepStatus.REJECTED,
      'Annulé': StepStatus.CANCELLED,
      'pending': StepStatus.PENDING,
      'in_progress': StepStatus.IN_PROGRESS,
      'completed': StepStatus.COMPLETED,
      'rejected': StepStatus.REJECTED,
      'cancelled': StepStatus.CANCELLED,
    };

    return statusMap[status] || StepStatus.PENDING;
  }


}

// ==================== HOOKS USER ====================

/**
 * Hook principal pour récupérer les procédures de l'utilisateur
 */
export const useUserProcedures = (
  page: number = 1,
  limit: number = 10,
  filters?: Partial<ProcedureFilterOptions>
) => {
  const { fetchWithAuth, isAuthenticated, logout } = useAuth();
  const [procedures, setProcedures] = useState<PaginatedUserProcedures | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchProcedures = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        setError('Authentification requise');
        return;
      }

      if (page < 1) {
        setError('Le numéro de page doit être supérieur à 0');
        setLoading(false);
        return;
      }
      if (limit < 1 || limit > 100) {
        setError('La limite doit être entre 1 et 100');
        setLoading(false);
        return;
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const apiService = new ProcedureApiService(fetchWithAuth);
        const data = await apiService.fetchUserProcedures(page, limit, filters);
        setProcedures(data);
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur inconnue';
        setError(errorMessage);

        if (errorMessage === 'SESSION_EXPIRED') {
          toast.error('Votre session a expiré. Veuillez vous reconnecter.');
          setTimeout(() => logout(), 2000);
        } else if (!errorMessage.includes('SESSION_EXPIRED')) {
          toast.error(`Erreur: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth, page, limit, filters, isAuthenticated, logout]
  );

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  return {
    procedures,
    loading,
    error,
    refreshing,
    refetch: () => fetchProcedures(true),
    fetchProcedures,
    page,
    limit,
    total: procedures?.total || 0,
    totalPages: procedures?.totalPages || 1,
    data: procedures?.data || [],
  };
};

/**
 * Hook pour récupérer les détails d'une procédure spécifique
 */
export const useProcedureDetails = (procedureId: string | null) => {
  const { fetchWithAuth, isAuthenticated, logout } = useAuth();
  const [procedure, setProcedure] = useState<UserProcedure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!procedureId || !isAuthenticated) {
      setProcedure(null);
      setLoading(false);
      setError(procedureId ? 'Authentification requise' : null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiService = new ProcedureApiService(fetchWithAuth);
      const data = await apiService.fetchProcedureDetails(procedureId);
      setProcedure(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);

      if (errorMessage === 'SESSION_EXPIRED') {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        logout();
      } else if (!errorMessage.includes('SESSION_EXPIRED')) {
        toast.error(`Erreur: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [procedureId, fetchWithAuth, isAuthenticated, logout]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const canCancel = procedure
    ? ![
        ProcedureStatus.COMPLETED,
        ProcedureStatus.CANCELLED,
        ProcedureStatus.REJECTED,
      ].includes(procedure.statut)
    : false;

  const progress = procedure
    ? {
        percentage: Math.round(
          (procedure.steps.filter(s => s.statut === StepStatus.COMPLETED)
            .length /
            procedure.steps.length) *
            100
        ),
        completed: procedure.steps.filter(
          s => s.statut === StepStatus.COMPLETED
        ).length,
        total: procedure.steps.length,
      }
    : null;

  return {
    procedure,
    loading,
    error,
    refetch: fetchDetails,
    canCancel,
    progress,
  };
};

/**
 * Hook pour annuler une procédure
 */
export const useCancelProcedure = () => {
  const { fetchWithAuth, isAuthenticated, logout } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const cancelProcedure = useCallback(
    async (
      procedureId: string,
      reason?: string
    ): Promise<{
      success: boolean;
      data?: UserProcedure;
      error?: string;
      procedureId: string;
    }> => {
      if (!procedureId || !isAuthenticated) {
        return {
          success: false,
          error: 'Authentification requise',
          procedureId,
        };
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const apiService = new ProcedureApiService(fetchWithAuth);
        const data = await apiService.cancelProcedure(procedureId, reason);

        setSuccess(true);
        toast.success('Procédure annulée avec succès');

        return {
          success: true,
          data,
          procedureId,
        };
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur inconnue';
        setError(errorMessage);

        if (errorMessage === 'SESSION_EXPIRED') {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
        } else {
          toast.error(`Erreur: ${errorMessage}`);
        }

        return {
          success: false,
          error: errorMessage,
          procedureId,
        };
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, isAuthenticated, logout]
  );

  return {
    cancelProcedure,
    loading,
    error,
    success,
    resetError: () => setError(null),
    resetSuccess: () => setSuccess(false),
  };
};

/**
 * Hook pour obtenir les statistiques des procédures
 */
export const useProcedureStats = () => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Authentification requise');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const apiService = new ProcedureApiService(fetchWithAuth);
      const data = await apiService.getUserProcedureStats();
      setStats(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    hasStats: !!stats,
  };
};

/**
 * Hook pour gérer l'annulation avec confirmation
 */
export const useCancelProcedureWithConfirmation = () => {
  const { cancelProcedure, loading, error, success, resetError, resetSuccess } =
    useCancelProcedure();
  const [isConfirming, setIsConfirming] = useState(false);
  const [procedureToCancel, setProcedureToCancel] = useState<string | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState('');

  const startCancel = (procedureId: string, currentReason?: string) => {
    setProcedureToCancel(procedureId);
    setCancelReason(currentReason || '');
    resetError();
    resetSuccess();
    setIsConfirming(true);
  };

  const confirmCancel = async (): Promise<{
    success: boolean;
    data?: UserProcedure;
    error?: string;
  }> => {
    if (!procedureToCancel) {
      return { success: false, error: 'Aucune procédure sélectionnée' };
    }

    const result = await cancelProcedure(
      procedureToCancel,
      cancelReason || undefined
    );

    if (result.success) {
      setIsConfirming(false);
      setProcedureToCancel(null);
      setCancelReason('');
    }

    return result;
  };

  const cancelCancel = () => {
    setIsConfirming(false);
    setProcedureToCancel(null);
    setCancelReason('');
    resetError();
    resetSuccess();
  };

  return {
    startCancel,
    confirmCancel,
    cancelCancel,
    isConfirming,
    procedureToCancel,
    cancelReason,
    setCancelReason,
    loading,
    error,
    success,
    resetError: () => resetError(),
  };
};

// ==================== FONCTIONS UTILITAIRES USER ====================

/**
 * Vérifie si une procédure peut être annulée
 */
export const canCancelProcedure = (procedure: UserProcedure): boolean => {
  const finalStatuses = [
    ProcedureStatus.COMPLETED,
    ProcedureStatus.CANCELLED,
    ProcedureStatus.REJECTED,
  ];

  return !finalStatuses.includes(procedure.statut);
};

/**
 * Calcule la progression d'une procédure
 */
export const getProgressStatus = (
  procedure: UserProcedure
): {
  percentage: number;
  completed: number;
  total: number;
  currentStep?: Step;
  nextStep?: Step;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
} => {
  const totalSteps = procedure.steps.length;
  const completedSteps = procedure.steps.filter(
    step => step.statut === StepStatus.COMPLETED
  ).length;

  const currentStep = procedure.steps.find(
    step => step.statut === StepStatus.IN_PROGRESS
  );

  const currentIndex = currentStep
    ? procedure.steps.findIndex(step => step.nom === currentStep.nom)
    : -1;

  const nextStep =
    currentIndex >= 0 && currentIndex < totalSteps - 1
      ? procedure.steps[currentIndex + 1]
      : undefined;

  let status: 'not-started' | 'in-progress' | 'completed' | 'blocked' =
    'in-progress';

  if (completedSteps === 0) {
    status = 'not-started';
  } else if (completedSteps === totalSteps) {
    status = 'completed';
  } else if (
    procedure.steps.some(step =>
      [StepStatus.REJECTED, StepStatus.CANCELLED].includes(step.statut)
    )
  ) {
    status = 'blocked';
  }

  return {
    percentage:
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    completed: completedSteps,
    total: totalSteps,
    currentStep,
    nextStep,
    status,
  };
};

/**
 * Formate une date pour l'affichage
 */
export const formatProcedureDate = (dateString: string | Date): string => {
  try {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Date invalide';

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Date invalide';
  }
};

/**
 * Formate une date courte
 */
export const formatShortDate = (dateString: string | Date): string => {
  try {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Date invalide';

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Date invalide';
  }
};

/**
 * Obtient le nom d'affichage d'une étape
 */
export const getStepDisplayName = (stepName: StepName): string => {
  const stepNames: Record<StepName, string> = {
    [StepName.DEMANDE_ADMISSION]: "Demande d'admission",
    [StepName.DEMANDE_VISA]: 'Demande de visa',
    [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage',
  };
  return stepNames[stepName] || stepName.toString();
};

/**
 * Obtient la description d'une étape
 */
export const getStepDescription = (stepName: StepName): string => {
  const descriptions: Record<StepName, string> = {
    [StepName.DEMANDE_ADMISSION]:
      "Soumission et suivi de votre demande d'admission",
    [StepName.DEMANDE_VISA]:
      'Traitement de votre demande de visa étudiant',
    [StepName.PREPARATIF_VOYAGE]:
      "Préparation de votre départ",
  };
  return descriptions[stepName] || '';
};

/**
 * Obtient la couleur du statut d'une procédure
 */
export const getProcedureStatusColor = (
  statut: ProcedureStatus
): {
  bg: string;
  text: string;
  border: string;
  light: string;
} => {
  switch (statut) {
    case ProcedureStatus.IN_PROGRESS:
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700',
        border: 'border-blue-200',
        light: 'bg-blue-50',
      };
    case ProcedureStatus.COMPLETED:
      return {
        bg: 'bg-green-500',
        text: 'text-green-700',
        border: 'border-green-200',
        light: 'bg-green-50',
      };
    case ProcedureStatus.CANCELLED:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700',
        border: 'border-gray-300',
        light: 'bg-gray-100',
      };
    case ProcedureStatus.REJECTED:
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-700',
        border: 'border-orange-200',
        light: 'bg-orange-50',
      };
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700',
        border: 'border-gray-200',
        light: 'bg-gray-50',
      };
  }
};

/**
 * Obtient la couleur du statut d'une étape
 */
export const getStepStatusColor = (
  statut: StepStatus
): {
  bg: string;
  text: string;
  border: string;
  light: string;
} => {
  switch (statut) {
    case StepStatus.PENDING:
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        light: 'bg-yellow-50',
      };
    case StepStatus.IN_PROGRESS:
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700',
        border: 'border-blue-200',
        light: 'bg-blue-50',
      };
    case StepStatus.COMPLETED:
      return {
        bg: 'bg-green-500',
        text: 'text-green-700',
        border: 'border-green-200',
        light: 'bg-green-50',
      };
    case StepStatus.CANCELLED:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-600',
        border: 'border-gray-300',
        light: 'bg-gray-100',
      };
    case StepStatus.REJECTED:
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-700',
        border: 'border-orange-200',
        light: 'bg-orange-50',
      };
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700',
        border: 'border-gray-200',
        light: 'bg-gray-50',
      };
  }
};

/**
 * Obtient le nom d'affichage de la destination
 */
export const getDisplayDestination = (procedure: UserProcedure): string => {
  if (procedure.destinationAutre && procedure.destination === 'Autre') {
    return procedure.destinationAutre;
  }
  return procedure.destination;
};

/**
 * Obtient le nom d'affichage de la filière
 */
export const getDisplayFiliere = (procedure: UserProcedure): string => {
  if (procedure.filiereAutre && procedure.filiere === 'Autre') {
    return procedure.filiereAutre;
  }
  return procedure.filiere;
};

/**
 * Obtient le nom complet de l'utilisateur
 */
export const getUserFullName = (procedure: UserProcedure): string => {
  return `${procedure.prenom} ${procedure.nom}`.trim();
};

/**
 * Vérifie si une procédure a des informations de rendez-vous
 */
export const hasRendezvousInfo = (procedure: UserProcedure): boolean => {
  return !!procedure.rendezVousId && typeof procedure.rendezVousId === 'object';
};

/**
 * Obtient les informations du rendez-vous
 */
export const getRendezvousInfo = (
  procedure: UserProcedure
): RendezvousInfo | null => {
  if (hasRendezvousInfo(procedure)) {
    return procedure.rendezVousId as RendezvousInfo;
  }
  return null;
};

export default ProcedureApiService;