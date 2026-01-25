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

export interface CancelProcedureParams {
  procedureId: string;
  reason?: string;
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
    // Construction des paramètres de requête
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Ajout des filtres optionnels
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
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Paramètres de requête invalides');
      }
      throw new Error(
        `Erreur ${response.status}: Impossible de charger vos procédures`
      );
    }

    return response.json();
  }

  /**
   * Récupérer les détails d'une procédure (GET /api/procedures/:id)
   */
  async fetchProcedureDetails(procedureId: string): Promise<UserProcedure> {
    if (!procedureId || typeof procedureId !== 'string') {
      throw new Error('ID de procédure invalide ou manquant');
    }

    const response = await this.fetchWithAuth(`/api/procedures/${procedureId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Procédure non trouvée. Elle a peut-être été supprimée.'
        );
      }
      if (response.status === 403) {
        throw new Error(
          "Accès interdit. Vous ne pouvez accéder qu'à vos propres procédures."
        );
      }
      if (response.status === 400) {
        throw new Error('ID de procédure invalide');
      }
      if (response.status === 401) {
        throw new Error('SESSION_EXPIRED');
      }
      throw new Error(
        `Erreur ${response.status}: Impossible de charger les détails de la procédure`
      );
    }

    const data = await response.json();
    return this.normalizeProcedureData(data);
  }

  /**
   * Annuler une procédure (PUT /api/procedures/:id/cancel)
   */
  async cancelProcedure(
    procedureId: string,
    reason?: string
  ): Promise<UserProcedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    // Validation de la raison côté frontend
    if (reason && reason.trim() !== '') {
      const trimmedReason = reason.trim();
      if (trimmedReason.length < 5) {
        throw new Error('La raison doit contenir au moins 5 caractères');
      }
      if (trimmedReason.length > 500) {
        throw new Error('La raison ne doit pas dépasser 500 caractères');
      }
    }

    const response = await this.fetchWithAuth(
      `/api/procedures/${procedureId}/cancel`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ reason: reason?.trim() }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erreur ${response.status}`;

      switch (response.status) {
        case 401:
          throw new Error('SESSION_EXPIRED');
        case 403:
          throw new Error('Vous ne pouvez annuler que vos propres procédures');
        case 404:
          throw new Error('Procédure non trouvée');
        case 400:
          if (errorMessage.includes('déjà finalisée')) {
            throw new Error(
              'Cette procédure est déjà terminée, annulée ou rejetée'
            );
          }
          if (errorMessage.includes('5 caractères')) {
            throw new Error('La raison doit contenir au moins 5 caractères');
          }
          throw new Error(`Requête invalide: ${errorMessage}`);
        default:
          throw new Error(`Erreur serveur: ${errorMessage}`);
      }
    }

    const data = await response.json();
    return this.normalizeProcedureData(data);
  }

  /**
   * Rechercher des procédures avec filtres avancés
   */
  async searchProcedures(
    filters: ProcedureFilterOptions
  ): Promise<PaginatedUserProcedures> {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await this.fetchWithAuth(
      `/api/procedures/user/search?${queryParams.toString()}`
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error('SESSION_EXPIRED');
      throw new Error(`Erreur ${response.status}: Recherche échouée`);
    }

    const data = await response.json();
    return {
      ...data,
      data: data.data.map((procedure: any) =>
        this.normalizeProcedureData(procedure)
      ),
    };
  }

  /**
   * Exporter les données d'une procédure au format JSON
   */
  async exportProcedureData(procedureId: string): Promise<Blob> {
    const procedure = await this.fetchProcedureDetails(procedureId);

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        format: 'JSON',
        version: '1.0',
      },
      procedure: this.prepareProcedureForExport(procedure),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  /**
   * Vérifier le statut d'une procédure
   */
  async checkProcedureStatus(procedureId: string): Promise<{
    status: ProcedureStatus;
    lastUpdated: Date;
    canCancel: boolean;
    progress: number;
  }> {
    const procedure = await this.fetchProcedureDetails(procedureId);
    const progress = this.calculateProgress(procedure);

    return {
      status: procedure.statut,
      lastUpdated: procedure.updatedAt,
      canCancel: this.canCancelProcedure(procedure),
      progress: progress.percentage,
    };
  }

  /**
   * Récupérer les statistiques des procédures de l'utilisateur
   */
  async getUserProcedureStats(): Promise<{
    total: number;
    byStatus: Record<ProcedureStatus, number>;
    byDestination: Record<string, number>;
    activeCount: number;
    averageProgress: number;
  }> {
    try {
      // Récupérer toutes les procédures pour calculer les stats
      const allProcedures = await this.fetchAllUserProcedures();

      const stats = {
        total: allProcedures.length,
        byStatus: {} as Record<ProcedureStatus, number>,
        byDestination: {} as Record<string, number>,
        activeCount: 0,
        averageProgress: 0,
      };

      // Initialiser les compteurs
      Object.values(ProcedureStatus).forEach(status => {
        stats.byStatus[status] = 0;
      });

      let totalProgress = 0;

      allProcedures.forEach(procedure => {
        // Comptage par statut
        stats.byStatus[procedure.statut]++;

        // Comptage par destination
        const destination = this.getDisplayDestination(procedure);
        stats.byDestination[destination] =
          (stats.byDestination[destination] || 0) + 1;

        // Compter les procédures actives
        if ([ProcedureStatus.IN_PROGRESS].includes(procedure.statut)) {
          stats.activeCount++;
        }

        // Calculer la progression moyenne
        const progress = this.calculateProgress(procedure);
        totalProgress += progress.percentage;
      });

      stats.averageProgress =
        allProcedures.length > 0
          ? Math.round(totalProgress / allProcedures.length)
          : 0;

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw new Error('Impossible de récupérer les statistiques');
    }
  }

  /**
   * Marquer une procédure comme vue
   */
  async markProcedureAsViewed(procedureId: string): Promise<void> {
    try {
      // Stocker localement la date de visualisation
      const viewedProcedures = JSON.parse(
        localStorage.getItem('viewedProcedures') || '{}'
      );

      viewedProcedures[procedureId] = new Date().toISOString();
      localStorage.setItem(
        'viewedProcedures',
        JSON.stringify(viewedProcedures)
      );
    } catch (error) {
      console.warn(
        'Impossible de sauvegarder la date de visualisation:',
        error
      );
    }
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private async fetchAllUserProcedures(): Promise<UserProcedure[]> {
    const allProcedures: UserProcedure[] = [];
    let page = 1;
    const limit = 50; // Nombre maximal par page
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.fetchUserProcedures(page, limit);
        allProcedures.push(...response.data);

        hasMore = page < response.totalPages;
        page++;
      } catch (error) {
        console.error('Erreur lors de la récupération des procédures:', error);
        hasMore = false;
      }
    }

    return allProcedures.map(procedure =>
      this.normalizeProcedureData(procedure)
    );
  }

  private normalizeProcedureData(data: any): UserProcedure {
    return {
      _id: data._id || data.id,
      prenom: data.prenom || data.firstName || '',
      nom: data.nom || data.lastName || '',
      email: data.email || '',
      telephone: data.telephone || data.phone || undefined,
      destination: data.destination || '',
      destinationAutre: data.destinationAutre || undefined,
      filiere: data.filiere || '',
      filiereAutre: data.filiereAutre || undefined,
      niveauEtude: data.niveauEtude || '',
      statut: data.statut || ProcedureStatus.IN_PROGRESS,
      steps: Array.isArray(data.steps)
        ? data.steps.map((step: any) => ({
            nom: step.nom || step.name || StepName.DEMANDE_ADMISSION,
            statut: step.statut || step.status || StepStatus.PENDING,
            raisonRefus: step.raisonRefus || step.rejectionReason || undefined,
            dateCreation: new Date(
              step.dateCreation || step.createdAt || new Date()
            ),
            dateMaj: new Date(step.dateMaj || step.updatedAt || new Date()),
            dateCompletion: step.dateCompletion
              ? new Date(step.dateCompletion)
              : undefined,
          }))
        : [],
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
  }

  private prepareProcedureForExport(procedure: UserProcedure): any {
    return {
      id: procedure._id,
      personalInfo: {
        fullName: `${procedure.prenom} ${procedure.nom}`,
        email: procedure.email,
        phone: procedure.telephone,
      },
      academicInfo: {
        destination: procedure.destination,
        alternativeDestination: procedure.destinationAutre,
        field: procedure.filiere,
        alternativeField: procedure.filiereAutre,
        educationLevel: procedure.niveauEtude,
      },
      procedureStatus: {
        current: procedure.statut,
        rejectionReason: procedure.raisonRejet,
        creationDate: procedure.createdAt,
        completionDate: procedure.dateCompletion,
        lastUpdate: procedure.updatedAt,
      },
      steps: procedure.steps.map(step => ({
        name: step.nom,
        status: step.statut,
        rejectionReason: step.raisonRefus,
        startDate: step.dateCreation,
        lastUpdate: step.dateMaj,
        completionDate: step.dateCompletion,
      })),
      additionalInfo: {
        hasRendezvous: !!procedure.rendezVousId,
        isDeleted: procedure.isDeleted,
        deletionDate: procedure.deletedAt,
        deletionReason: procedure.deletionReason,
      },
    };
  }

  private calculateProgress(procedure: UserProcedure): {
    percentage: number;
    completed: number;
    total: number;
  } {
    const totalSteps = procedure.steps.length;
    const completedSteps = procedure.steps.filter(
      step => step.statut === StepStatus.COMPLETED
    ).length;

    return {
      percentage:
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      completed: completedSteps,
      total: totalSteps,
    };
  }

  private canCancelProcedure(procedure: UserProcedure): boolean {
    const finalStatuses = [
      ProcedureStatus.COMPLETED,
      ProcedureStatus.CANCELLED,
      ProcedureStatus.REJECTED,
    ];

    // Ne peut pas annuler si déjà dans un état final
    if (finalStatuses.includes(procedure.statut)) {
      return false;
    }

    // Vérifier si la procédure est supprimée logiquement
    if (procedure.isDeleted) {
      return false;
    }

    // Vérifier si toutes les étapes sont déjà terminées
    const allStepsCompleted = procedure.steps.every(
      step => step.statut === StepStatus.COMPLETED
    );

    if (allStepsCompleted) {
      return false;
    }

    return true;
  }

  private getDisplayDestination(procedure: UserProcedure): string {
    if (procedure.destinationAutre && procedure.destination === 'Autre') {
      return procedure.destinationAutre;
    }
    return procedure.destination;
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

      // Validation des paramètres
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
        setError(err.message);

        if (err.message === 'SESSION_EXPIRED') {
          toast.error('Votre session a expiré. Veuillez vous reconnecter.');
          setTimeout(() => logout(), 2000);
        } else if (!err.message.includes('SESSION_EXPIRED')) {
          toast.error(`Erreur: ${err.message}`);
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
  const [viewed, setViewed] = useState<boolean>(false);

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

      // Marquer comme vue
      if (!viewed) {
        await apiService.markProcedureAsViewed(procedureId);
        setViewed(true);
      }
    } catch (err: any) {
      setError(err.message);

      if (err.message === 'SESSION_EXPIRED') {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        logout();
      } else if (!err.message.includes('SESSION_EXPIRED')) {
        toast.error(`Erreur: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [procedureId, fetchWithAuth, isAuthenticated, logout, viewed]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const canCancel = procedure
    ? (new ProcedureApiService(fetchWithAuth) as any).canCancelProcedure(
        procedure
      )
    : false;

  const progress = procedure
    ? (new ProcedureApiService(fetchWithAuth) as any).calculateProgress(
        procedure
      )
    : null;

  return {
    procedure,
    loading,
    error,
    refetch: fetchDetails,
    canCancel,
    progress,
    markAsViewed: () => setViewed(true),
    isViewed: viewed,
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
        setError(err.message);

        if (err.message === 'SESSION_EXPIRED') {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
        } else {
          toast.error(`Erreur: ${err.message}`);
        }

        return {
          success: false,
          error: err.message,
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
 * Hook pour rechercher des procédures avec filtres
 */
export const useProcedureSearch = () => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [results, setResults] = useState<PaginatedUserProcedures | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchProcedures = useCallback(
    async (
      filters: ProcedureFilterOptions
    ): Promise<PaginatedUserProcedures | null> => {
      if (!isAuthenticated) {
        setError('Authentification requise');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const apiService = new ProcedureApiService(fetchWithAuth);
        const data = await apiService.searchProcedures(filters);
        setResults(data);
        return data;
      } catch (err: any) {
        setError(err.message);
        if (err.message !== 'SESSION_EXPIRED') {
          toast.error(`Erreur de recherche: ${err.message}`);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, isAuthenticated]
  );

  return {
    results,
    loading,
    error,
    searchProcedures,
    clearResults: () => setResults(null),
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
      setError(err.message);
      console.error('Erreur stats:', err);
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
 * Hook pour exporter une procédure
 */
export const useProcedureExport = () => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exportProcedure = useCallback(
    async (procedureId: string, fileName?: string): Promise<boolean> => {
      if (!procedureId || !isAuthenticated) {
        setError('Authentification requise');
        return false;
      }

      setExporting(true);
      setError(null);

      try {
        const apiService = new ProcedureApiService(fetchWithAuth);
        const blob = await apiService.exportProcedureData(procedureId);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          fileName ||
          `procedure-${procedureId.slice(-6)}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Procédure exportée avec succès');
        return true;
      } catch (err: any) {
        setError(err.message);
        toast.error(`Erreur d'export: ${err.message}`);
        return false;
      } finally {
        setExporting(false);
      }
    },
    [fetchWithAuth, isAuthenticated]
  );

  return {
    exportProcedure,
    exporting,
    error,
    resetError: () => setError(null),
  };
};

/**
 * Hook pour vérifier le statut d'une procédure
 */
export const useProcedureStatus = (procedureId?: string) => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (id?: string) => {
      const targetId = id || procedureId;
      if (!targetId || !isAuthenticated) {
        setError('Paramètres invalides');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const apiService = new ProcedureApiService(fetchWithAuth);
        const data = await apiService.checkProcedureStatus(targetId);
        setStatus(data);
        return data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [procedureId, fetchWithAuth, isAuthenticated]
  );

  return {
    status,
    loading,
    error,
    checkStatus,
    refetch: () => checkStatus(),
  };
};

/**
 * Hook complet pour gérer l'annulation avec confirmation
 */
export const useCancelProcedureWithConfirmation = () => {
  const { cancelProcedure, loading, error, success, resetError, resetSuccess } =
    useCancelProcedure();
  const [isConfirming, setIsConfirming] = useState(false);
  const [procedureToCancel, setProcedureToCancel] = useState<string | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateReason = (reason: string): boolean => {
    if (reason.trim() === '') {
      setValidationError(null);
      return true; // Raison optionnelle
    }

    if (reason.trim().length < 5) {
      setValidationError('La raison doit contenir au moins 5 caractères');
      return false;
    }

    if (reason.length > 500) {
      setValidationError('La raison ne doit pas dépasser 500 caractères');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const startCancel = (procedureId: string, currentReason?: string) => {
    setProcedureToCancel(procedureId);
    setCancelReason(currentReason || '');
    setValidationError(null);
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

    if (!validateReason(cancelReason)) {
      return { success: false, error: validationError || 'Raison invalide' };
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
    setValidationError(null);
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
    validationError,
    loading,
    error,
    success,
    resetError: () => {
      resetError();
      setValidationError(null);
    },
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

  // Ne peut pas annuler si déjà dans un état final
  if (finalStatuses.includes(procedure.statut)) {
    return false;
  }

  // Ne peut pas annuler si supprimée logiquement
  if (procedure.isDeleted) {
    return false;
  }

  // Vérifier si toutes les étapes sont terminées
  const allStepsCompleted = procedure.steps.every(
    step => step.statut === StepStatus.COMPLETED
  );

  if (allStepsCompleted) {
    return false;
  }

  return true;
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

  // Trouver l'étape actuelle
  const currentStep = procedure.steps.find(
    step => step.statut === StepStatus.IN_PROGRESS
  );

  // Trouver la prochaine étape
  const currentIndex = currentStep
    ? procedure.steps.findIndex(step => step.nom === currentStep.nom)
    : -1;

  const nextStep =
    currentIndex >= 0 && currentIndex < totalSteps - 1
      ? procedure.steps[currentIndex + 1]
      : undefined;

  // Déterminer le statut global
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
      "Soumission et suivi de votre demande d'admission auprès de l'établissement d'accueil. Cette étape inclut la vérification des pré-requis académiques.",
    [StepName.DEMANDE_VISA]:
      'Traitement de votre demande de visa étudiant auprès des autorités consulaires. Suivi des documents requis et des délais de traitement.',
    [StepName.PREPARATIF_VOYAGE]:
      "Préparation de votre départ : recherche de logement, réservation de billet d'avion, souscription d'assurance santé, ouverture de compte bancaire, etc.",
  };
  return descriptions[stepName] || '';
};

/**
 * Obtient le statut d'affichage d'une procédure
 */
export const getProcedureDisplayStatus = (status: ProcedureStatus): string => {
  return status.toString();
};

/**
 * Obtient le statut d'affichage d'une étape
 */
export const getStepDisplayStatus = (status: StepStatus): string => {
  return status.toString();
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

/**
 * Filtre les procédures par critères multiples
 */
export const filterProcedures = (
  procedures: UserProcedure[],
  filters: {
    searchTerm?: string;
    status?: ProcedureStatus | 'ALL';
    destination?: string;
    filiere?: string;
    minDate?: Date;
    maxDate?: Date;
  }
): UserProcedure[] => {
  return procedures.filter(procedure => {
    // Filtre par recherche
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch =
        procedure.destination.toLowerCase().includes(searchLower) ||
        procedure.nom.toLowerCase().includes(searchLower) ||
        procedure.prenom.toLowerCase().includes(searchLower) ||
        procedure.email.toLowerCase().includes(searchLower) ||
        (procedure.destinationAutre?.toLowerCase() || '').includes(
          searchLower
        ) ||
        (procedure.filiere?.toLowerCase() || '').includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Filtre par statut
    if (filters.status && filters.status !== 'ALL') {
      if (procedure.statut !== filters.status) return false;
    }

    // Filtre par destination
    if (filters.destination) {
      if (procedure.destination !== filters.destination) return false;
    }

    // Filtre par filière
    if (filters.filiere) {
      if (procedure.filiere !== filters.filiere) return false;
    }

    // Filtre par date
    if (filters.minDate) {
      const procedureDate = new Date(procedure.createdAt);
      if (procedureDate < filters.minDate) return false;
    }

    if (filters.maxDate) {
      const procedureDate = new Date(procedure.createdAt);
      if (procedureDate > filters.maxDate) return false;
    }

    return true;
  });
};

/**
 * Trie les procédures
 */
export const sortProcedures = (
  procedures: UserProcedure[],
  sortBy: 'date' | 'status' | 'destination' | 'updatedAt' = 'date',
  order: 'asc' | 'desc' = 'desc'
): UserProcedure[] => {
  return [...procedures].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison =
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case 'status': {
        const statusOrder = {
          [ProcedureStatus.IN_PROGRESS]: 1,
          [ProcedureStatus.COMPLETED]: 2,
          [ProcedureStatus.REJECTED]: 3,
          [ProcedureStatus.CANCELLED]: 4,
        };
        comparison =
          (statusOrder[a.statut] || 5) - (statusOrder[b.statut] || 5);
        break;
      }
      case 'destination':
        comparison = getDisplayDestination(a).localeCompare(
          getDisplayDestination(b)
        );
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
};

/**
 * Calcule les statistiques d'un ensemble de procédures
 */
export const calculateProceduresStats = (procedures: UserProcedure[]) => {
  const stats = {
    total: procedures.length,
    byStatus: {} as Record<ProcedureStatus, number>,
    byDestination: {} as Record<string, number>,
    activeCount: 0,
    averageProgress: 0,
    completedCount: 0,
    cancelledCount: 0,
    rejectedCount: 0,
  };

  // Initialiser les compteurs
  Object.values(ProcedureStatus).forEach(status => {
    stats.byStatus[status] = 0;
  });

  let totalProgress = 0;

  procedures.forEach(procedure => {
    // Comptage par statut
    stats.byStatus[procedure.statut]++;

    // Comptage spécifique
    if (procedure.statut === ProcedureStatus.IN_PROGRESS) {
      stats.activeCount++;
    } else if (procedure.statut === ProcedureStatus.COMPLETED) {
      stats.completedCount++;
    } else if (procedure.statut === ProcedureStatus.CANCELLED) {
      stats.cancelledCount++;
    } else if (procedure.statut === ProcedureStatus.REJECTED) {
      stats.rejectedCount++;
    }

    // Comptage par destination
    const destination = getDisplayDestination(procedure);
    stats.byDestination[destination] =
      (stats.byDestination[destination] || 0) + 1;

    // Calculer la progression
    const progress = getProgressStatus(procedure);
    totalProgress += progress.percentage;
  });

  stats.averageProgress =
    procedures.length > 0 ? Math.round(totalProgress / procedures.length) : 0;

  return stats;
};

/**
 * Génère un résumé textuel du statut d'une procédure
 */
export const getProcedureSummary = (procedure: UserProcedure): string => {
  const progress = getProgressStatus(procedure);

  switch (procedure.statut) {
    case ProcedureStatus.IN_PROGRESS:
      return `En cours (${progress.percentage}% complété) - ${progress.completed}/${progress.total} étapes`;
    case ProcedureStatus.COMPLETED:
      return `Terminée le ${formatShortDate(procedure.dateCompletion!)}`;
    case ProcedureStatus.CANCELLED:
      return `Annulée${procedure.raisonRejet ? `: ${procedure.raisonRejet}` : ''}`;
    case ProcedureStatus.REJECTED:
      return `Refusée${procedure.raisonRejet ? `: ${procedure.raisonRejet}` : ''}`;
    default:
      return 'Statut inconnu';
  }
};

export default ProcedureApiService;
