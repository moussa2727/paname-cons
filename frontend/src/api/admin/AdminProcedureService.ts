// Types et interfaces conformes au backend
export interface Procedure {
  _id: string;
  rendezVousId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  destination: string;
  niveauEtude?: string;
  filiere?: string;
  statut: ProcedureStatus;
  steps: Step[];
  isDeleted: boolean;
  deletedAt?: string;
  deletionReason?: string;
  raisonRejet?: string;
  dateCompletion?: string;
  createdAt: string;
  updatedAt: string;
  dateDerniereModification?: string;
}

export interface Step {
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateMaj: string;
  dateCreation: string;
  dateCompletion?: string;
}

// Enums conformes au backend
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

// Service principal avec intégration AuthContext
export class AdminProcedureApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  // ✅ MÉTHODE PRIVÉE POUR LES REQUÊTES AUTHENTIFIÉES
  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    // Récupération du token depuis les cookies (compatible avec AuthContext)
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    const accessToken = getCookie('access_token');

    if (!accessToken) {
      throw new Error("Token d'accès manquant - Veuillez vous reconnecter");
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Gestion centralisée des codes d'erreur
      if (response.status === 401) {
        throw new Error('SESSION_EXPIRED');
      }

      if (response.status === 403) {
        throw new Error('ACCESS_DENIED');
      }

      if (response.status === 404) {
        throw new Error('RESOURCE_NOT_FOUND');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Erreur ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error: unknown) {
      if ((error as Error).message === 'SESSION_EXPIRED') {
        // Déclencher le refresh via le contexte Auth
        window.dispatchEvent(new CustomEvent('auth-token-expired'));
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }

      if ((error as Error).message === 'ACCESS_DENIED') {
        throw new Error('Accès refusé - Droits insuffisants');
      }

      console.error(`❌ Erreur API ${endpoint}:`, error);
      throw error;
    }
  }

  // ==================== STATISTIQUES ====================
  async getProceduresOverview(): Promise<any> {
    try {
      return await this.makeAuthenticatedRequest('/api/procedures/admin/stats');
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw error;
    }
  }

  // ==================== LISTE DES PROCÉDURES ====================
  async getProcedures(
    page: number = 1,
    limit: number = 10,
    filters?: {
      email?: string;
      destination?: string;
      statut?: string;
    }
  ): Promise<{ data: Procedure[]; total: number; totalPages: number }> {
    try {
      let url = `/api/procedures/admin/all?page=${page}&limit=${limit}`;

      // Construction des paramètres de filtre
      if (filters?.email) {
        url += `&email=${encodeURIComponent(filters.email)}`;
      }
      if (filters?.destination) {
        url += `&destination=${encodeURIComponent(filters.destination)}`;
      }
      if (filters?.statut) {
        url += `&statut=${encodeURIComponent(filters.statut)}`;
      }

      const response = await this.makeAuthenticatedRequest(url);

      // ✅ Formatage standardisé de la réponse
      return {
        data: response.data || [],
        total: response.total || 0,
        totalPages:
          response.totalPages || Math.ceil((response.total || 0) / limit),
      };
    } catch (error: unknown) {
      console.error('❌ Erreur récupération procédures:', error);
      throw error;
    }
  }

  // ==================== DÉTAILS PROCÉDURE ====================
  async getProcedureDetails(id: string): Promise<Procedure> {
    try {
      if (!id || id.length < 10) {
        throw new Error('ID de procédure invalide');
      }
      return await this.makeAuthenticatedRequest(`/api/procedures/admin/${id}`);
    } catch (error: unknown) {
      console.error(`❌ Erreur détails procédure ${this.maskId(id)}:`, error);
      throw error;
    }
  }

  // ==================== MISE À JOUR PROCÉDURE ====================
  async updateProcedure(
    id: string,
    updates: Partial<Procedure>
  ): Promise<Procedure> {
    try {
      return await this.makeAuthenticatedRequest(
        `/api/procedures/admin/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
    } catch (error: unknown) {
      console.error(
        `❌ Erreur mise à jour procédure ${this.maskId(id)}:`,
        error
      );
      throw error;
    }
  }

  // ==================== REJET PROCÉDURE ====================
  async rejectProcedure(id: string, reason: string): Promise<Procedure> {
    try {
      if (!reason || reason.trim().length < 5) {
        throw new Error(
          'La raison du rejet doit contenir au moins 5 caractères'
        );
      }

      return await this.makeAuthenticatedRequest(
        `/api/procedures/admin/${id}/reject`,
        {
          method: 'PUT',
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
    } catch (error: unknown) {
      console.error(`❌ Erreur rejet procédure ${this.maskId(id)}:`, error);
      throw error;
    }
  }

  // ==================== SUPPRESSION PROCÉDURE ====================
  async deleteProcedure(
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.makeAuthenticatedRequest(
        `/api/procedures/admin/${id}`,
        {
          method: 'DELETE',
          body: JSON.stringify({
            reason: reason || 'Supprimé par administrateur',
          }),
        }
      );
    } catch (error: unknown) {
      console.error(
        `❌ Erreur suppression procédure ${this.maskId(id)}:`,
        error
      );
      throw error;
    }
  }

  // ==================== GESTION DES ÉTAPES ====================
  async updateStepStatus(
    procedureId: string,
    stepName: StepName,
    newStatus: StepStatus,
    reason?: string
  ): Promise<Procedure> {
    try {
      const updates: any = {
        statut: newStatus,
        dateMaj: new Date().toISOString(),
      };

      if (reason && newStatus === StepStatus.REJECTED) {
        updates.raisonRefus = reason;
      }

      const encodedStepName = encodeURIComponent(stepName);
      return await this.makeAuthenticatedRequest(
        `/api/procedures/admin/${procedureId}/steps/${encodedStepName}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
    } catch (error: unknown) {
      console.error(
        `❌ Erreur mise à jour étape ${this.maskId(procedureId)}:`,
        error
      );
      throw error;
    }
  }

  // ==================== CRÉATION DE PROCÉDURE ====================
  async createProcedureFromRendezvous(
    rendezVousId: string
  ): Promise<Procedure> {
    try {
      if (!rendezVousId || rendezVousId.length < 10) {
        throw new Error('ID de rendez-vous invalide');
      }

      return await this.makeAuthenticatedRequest(
        '/api/procedures/admin/create',
        {
          method: 'POST',
          body: JSON.stringify({ rendezVousId }),
        }
      );
    } catch (error: unknown) {
      console.error(
        `❌ Erreur création procédure RDV ${this.maskId(rendezVousId)}:`,
        error
      );
      throw error;
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  private maskId(id: string): string {
    if (!id || id.length < 8) return '***';
    return `${id.substring(0, 4)}***${id.substring(id.length - 4)}`;
  }
}

// Instance unique exportée
export const adminProcedureApi = new AdminProcedureApiService();

// Hook personnalisé pour les composants React
export const useAdminProcedureApi = () => {
  return {
    // Méthodes principales
    getProcedures: adminProcedureApi.getProcedures.bind(adminProcedureApi),
    getProcedureDetails:
      adminProcedureApi.getProcedureDetails.bind(adminProcedureApi),
    updateProcedure: adminProcedureApi.updateProcedure.bind(adminProcedureApi),
    rejectProcedure: adminProcedureApi.rejectProcedure.bind(adminProcedureApi),
    deleteProcedure: adminProcedureApi.deleteProcedure.bind(adminProcedureApi),

    // Gestion des étapes
    updateStepStatus:
      adminProcedureApi.updateStepStatus.bind(adminProcedureApi),

    // Statistiques
    getProceduresOverview:
      adminProcedureApi.getProceduresOverview.bind(adminProcedureApi),

    // Création
    createProcedureFromRendezvous:
      adminProcedureApi.createProcedureFromRendezvous.bind(adminProcedureApi),
  };
};
