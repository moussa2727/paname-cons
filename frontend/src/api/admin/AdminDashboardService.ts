// AdminDashboardService.ts
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
  private getCookie: (name: string) => string | null;
  private refreshAuth: () => Promise<boolean>;

  constructor(
    getCookieFn: (name: string) => string | null,
    refreshAuthFn: () => Promise<boolean>
  ) {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.getCookie = getCookieFn;
    this.refreshAuth = refreshAuthFn;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const accessToken = this.getCookie('access_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await this.refreshAuth();
        
        if (refreshed) {
          const newAccessToken = this.getCookie('access_token');
          const retryHeaders = {
            ...headers,
            ...(newAccessToken && { Authorization: `Bearer ${newAccessToken}` }),
          };

          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
          });

          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
        
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API Error ${endpoint}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('Session expirée')) {
          throw error;
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Erreur de connexion au serveur');
        }
      }
      
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Récupérer les statistiques utilisateurs
      const userStatsResponse = await this.request('/api/users/stats');
      const userStats = userStatsResponse.data || userStatsResponse;

      // Stats procédures
      const procedureStatsResponse = await this.request('/api/procedures/admin/stats');
      const procedureStats = procedureStatsResponse.data || procedureStatsResponse;

      // Récupérer les rendez-vous
      const rendezvousResponse = await this.request('/api/rendezvous?limit=1000');
      const allRendezvous = rendezvousResponse.data || rendezvousResponse || [];

      // 🔄 CONVERSION ET NORMALISATION DES STATUTS
      const normalizedProcedureStats = this.normalizeProcedureStats(procedureStats);
      const normalizedRendezvousStats = this.normalizeRendezvousStats(allRendezvous);

      return {
        // Données utilisateurs normalisées
        totalUsers: userStats.totalUsers || userStats.total || 0,
        activeUsers: userStats.activeUsers || userStats.active || 0,
        inactiveUsers: userStats.inactiveUsers || userStats.inactive || 0,
        adminUsers: userStats.adminUsers || userStats.admins || 0,
        regularUsers: userStats.regularUsers || userStats.users || 0,
        
        // Données procédures normalisées
        totalProcedures: normalizedProcedureStats.totalProcedures,
        proceduresByStatus: normalizedProcedureStats.byStatus,
        proceduresByDestination: normalizedProcedureStats.byDestination,
        
        // Données rendez-vous normalisées
        totalRendezvous: allRendezvous.length,
        rendezvousStats: normalizedRendezvousStats,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getDefaultStats();
    }
  }

  async getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
    try {
      // Procédures récentes
      const proceduresResponse = await this.request(`/api/procedures/admin/all?limit=${limit}`);
      const procedures = proceduresResponse.data || proceduresResponse || [];

      // Rendez-vous récents
      const rendezvousResponse = await this.request(`/api/rendezvous?limit=${limit}`);
      const rendezvous = rendezvousResponse.data || rendezvousResponse || [];

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
          userEmail: procedure.email,
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
          userEmail: rdv.email,
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

  async getProcedures(page: number = 1, limit: number = 10) {
    const response = await this.request(`/api/procedures/admin/all?page=${page}&limit=${limit}`);
    return response;
  }

  async updateProcedureStatus(id: string, status: string, reason?: string) {
    // 🔄 CONVERSION STATUT FRONTEND -> BACKEND
    const backendStatus = this.mapProcedureStatusToBackend(status);
    
    if (backendStatus === 'rejected') {
      return this.request(`/api/procedures/admin/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });
    }

    return this.request(`/api/procedures/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: backendStatus }),
    });
  }

  async updateProcedureStep(procedureId: string, stepName: string, updates: any) {
    return this.request(`/api/procedures/admin/${procedureId}/steps/${stepName}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProcedure(id: string, reason?: string) {
    return this.request(`/api/procedures/admin/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // ==================== RENDEZ-VOUS ====================

  async getRendezvous(page: number = 1, limit: number = 10, filters?: any) {
    let url = `/api/rendezvous?page=${page}&limit=${limit}`;

    if (filters?.status) {
      // 🔄 CONVERSION STATUT FRONTEND -> BACKEND
      const backendStatus = this.mapRendezvousStatusToBackend(filters.status);
      url += `&status=${backendStatus}`;
    }
    if (filters?.date) url += `&date=${filters.date}`;
    if (filters?.search) url += `&search=${encodeURIComponent(filters.search)}`;

    const response = await this.request(url);
    return response;
  }

  async updateRendezvousStatus(id: string, status: string, avisAdmin?: string) {
    // 🔄 CONVERSION STATUT FRONTEND -> BACKEND
    const backendStatus = this.mapRendezvousStatusToBackend(status);
    
    return this.request(`/api/rendezvous/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: backendStatus, avisAdmin }),
    });
  }

  async deleteRendezvous(id: string) {
    return this.request(`/api/rendezvous/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== UTILISATEURS ====================

  async getUsers() {
    const response = await this.request('/api/users');
    return response;
  }

  async toggleUserStatus(userId: string) {
    return this.request(`/api/users/${userId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ==================== MAINTENANCE ====================

  async getMaintenanceStatus() {
    return this.request('/api/users/maintenance-status');
  }

  async setMaintenanceMode(enabled: boolean) {
    return this.request('/api/users/maintenance-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async logoutAllUsers() {
    return this.request('/api/auth/logout-all', {
      method: 'POST',
    });
  }

  // 🔄 MÉTHODES DE NORMALISATION
  private normalizeProcedureStats(procedureStats: any) {
    const byStatus = (procedureStats.byStatus || procedureStats.proceduresByStatus || []).map((stat: any) => ({
      _id: this.normalizeProcedureStatus(stat._id || stat.status),
      count: stat.count || stat.total || 0
    }));

    const byDestination = (procedureStats.byDestination || procedureStats.proceduresByDestination || []).map((dest: any) => ({
      _id: dest._id || dest.destination || 'Non spécifiée',
      count: dest.count || dest.total || 0
    }));

    return {
      totalProcedures: procedureStats.total || procedureStats.totalProcedures || 0,
      byStatus,
      byDestination
    };
  }

  private normalizeRendezvousStats(rendezvous: any[]) {
    const stats = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    rendezvous.forEach((rdv: any) => {
      const status = this.normalizeRendezvousStatus(rdv.status);
      if (stats.hasOwnProperty(status)) {
        stats[status as keyof typeof stats]++;
      }
    });

    return stats;
  }

  // 🗂️ NORMALISATION DES STATUTS
  private normalizeProcedureStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En cours',
      'in_progress': 'En cours',
      'in progress': 'En cours',
      'completed': 'Terminée',
      'finished': 'Terminée',
      'rejected': 'Refusée',
      'refused': 'Refusée',
      'cancelled': 'Annulée',
      'canceled': 'Annulée',
      'En cours': 'En cours',
      'Terminée': 'Terminée',
      'Refusée': 'Refusée',
      'Annulée': 'Annulée'
    };
    
    return statusMap[status?.toLowerCase()] || 'En cours';
  }

  private normalizeRendezvousStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'en attente': 'pending',
      'confirmed': 'confirmed',
      'confirmé': 'confirmed',
      'completed': 'completed',
      'terminé': 'completed',
      'cancelled': 'cancelled',
      'annulé': 'cancelled'
    };
    
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  private mapProcedureStatusToBackend(frontendStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'En cours': 'pending',
      'Terminée': 'completed',
      'Refusée': 'rejected',
      'Annulée': 'cancelled'
    };
    
    return statusMap[frontendStatus] || frontendStatus;
  }

  private mapRendezvousStatusToBackend(frontendStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    
    return statusMap[frontendStatus] || frontendStatus;
  }

  private getDefaultStats(): DashboardStats {
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
        cancelled: 0,
      },
    };
  }
}

// Export avec initialisation via le hook personnalisé
export const createDashboardApi = (
  getCookieFn: (name: string) => string | null,
  refreshAuthFn: () => Promise<boolean>
) => {
  return new DashboardApiService(getCookieFn, refreshAuthFn);
};

// Instance par défaut (à utiliser avec précaution)
export const dashboardApi = new DashboardApiService(
  () => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; access_token=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    } catch {
      return null;
    }
  },
  async () => {
    console.warn('refreshAuth non disponible - utilisation de createDashboardApi() recommandée');
    return false;
  }
);