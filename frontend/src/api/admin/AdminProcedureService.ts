import { toast } from 'react-toastify';
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_TIMEOUT = 10000;

// ==================== TYPES (Aligned with Backend) ====================
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
  dateMaj: string;
  dateCreation: string;
  dateCompletion?: string;
}

export interface Procedure {
  _id: string;
  id?: string; // Pour compatibilité
  rendezVousId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  filiere: string;
  filiereAutre?: string;
  niveauEtude: string;
  statut: ProcedureStatus;
  steps: Step[];
  isDeleted: boolean;
  raisonRejet?: string;
  dateCompletion?: string;
  createdAt: string;
  updatedAt: string;
  dateDerniereModification?: string;
}

export interface PaginatedResponse {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatsResponse {
  byStatus: Array<{ _id: string; count: number }>;
  byDestination: Array<{ _id: string; count: number }>;
  total: number;
}

export interface ProcedureFilters {
  email?: string;
  statut?: ProcedureStatus | '';
  destination?: string;
  filiere?: string;
  search?: string;
}

export interface UpdateStepDto {
  statut: StepStatus;
  raisonRefus?: string; // Obligatoire si statut = REJECTED
}

export class ProcedureError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

// ==================== API SERVICE CLASS ====================
export class ProcedureApiService {
  private fetchWithAuth: <T = any>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<T>;

  constructor(
    fetchWithAuth: <T = any>(
      endpoint: string,
      options?: RequestInit
    ) => Promise<T>
  ) {
    this.fetchWithAuth = fetchWithAuth;
  }

  // ==================== ERROR HANDLING ====================
  private handleRequestError(error: any): never {
    let errorMessage = error.message || 'Une erreur est survenue';
    let errorCode = 'UNKNOWN_ERROR';

    // Extraire le code d'erreur du backend si disponible
    if (error.code) {
      errorCode = error.code;
    }

    if (error.status === 401 || error.message === 'UNAUTHORIZED') {
      errorCode = 'UNAUTHORIZED';
      toast.error('Session expirée. Veuillez vous reconnecter.');
    } else if (error.status === 403) {
      errorCode = 'FORBIDDEN';
      toast.error('Accès interdit');
    } else if (error.status === 400) {
      // Messages spécifiques pour les erreurs 400
      if (errorMessage.toLowerCase().includes('raison du refus est obligatoire')) {
        errorCode = 'REASON_REQUIRED';
      } else if (errorMessage.toLowerCase().includes('au moins 5 caractères')) {
        errorCode = 'REASON_TOO_SHORT';
      } else if (errorMessage.toLowerCase().includes('dépasser 500 caractères')) {
        errorCode = 'REASON_TOO_LONG';
      } else if (errorMessage.toLowerCase().includes('doit être terminée')) {
        errorCode = 'STEP_ORDER_VIOLATION';
      }
    }

    throw new ProcedureError(errorMessage, errorCode);
  }

  // ==================== CORE REQUEST METHOD - CORRIGÉ ====================
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // S'assurer que l'endpoint commence par /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    console.log('API Call Details:', {
      endpoint: cleanEndpoint,
      method: options.method || 'GET'
    });

    try {
      // fetchWithAuth retourne déjà les données parsées
      // fetchWithAuth gère déjà l'URL de base
      const data = await this.fetchWithAuth<T>(cleanEndpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log('API Response:', cleanEndpoint);
      return data;

    } catch (error: any) {
      console.error('API Request failed:', error);
      
      // Gestion des erreurs spécifiques
      if (error.name === 'AbortError') {
        throw new ProcedureError(
          'La requête a expiré',
          'TIMEOUT'
        );
      }
      
      if (error.message === 'UNAUTHORIZED') {
        throw new ProcedureError(
          'Session expirée',
          'UNAUTHORIZED'
        );
      }

      if (error.status === 404) {
        throw new ProcedureError(
          'Ressource non trouvée',
          'NOT_FOUND'
        );
      }

      if (error.status === 429) {
        throw new ProcedureError(
          'Trop de requêtes, veuillez patienter',
          'RATE_LIMIT'
        );
      }

      if (error.status >= 500) {
        throw new ProcedureError(
          'Erreur serveur, veuillez réessayer',
          'SERVER_ERROR'
        ) as Error & { cause: 'SERVER_ERROR' };
      }
      
      if (error instanceof ProcedureError) {
        throw error;
      }
      
      // Propager les autres erreurs
      this.handleRequestError(error);
    }
  }

  // ==================== ADMIN METHODS ====================
  async getAdminProceduresOverview(): Promise<StatsResponse> {
    return this.makeRequest<StatsResponse>('/api/procedures/admin/stats');
  }

  async getAdminProcedures(
    page: number = 1,
    limit: number = 10,
    filters?: ProcedureFilters
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters?.email) {
      params.append('email', filters.email);
    }

    return this.makeRequest<PaginatedResponse>(
      `/api/procedures/admin/all?${params.toString()}`
    );
  }

  async updateProcedureStep(
    id: string,
    stepName: StepName,
    updateDto: UpdateStepDto
  ): Promise<Procedure> {
    // Validation préliminaire
    if (updateDto.statut === StepStatus.REJECTED) {
      if (!updateDto.raisonRefus || updateDto.raisonRefus.trim() === '') {
        throw new ProcedureError(
          'La raison du refus est obligatoire',
          'REASON_REQUIRED'
        );
      }
      if (updateDto.raisonRefus.trim().length < 5) {
        throw new ProcedureError(
          'La raison doit contenir au moins 5 caractères',
          'REASON_TOO_SHORT'
        );
      }
      if (updateDto.raisonRefus.length > 500) {
        throw new ProcedureError(
          'La raison ne doit pas dépasser 500 caractères',
          'REASON_TOO_LONG'
        );
      }
    }

    const result = await this.makeRequest<Procedure>(
      `/api/procedures/admin/${id}/steps/${encodeURIComponent(stepName)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateDto),
      }
    );

    return result;
  }

  async rejectProcedure(id: string, reason: string): Promise<Procedure> {
    // Validation frontend
    if (!reason || reason.trim() === '') {
      throw new ProcedureError(
        'La raison du rejet est obligatoire',
        'REASON_REQUIRED'
      );
    }
    if (reason.trim().length < 5) {
      throw new ProcedureError(
        'La raison doit contenir au moins 5 caractères',
        'REASON_TOO_SHORT'
      );
    }
    if (reason.length > 500) {
      throw new ProcedureError(
        'La raison ne doit pas dépasser 500 caractères',
        'REASON_TOO_LONG'
      );
    }

    return this.makeRequest<Procedure>(`/api/procedures/admin/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async softDeleteProcedure(id: string, reason?: string): Promise<Procedure> {
    return this.makeRequest<Procedure>(`/api/procedures/admin/${id}`, {
      method: 'DELETE',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  }

  async updateProcedure(
    id: string,
    updateDto: Partial<Procedure>
  ): Promise<Procedure> {
    return this.makeRequest<Procedure>(`/api/procedures/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateDto),
    });
  }

  // ==================== VALIDATION METHODS ====================
  canModifyStep(
    procedure: Procedure,
    stepName: StepName,
    newStatus: StepStatus
  ): { canModify: boolean; reason?: string } {
    const step = procedure.steps.find(s => s.nom === stepName);
    
    if (!step) {
      return { canModify: false, reason: 'Étape non trouvée' };
    }

    // Ne pas permettre de modifier une étape finalisée
    if ([StepStatus.COMPLETED, StepStatus.REJECTED, StepStatus.CANCELLED].includes(step.statut)) {
      return { 
        canModify: false, 
        reason: `Impossible de modifier une étape déjà ${step.statut.toLowerCase()}` 
      };
    }

    // Règle: Admission → Visa → Voyage
    if (stepName === StepName.DEMANDE_VISA) {
      const admissionStep = procedure.steps.find(
        s => s.nom === StepName.DEMANDE_ADMISSION
      );
      if (admissionStep?.statut !== StepStatus.COMPLETED) {
        return { 
          canModify: false, 
          reason: "La demande d'admission doit être terminée avant de modifier le visa" 
        };
      }
    }

    if (stepName === StepName.PREPARATIF_VOYAGE) {
      const visaStep = procedure.steps.find(
        s => s.nom === StepName.DEMANDE_VISA
      );
      if (visaStep?.statut !== StepStatus.COMPLETED) {
        return { 
          canModify: false, 
          reason: 'La demande de visa doit être terminée avant de modifier les préparatifs' 
        };
      }
    }

    // Vérifier si l'admission est rejetée/annulée (cascade)
    const admissionStep = procedure.steps.find(
      s => s.nom === StepName.DEMANDE_ADMISSION
    );
    if (
      admissionStep &&
      [StepStatus.REJECTED, StepStatus.CANCELLED].includes(admissionStep.statut) &&
      stepName !== StepName.DEMANDE_ADMISSION
    ) {
      return { 
        canModify: false, 
        reason: `Impossible de modifier car l'admission est ${admissionStep.statut.toLowerCase()}` 
      };
    }

    return { canModify: true };
  }

  // ==================== UTILITY METHODS ====================
  getStatusColor(status: ProcedureStatus | StepStatus): string {
    if (
      status === ProcedureStatus.IN_PROGRESS ||
      status === StepStatus.IN_PROGRESS
    ) {
      return 'blue';
    }
    if (
      status === ProcedureStatus.COMPLETED ||
      status === StepStatus.COMPLETED
    ) {
      return 'green';
    }
    if (status === ProcedureStatus.REJECTED || status === StepStatus.REJECTED) {
      return 'red';
    }
    if (status === StepStatus.CANCELLED || status === ProcedureStatus.CANCELLED) {
      return 'gray';
    }
    if (status === StepStatus.PENDING) {
      return 'yellow';
    }
    return 'gray';
  }

  translateStepName(stepName: StepName): string {
    const translations: Record<StepName, string> = {
      [StepName.DEMANDE_ADMISSION]: "Demande d'admission",
      [StepName.DEMANDE_VISA]: 'Demande de visa',
      [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage',
    };
    return translations[stepName] || stepName;
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  maskEmail(email: string): string {
    if (!email) return '***@***';
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***@***';
    
    const maskedName = name.length <= 2 
      ? name.charAt(0) + '*'
      : name.charAt(0) + '***' + name.slice(-1);
    
    return `${maskedName}@${domain}`;
  }

  maskId(id: string): string {
    if (!id || id.length < 8) return '***';
    return `${id.substring(0, 4)}***${id.substring(id.length - 4)}`;
  }
}

// ==================== REACT HOOKS ====================
export const useProcedureService = () => {
  const { fetchWithAuth } = useAuth();

  return useMemo(() => {
    const instance = new ProcedureApiService(fetchWithAuth);
    return instance;
  }, [fetchWithAuth]);
};

export const useProcedureActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async <T>(
      operation: () => Promise<T>,
      successMessage?: string
    ): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        if (successMessage) {
          toast.success(successMessage);
        }
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Une erreur est survenue';
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    execute,
  };
};