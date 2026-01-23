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
}

export interface PaginatedUserProcedures {
  data: UserProcedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== SERVICE API USER ====================
class ProcedureApiService {
  private fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;

  constructor(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    this.fetchWithAuth = fetchWithAuth;
  }

  /**
   * Récupérer les procédures de l'utilisateur connecté
   */
  async fetchUserProcedures(page: number = 1, limit: number = 10): Promise<PaginatedUserProcedures> {
    const response = await this.fetchWithAuth(`/api/procedures/user?page=${page}&limit=${limit}`);

    if (!response.ok) {
      if (response.status === 401) throw new Error('SESSION_EXPIRED');
      throw new Error(`Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Récupérer les détails d'une procédure
   */
  async fetchProcedureDetails(procedureId: string): Promise<UserProcedure> {
    if (!procedureId) throw new Error('ID de procédure manquant');

    const response = await this.fetchWithAuth(`/api/procedures/${procedureId}`);

    if (!response.ok) {
      if (response.status === 404) throw new Error('Procédure non trouvée');
      throw new Error(`Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Annuler une procédure
   */
  async cancelProcedure(procedureId: string, reason?: string): Promise<UserProcedure> {
    if (!procedureId) throw new Error('ID de procédure manquant');

    const response = await this.fetchWithAuth(`/api/procedures/${procedureId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erreur ${response.status}`;

      if (response.status === 403) throw new Error('Action non autorisée');
      if (response.status === 400) throw new Error('Procédure déjà finalisée');
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

// ==================== HOOKS USER ====================

/**
 * Hook pour récupérer les procédures de l'utilisateur
 */
export const useUserProcedures = (page: number = 1, limit: number = 10) => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [procedures, setProcedures] = useState<PaginatedUserProcedures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiService = new ProcedureApiService(fetchWithAuth);
      const data = await apiService.fetchUserProcedures(page, limit);
      setProcedures(data);
    } catch (err: any) {
      setError(err.message);
      if (err.message !== 'SESSION_EXPIRED') {
        toast.error('Erreur lors du chargement des procédures');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, page, limit, isAuthenticated]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  return { procedures, loading, error, refetch: fetchProcedures };
};

/**
 * Hook pour récupérer les détails d'une procédure
 */
export const useProcedureDetails = (procedureId: string | null) => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [procedure, setProcedure] = useState<UserProcedure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!procedureId || !isAuthenticated) {
      setProcedure(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiService = new ProcedureApiService(fetchWithAuth);
      const data = await apiService.fetchProcedureDetails(procedureId);
      setProcedure(data);
    } catch (err: any) {
      setError(err.message);
      if (err.message !== 'SESSION_EXPIRED') {
        toast.error('Erreur lors du chargement des détails');
      }
    } finally {
      setLoading(false);
    }
  }, [procedureId, fetchWithAuth, isAuthenticated]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { procedure, loading, error, refetch: fetchDetails };
};

/**
 * Hook pour annuler une procédure
 */
export const useCancelProcedure = () => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const cancelProcedure = useCallback(async (procedureId: string, reason?: string): Promise<UserProcedure | null> => {
    if (!procedureId || !isAuthenticated) throw new Error('Non authentifié');

    setLoading(true);

    try {
      const apiService = new ProcedureApiService(fetchWithAuth);
      const data = await apiService.cancelProcedure(procedureId, reason);
      toast.success('Procédure annulée avec succès');
      return data;
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAuthenticated]);

  return { cancelProcedure, loading };
};

// ==================== FONCTIONS UTILITAIRES USER ====================

/**
 * Vérifie si une procédure peut être annulée
 */
export const canCancelProcedure = (procedure: UserProcedure): boolean => {
  const finalStatuses = [ProcedureStatus.COMPLETED, ProcedureStatus.CANCELLED, ProcedureStatus.REJECTED];
  if (finalStatuses.includes(procedure.statut)) return false;
  
  const hasCompletedSteps = procedure.steps.some(step => step.statut === StepStatus.COMPLETED);
  return !hasCompletedSteps;
};

/**
 * Calcule la progression d'une procédure
 */
export const getProgressStatus = (procedure: UserProcedure): { percentage: number; completed: number; total: number } => {
  const totalSteps = procedure.steps.length;
  const completedSteps = procedure.steps.filter(step => step.statut === StepStatus.COMPLETED).length;

  return {
    percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    completed: completedSteps,
    total: totalSteps,
  };
};

/**
 * Formate une date pour l'affichage
 */
export const formatProcedureDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Date invalide';
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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
 * Obtient le statut d'affichage d'une procédure
 */
export const getProcedureDisplayStatus = (status: ProcedureStatus): string => status.toString();

/**
 * Obtient le statut d'affichage d'une étape
 */
export const getStepDisplayStatus = (status: StepStatus): string => status.toString();

/**
 * Obtient la couleur du statut d'une procédure
 */
export const getProcedureStatusColor = (statut: ProcedureStatus): string => {
  switch (statut) {
    case ProcedureStatus.IN_PROGRESS: return 'bg-blue-50 text-blue-700 border-blue-200';
    case ProcedureStatus.COMPLETED: return 'bg-green-50 text-green-700 border-green-200';
    case ProcedureStatus.CANCELLED: return 'bg-gray-100 text-gray-700 border-gray-300';
    case ProcedureStatus.REJECTED: return 'bg-orange-50 text-orange-700 border-orange-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

/**
 * Obtient la couleur du statut d'une étape
 */
export const getStepStatusColor = (statut: StepStatus): string => {
  switch (statut) {
    case StepStatus.PENDING: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case StepStatus.IN_PROGRESS: return 'bg-blue-50 text-blue-700 border-blue-200';
    case StepStatus.COMPLETED: return 'bg-green-50 text-green-700 border-green-200';
    case StepStatus.CANCELLED: return 'bg-gray-100 text-gray-600 border-gray-300';
    case StepStatus.REJECTED: return 'bg-orange-50 text-orange-700 border-orange-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export default ProcedureApiService;