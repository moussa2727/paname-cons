export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalProcedures: number;
  proceduresByStatus: Array<{ _id: string; count: number }>;
  proceduresByDestination: Array<{ _id: string; count: number }>;
  totalRendezvous: number;
  rendezvousStats: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

export interface RecentActivity {
  _id: string;
  type: 'procedure' | 'rendezvous' | 'user';
  action: string;
  description: string;
  timestamp: Date;
  userEmail?: string;
}

class DashboardApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
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
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Récupérer les statistiques utilisateurs
      const userStats = await this.request('/api/users/stats');
      
      // ✅ CORRECTION : Bon endpoint pour les stats procédures
      const procedureStats = await this.request('/api/procedures/admin/stats');
      
      // Récupérer les rendez-vous pour les statistiques
      const rendezvousResponse = await this.request('/api/rendezvous?limit=1000');
      const allRendezvous = rendezvousResponse.data || [];

      // Calculer les stats des rendez-vous
      const rendezvousStats = {
        pending: allRendezvous.filter((rdv: any) => rdv.status === 'En attente').length,
        confirmed: allRendezvous.filter((rdv: any) => rdv.status === 'Confirmé').length,
        completed: allRendezvous.filter((rdv: any) => rdv.status === 'Terminé').length,
        cancelled: allRendezvous.filter((rdv: any) => rdv.status === 'Annulé').length,
      };

      // ✅ CORRECTION : Structure cohérente avec le backend
      const safeProcedureStats = {
        proceduresByStatus: procedureStats.byStatus || [],
        proceduresByDestination: procedureStats.byDestination || [],
        totalProcedures: procedureStats.total || 0
      };

      return {
        ...userStats,
        ...safeProcedureStats,
        totalRendezvous: allRendezvous.length,
        rendezvousStats
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        totalProcedures: 0,
        proceduresByStatus: [],
        proceduresByDestination: [],
        totalRendezvous: 0,
        rendezvousStats: {
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0
        }
      };
    }
  }

  async getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
    try {
      // ✅ CORRECTION : Bon endpoint pour les procédures
      const proceduresResponse = await this.request(`/api/procedures/admin/all?limit=${limit}`);
      const procedures = proceduresResponse.data || [];
      
      // ✅ CORRECTION : Bon endpoint pour les rendez-vous
      const rendezvousResponse = await this.request(`/api/rendezvous?limit=${limit}`);
      const rendezvous = rendezvousResponse.data || [];

      // Transformer en activités récentes
      const activities: RecentActivity[] = [];

      // Ajouter les procédures récentes
      procedures.forEach((procedure: any) => {
        activities.push({
          _id: procedure._id,
          type: 'procedure',
          action: 'created',
          description: `Nouvelle procédure pour ${procedure.prenom} ${procedure.nom}`,
          timestamp: new Date(procedure.createdAt),
          userEmail: procedure.email
        });
      });

      // Ajouter les rendez-vous récents
      rendezvous.forEach((rdv: any) => {
        activities.push({
          _id: rdv._id,
          type: 'rendezvous',
          action: 'created',
          description: `Rendez-vous créé pour ${rdv.firstName} ${rdv.lastName}`,
          timestamp: new Date(rdv.createdAt),
          userEmail: rdv.email
        });
      });

      // Trier par date et limiter
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  // ==================== PROCÉDURES ====================

  async getProcedures(page: number = 1, limit: number = 10, email?: string) {
    // ✅ CORRECTION : Bon endpoint
    let url = `/api/procedures/admin/all?page=${page}&limit=${limit}`;
    if (email) url += `&email=${encodeURIComponent(email)}`;
    
    return this.request(url);
  }

  async updateProcedureStatus(id: string, status: string, reason?: string) {
    // ✅ CORRECTION : Bon endpoint
    if (status === 'rejected') {
      return this.request(`/api/procedures/admin/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
    }
    
    return this.request(`/api/procedures/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: status })
    });
  }

  async updateProcedureStep(procedureId: string, stepName: string, updates: any) {
    // ✅ CORRECTION : Bon endpoint
    return this.request(`/api/procedures/admin/${procedureId}/steps/${stepName}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // ==================== RENDEZ-VOUS ====================

  async getRendezvous(page: number = 1, limit: number = 10, filters?: any) {
    let url = `/api/rendezvous?page=${page}&limit=${limit}`;
    
    if (filters?.status) url += `&status=${filters.status}`;
    if (filters?.date) url += `&date=${filters.date}`;
    if (filters?.search) url += `&search=${encodeURIComponent(filters.search)}`;
    
    return this.request(url);
  }

  async updateRendezvousStatus(id: string, status: string, avisAdmin?: string) {
    return this.request(`/api/rendezvous/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, avisAdmin })
    });
  }

  // ==================== UTILISATEURS ====================

  async getUsers() {
    return this.request(`/api/users`);
  }

  async toggleUserStatus(userId: string) {
    return this.request(`/api/users/${userId}/toggle-status`, {
      method: 'PATCH'
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/api/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // ==================== MAINTENANCE ====================

  async getMaintenanceStatus() {
    return this.request(`/api/users/maintenance-status`);
  }

  async setMaintenanceMode(enabled: boolean) {
    return this.request(`/api/users/maintenance-mode`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  async logoutAllUsers() {
    return this.request(`/api/auth/logout-all`, {
      method: 'POST'
    });
  }
}

export const dashboardApi = new DashboardApiService();