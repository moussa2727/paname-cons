
// Types et interfaces
export interface Procedure {
  _id: string;
  rendezVousId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  destination: string;
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
}

export interface Step {
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateMaj: string;
  dateCreation: string;
  dateCompletion?: string;
}

// Enums
export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Refusée',
  CANCELLED = 'Annulée'
}

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminé',
  REJECTED = 'Rejeté',
  CANCELLED = 'Annulé'
}

export enum StepName {
  DEMANDE_ADMISSION = 'DEMANDE ADMISSION',
  DEMANDE_VISA = 'DEMANDE VISA',
  PREPARATIF_VOYAGE = 'PREPARATIF VOYAGE'
}

// Hook personnalisé pour l'API
export const useAdminProcedureApi = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${baseUrl}${endpoint}`;
    const currentToken = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('storage'));
          throw new Error('Session expirée');
        }
        
        if (response.status === 404) {
          throw new Error(`Endpoint non trouvé: ${endpoint}`);
        }
        
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      throw error;
    }
  };

  // ==================== STATISTIQUES ====================

 const getProceduresOverview = async (): Promise<any> => {
    try {
      return await makeAuthenticatedRequest('/api/procedures/admin/stats');
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw error;
    }
  };

  // ==================== LISTE DES PROCÉDURES ====================
   const fetchProcedures = async (
    page: number = 1, 
    limit: number = 10, 
    email?: string,
    destination?: string,
    statut?: string
  ): Promise<{ data: Procedure[]; total: number; totalPages: number }> => { // ✅ AJOUT DU TYPE DE RETOUR
    let url = `/api/procedures/admin/all?page=${page}&limit=${limit}`;
    
    if (email) url += `&email=${encodeURIComponent(email)}`;
    if (destination) url += `&destination=${encodeURIComponent(destination)}`;
    if (statut) url += `&statut=${encodeURIComponent(statut)}`; // ✅ CORRIGÉ: 'status' → 'statut'

    const response = await makeAuthenticatedRequest(url);
    
    // ✅ ASSURER LE FORMAT DE RÉPONSE UNIFORME
    if (response.data !== undefined) {
      return response;
    } else {
      // Si l'API retourne directement un tableau, l'adapter au format attendu
      return {
        data: Array.isArray(response) ? response : [],
        total: response.total || response.length || 0,
        totalPages: response.totalPages || Math.ceil((response.total || response.length || 0) / limit)
      };
    }
  };

  // ==================== GESTION DES PROCÉDURES ====================

  const getProcedureDetails = async (id: string) => {
    return makeAuthenticatedRequest(`/api/procedures/admin/${id}`);
  };

  const updateProcedure = async (id: string, updates: any) => {
    return makeAuthenticatedRequest(`/api/procedures/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  };

   const rejectProcedure = async (id: string, reason: string): Promise<Procedure> => { // ✅ AJOUT DU TYPE DE RETOUR
    return makeAuthenticatedRequest(`/api/procedures/admin/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  };

   const deleteProcedure = async (id: string, reason?: string): Promise<{ success: boolean; message: string }> => { // ✅ AJOUT DU TYPE DE RETOUR
    return makeAuthenticatedRequest(`/api/procedures/admin/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  };

  // ==================== GESTION DES ÉTAPES ====================

 const updateStepStatus = async (
    procedureId: string, 
    stepName: StepName, 
    newStatus: StepStatus, 
    reason?: string
    ): Promise<Procedure> => { // ✅ AJOUT DU TYPE DE RETOUR
    const updates: any = { statut: newStatus };
    
    if (reason && newStatus === StepStatus.REJECTED) {
      updates.raisonRefus = reason;
    }

    return makeAuthenticatedRequest(
      `/api/procedures/admin/${procedureId}/steps/${encodeURIComponent(stepName)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  };

  // ==================== CRÉATION DE PROCÉDURE ====================

  const createProcedureFromRendezvous = async (rendezVousId: string) => {
    return makeAuthenticatedRequest('/api/procedures/admin/create', {
      method: 'POST',
      body: JSON.stringify({ rendezVousId })
    });
  };

  // ==================== RECHERCHE ET FILTRES ====================

  const searchProcedures = async (query: string, page: number = 1, limit: number = 10) => {
    return makeAuthenticatedRequest(
      `/api/procedures/admin/all?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
  };

  const getProceduresByDestination = async (destination: string, page: number = 1, limit: number = 10) => {
    return makeAuthenticatedRequest(
      `/api/procedures/admin/all?destination=${encodeURIComponent(destination)}&page=${page}&limit=${limit}`
    );
  };

  const getProceduresByStatus = async (status: string, page: number = 1, limit: number = 10) => {
    return makeAuthenticatedRequest(
      `/api/procedures/admin/all?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`
    );
  };

  return {
    // Méthodes principales
    fetchProcedures,
    getProcedureDetails,
    updateProcedure,
    rejectProcedure,
    deleteProcedure,
    
    // Gestion des étapes
    updateStepStatus,
    
    // Statistiques
    getProceduresOverview,
    
    // Création
    createProcedureFromRendezvous,
    
    // Recherche et filtres
    searchProcedures,
    getProceduresByDestination,
    getProceduresByStatus
  };
};

// Export pour une utilisation directe (sans hook)
export class AdminProcedureApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const currentToken = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('storage'));
          throw new Error('Session expirée');
        }
        
        if (response.status === 404) {
          throw new Error(`Endpoint non trouvé: ${endpoint}`);
        }
        
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      throw error;
    }
  }

  async getProceduresOverview() {
    try {
      return await this.makeAuthenticatedRequest('/api/procedures/admin/stats');
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw error;
    }
  }

  async getProcedures(page: number = 1, limit: number = 10, filters?: any) {
    let url = `/api/procedures/admin/all?page=${page}&limit=${limit}`;
    
    if (filters?.email) url += `&email=${encodeURIComponent(filters.email)}`;
    if (filters?.destination) url += `&destination=${encodeURIComponent(filters.destination)}`;
    if (filters?.status) url += `&status=${encodeURIComponent(filters.status)}`;
    if (filters?.search) url += `&search=${encodeURIComponent(filters.search)}`;

    return this.makeAuthenticatedRequest(url);
  }
  
  async getProcedureDetails(id: string) {
    return this.makeAuthenticatedRequest(`/api/procedures/admin/${id}`);
  }
  async updateProcedure(id: string, updates: any) {
    return this.makeAuthenticatedRequest(`/api/procedures/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async rejectProcedure(id: string, reason: string) {
    return this.makeAuthenticatedRequest(`/api/procedures/admin/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }

  async deleteProcedure(id: string, reason?: string) {
    return this.makeAuthenticatedRequest(`/api/procedures/admin/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  }

  async updateStepStatus(
    procedureId: string, 
    stepName: StepName, 
    newStatus: StepStatus, 
    reason?: string
  ) {
    const updates: any = { statut: newStatus }; 
    if (reason && newStatus === StepStatus.REJECTED) {
      updates.raisonRefus = reason;
    }
    return this.makeAuthenticatedRequest(
      `/api/procedures/admin/${procedureId}/steps/${encodeURIComponent(stepName)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  }

  async createProcedureFromRendezvous(rendezVousId: string) {
    return this.makeAuthenticatedRequest('/api/procedures/admin/create', {
      method: 'POST',
      body: JSON.stringify({ rendezVousId })
    });
  }

  async searchProcedures(query: string, page: number = 1, limit: number = 10) {
    return this.makeAuthenticatedRequest(
      `/api/procedures/admin/all?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
  }

  async getProceduresByDestination(destination: string, page: number = 1, limit: number = 10) {
    return this.makeAuthenticatedRequest(
      `/api/procedures/admin/all?destination=${encodeURIComponent(destination)}&page=${page}&limit=${limit}`
    );
  }

  async getProceduresByStatus(status: string, page: number = 1, limit: number = 10) {
    return this.makeAuthenticatedRequest(
      `/api/procedures/admin/all?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`
    );
  }

}

export const adminProcedureApi = new AdminProcedureApiService();
