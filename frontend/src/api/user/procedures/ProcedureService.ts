// ProcedureService.ts - VERSION SÉCURISÉE ET CORRIGÉE
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// ==================== TYPES SÉCURISÉS POUR UTILISATEUR ====================

export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Rejetée',
  CANCELLED = 'Annulée',
}

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Rejetée',
  CANCELLED = 'Annulée',
}

export enum StepName {
  DEMANDE_ADMISSION = "Demande d'admission",
  DEMANDE_VISA = 'Demande de visa',
  PREPARATIF_VOYAGE = 'Préparatifs de voyage',
}

export interface UserProcedureStep {
  nom: StepName;
  statut: StepStatus;
  dateCreation: Date;
  dateMaj: Date;
  raisonRefus?: string;
  commentaires?: string;
}

export interface RendezvousInfo {
  _id: string;
  firstName: string;
  lastName: string;
  date: Date;
  time: string;
  status: string;
  avisAdmin?: string;
}

// ✅ TYPE SÉCURISÉ - SANS DONNÉES ADMIN
export interface UserProcedure {
  _id: string;
  rendezVousId: RendezvousInfo | string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  niveauEtude?: string;
  filiere?: string;
  statut: ProcedureStatus;
  steps: UserProcedureStep[];
  raisonRejet?: string;
  dateCompletion?: Date;
  dateDerniereModification?: Date;
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

export interface CancelProcedureDto {
  reason?: string;
}

// ==================== SERVICE API SÉCURISÉ ====================

const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_TIMEOUT = 15000;

class ProcedureApiService {
  /**
   * ✅ Récupérer les procédures de l'utilisateur connecté (SÉCURISÉ)
   */
  static async fetchUserProcedures(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedUserProcedures> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/user?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createSecureError(response);
      }

      const data = await response.json();
      return this.sanitizeProceduresData(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ✅ Récupérer les détails d'une procédure spécifique (SÉCURISÉ)
   */
  static async fetchProcedureDetails(
    procedureId: string
  ): Promise<UserProcedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/${procedureId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createSecureError(response);
      }

      const data = await response.json();
      return this.sanitizeProcedureData(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ✅ Annuler une procédure (User seulement - SÉCURISÉ)
   */
  static async cancelProcedure(
    procedureId: string,
    reason?: string
  ): Promise<UserProcedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/${procedureId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ reason } as CancelProcedureDto),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createSecureError(response);
      }

      const data = await response.json();
      return this.sanitizeProcedureData(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== MÉTHODES DE SÉCURITÉ PRIVÉES ====================

  /**
   * ✅ Créer des erreurs sécurisées sans détails techniques
   */
  private static createSecureError(response: Response): Error {
    const error = new Error(this.getSecureErrorMessage(response.status));
    (error as any).status = response.status;

    // ✅ Marquer uniquement les erreurs de session
    if (response.status === 401) {
      (error as any).isSessionExpired = true;
    }

    return error;
  }

  /**
   * ✅ Messages d'erreur sécurisés pour l'utilisateur
   */
  private static getSecureErrorMessage(status: number): string {
    switch (status) {
      case 401:
        return 'SESSION_EXPIRED';
      case 403:
        return 'ACCES_REFUSE';
      case 404:
        return 'PROCEDURE_INTROUVABLE';
      case 429:
        return 'TROP_REQUETES';
      case 500:
        return 'ERREUR_SERVEUR';
      default:
        return 'ERREUR_INCONNUE';
    }
  }

  /**
   * ✅ Filtrer les données sensibles d'une procédure
   */
  private static sanitizeProcedureData(data: any): UserProcedure {
    if (!data) throw new Error('Données de procédure invalides');

    // ✅ Supprimer les champs réservés aux admins
    const {
      isDeleted,
      deletedAt,
      deletionReason,
      telephone,
      // Extraire uniquement les champs autorisés
      ...safeData
    } = data;

    return safeData as UserProcedure;
  }

  /**
   * ✅ Filtrer les données sensibles d'une liste de procédures
   */
  private static sanitizeProceduresData(data: any): PaginatedUserProcedures {
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Données de procédures invalides');
    }

    return {
      ...data,
      data: data.data.map((procedure: any) =>
        this.sanitizeProcedureData(procedure)
      ),
    };
  }
}

// ==================== CUSTOM HOOKS SÉCURISÉS ====================

/**
 * ✅ Hook pour récupérer les procédures de l'utilisateur avec pagination
 */
export const useUserProcedures = (page: number = 1, limit: number = 10) => {
  const [procedures, setProcedures] = useState<PaginatedUserProcedures | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchUserProcedures(page, limit);
      setProcedures(data);
    } catch (err: any) {
      const safeErrorMessage = getSafeUserErrorMessage(err);
      setError(safeErrorMessage);

      // ✅ Logs de débogage sécurisés
      console.log('🔍 Erreur useUserProcedures:', {
        type: safeErrorMessage,
        status: err.status,
      });

      // ✅ Toast uniquement pour les erreurs non-session
      if (safeErrorMessage !== 'SESSION_EXPIRED') {
        toast.error(getUserFriendlyMessage(safeErrorMessage));
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  return {
    procedures,
    loading,
    error,
    refetch: fetchProcedures,
  };
};

/**
 * ✅ Hook pour récupérer les détails d'une procédure
 */
export const useProcedureDetails = (procedureId: string | null) => {
  const [procedure, setProcedure] = useState<UserProcedure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!procedureId) {
      setProcedure(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchProcedureDetails(procedureId);
      setProcedure(data);
    } catch (err: any) {
      const safeErrorMessage = getSafeUserErrorMessage(err);
      setError(safeErrorMessage);

      console.log('🔍 Erreur useProcedureDetails:', {
        type: safeErrorMessage,
        status: err.status,
      });

      if (safeErrorMessage !== 'SESSION_EXPIRED') {
        toast.error(getUserFriendlyMessage(safeErrorMessage));
      }
    } finally {
      setLoading(false);
    }
  }, [procedureId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    procedure,
    loading,
    error,
    refetch: fetchDetails,
  };
};

/**
 * ✅ Hook pour annuler une procédure (User seulement)
 */
export const useCancelProcedure = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const cancelProcedure = useCallback(
    async (
      procedureId: string,
      reason?: string
    ): Promise<UserProcedure | null> => {
      setLoading(true);

      try {
        const data = await ProcedureApiService.cancelProcedure(
          procedureId,
          reason
        );
        toast.success('Procédure annulée avec succès');
        return data;
      } catch (err: any) {
        const safeErrorMessage = getSafeUserErrorMessage(err);

        console.log('🔍 Erreur useCancelProcedure:', {
          type: safeErrorMessage,
          status: err.status,
        });

        if (safeErrorMessage !== 'SESSION_EXPIRED') {
          toast.error(getUserFriendlyMessage(safeErrorMessage));
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    cancelProcedure,
    loading,
  };
};

// ==================== FONCTIONS UTILITAIRES SÉCURISÉES ====================

/**
 * ✅ Vérifie si une procédure peut être annulée (validation frontend indicative seulement)
 */
export const canCancelProcedure = (procedure: UserProcedure): boolean => {
  // ✅ Cette validation est indicative - la validation réelle se fait côté backend
  if (procedure.statut !== ProcedureStatus.IN_PROGRESS) return false;

  // ✅ Vérifier qu'aucune étape n'est terminée (logique métier)
  const hasCompletedSteps = procedure.steps.some(
    (step: UserProcedureStep) => step.statut === StepStatus.COMPLETED
  );

  return !hasCompletedSteps;
};

/**
 * ✅ Calcule la progression d'une procédure
 */
export const getProgressStatus = (
  procedure: UserProcedure
): {
  percentage: number;
  completed: number;
  total: number;
} => {
  const totalSteps = procedure.steps.length;
  const completedSteps = procedure.steps.filter(
    (step: UserProcedureStep) => step.statut === StepStatus.COMPLETED
  ).length;

  return {
    percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    completed: completedSteps,
    total: totalSteps,
  };
};

/**
 * ✅ Formate une date pour l'affichage
 */
export const formatProcedureDate = (dateString: string | Date): string => {
  try {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Date invalide';
  }
};

/**
 * ✅ Obtient le nom d'affichage d'une étape
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
 * ✅ Obtient le statut d'affichage d'une procédure
 */
export const getProcedureDisplayStatus = (status: ProcedureStatus): string => {
  const statusMap: Record<ProcedureStatus, string> = {
    [ProcedureStatus.IN_PROGRESS]: 'En cours',
    [ProcedureStatus.COMPLETED]: 'Terminée',
    [ProcedureStatus.REJECTED]: 'Refusée',
    [ProcedureStatus.CANCELLED]: 'Annulée',
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Obtient le statut d'affichage d'une étape
 */
export const getStepDisplayStatus = (status: StepStatus): string => {
  const statusMap: Record<StepStatus, string> = {
    [StepStatus.PENDING]: 'En attente',
    [StepStatus.IN_PROGRESS]: 'En cours',
    [StepStatus.COMPLETED]: 'Terminée',
    [StepStatus.REJECTED]: 'Rejetée',
    [StepStatus.CANCELLED]: 'Annulée',
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Obtient la couleur du statut d'une procédure
 */
export const getProcedureStatusColor = (statut: ProcedureStatus): string => {
  switch (statut) {
    case ProcedureStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case ProcedureStatus.COMPLETED:
      return 'bg-green-50 text-green-700 border-green-200';
    case ProcedureStatus.CANCELLED:
      return 'bg-red-50 text-red-700 border-red-200';
    case ProcedureStatus.REJECTED:
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

/**
 * ✅ Obtient la couleur du statut d'une étape
 */
export const getStepStatusColor = (statut: StepStatus): string => {
  switch (statut) {
    case StepStatus.PENDING:
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case StepStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case StepStatus.COMPLETED:
      return 'bg-green-50 text-green-700 border-green-200';
    case StepStatus.CANCELLED:
      return 'bg-red-50 text-red-700 border-red-200';
    case StepStatus.REJECTED:
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// ==================== FONCTIONS DE SÉCURITÉ INTERNES ====================

/**
 * ✅ Convertit les erreurs techniques en messages sécurisés
 */
const getSafeUserErrorMessage = (error: any): string => {
  if (error.isSessionExpired) return 'SESSION_EXPIRED';
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }
  return 'ERREUR_INCONNUE';
};

/**
 * ✅ Messages utilisateur friendly
 */
const getUserFriendlyMessage = (errorCode: string): string => {
  const messages: Record<string, string> = {
    SESSION_EXPIRED: 'Session expirée - Veuillez vous reconnecter',
    ACCES_REFUSE: 'Action non autorisée',
    PROCEDURE_INTROUVABLE: 'Procédure non trouvée',
    TROP_REQUETES: 'Trop de requêtes - Veuillez patienter',
    ERREUR_SERVEUR: 'Erreur serveur - Veuillez réessayer',
    ERREUR_INCONNUE: 'Une erreur est survenue',
    'Délai de connexion dépassé': 'Délai de connexion dépassé',
    'ID de procédure manquant': 'Identifiant de procédure manquant',
  };

  return messages[errorCode] || 'Une erreur est survenue';
};

// ==================== EXPORT ====================

export default ProcedureApiService;
