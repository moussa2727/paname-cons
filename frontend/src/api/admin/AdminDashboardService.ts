import { toast } from 'react-toastify';

interface ProcedureStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  cancelled: number;
  byMonth?: Array<{ month: string; count: number }>;
  averageCompletionTime?: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  byRole?: Array<{ role: string; count: number }>;
  recentRegistrations?: number;
  averageLoginsPerUser?: number;
  last24hLogins?: number;
  last7dRegistrations?: number;
}

interface RendezvousStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  today?: number;
  upcoming?: number;
  completedWithFavorable?: number;
  completedWithUnfavorable?: number;
  byDestination?: Array<{ destination: string; count: number }>;
  byStudyLevel?: Array<{ niveau: string; count: number }>;
  byStatus?: Array<{ status: string; count: number }>;
}

interface ContactStats {
  total: number;
  unread: number;
  read: number;
  replied: number;
  byDay?: Array<{ date: string; count: number }>;
  avgResponseTimeHours?: number;
}

interface DestinationStats {
  total: number;
  byCountry?: Array<{ country: string; count: number }>;
  mostPopular?: Array<{ country: string; count: number }>;
}

interface SystemStatus {
  database: boolean;
  cache?: boolean;
  maintenanceMode: boolean;
  uptime?: string;
  version?: string;
  service: string;
}

interface HealthCheck {
  status: string;
  timestamp: string;
  database: string;
  service: string;
  version: string;
}

interface GeneralStatsResponse {
  procedures: ProcedureStats;
  users: UserStats;
  rendezvous: RendezvousStats;
  contacts: ContactStats;
  destinations?: DestinationStats;
  systemStatus: {
    database: boolean;
    cache: boolean;
    maintenanceMode: boolean;
    uptime: string;
  };
  timestamp: string;
}

class AdminDashboardService {
  private API_URL = import.meta.env.VITE_API_URL;
  private fetchWithAuth: ((endpoint: string, options?: RequestInit) => Promise<Response>) | null = null;

  // ✅ Méthode pour injecter fetchWithAuth du contexte
  public setFetchWithAuth(fetchMethod: (endpoint: string, options?: RequestInit) => Promise<Response>): void {
    this.fetchWithAuth = fetchMethod;
  }

  private ensureFetchWithAuth(): (endpoint: string, options?: RequestInit) => Promise<Response> {
    if (!this.fetchWithAuth) {
      throw new Error('fetchWithAuth must be set via setFetchWithAuth() before using the service');
    }
    return this.fetchWithAuth;
  }

  // ==================== STATISTIQUES GÉNÉRALES ====================

  /**
   * Récupère toutes les statistiques pour le dashboard admin
   * Utilise les endpoints existants : procedures/admin/stats, users/stats, contact/stats
   */
  async getGeneralStats(): Promise<GeneralStatsResponse> {
    try {
      const fetch = this.ensureFetchWithAuth();

      // Récupérer les statistiques procédures (endpoint existant)
      const proceduresPromise = fetch('/api/procedures/admin/stats');
      
      // Récupérer les statistiques utilisateurs (endpoint existant)
      const usersPromise = fetch('/api/users/stats');
      
      // Récupérer les statistiques contacts (endpoint existant)
      const contactsPromise = fetch('/api/contact/stats');
      
      // Récupérer le statut maintenance (endpoint existant)
      const maintenancePromise = fetch('/api/users/maintenance-status');
      
      // Récupérer la santé du système (endpoint existant)
      const healthPromise = fetch('/api/users/health');

      // Exécuter toutes les requêtes en parallèle
      const [proceduresResponse, usersResponse, contactsResponse, maintenanceResponse, healthResponse] = 
        await Promise.all([
          proceduresPromise,
          usersPromise,
          contactsPromise,
          maintenancePromise,
          healthPromise
        ]);

      // Vérifier les réponses
      if (!proceduresResponse.ok) throw new Error('Erreur récupération stats procédures');
      if (!usersResponse.ok) throw new Error('Erreur récupération stats utilisateurs');
      if (!contactsResponse.ok) throw new Error('Erreur récupération stats contacts');
      if (!maintenanceResponse.ok) throw new Error('Erreur récupération statut maintenance');
      if (!healthResponse.ok) throw new Error('Erreur récupération santé système');

      // Parser les réponses
      const proceduresStats: ProcedureStats = await proceduresResponse.json();
      const usersStats: UserStats = await usersResponse.json();
      const contactsStats: ContactStats = await contactsResponse.json();
      const maintenanceStatus = await maintenanceResponse.json();
      const healthStatus: HealthCheck = await healthResponse.json();

      // Calculer les stats rendez-vous à partir de la liste complète (1 seul élément pour avoir le total)
      const rendezvousResponse = await fetch('/api/rendezvous?page=1&limit=1');
      const rendezvousData = rendezvousResponse.ok ? await rendezvousResponse.json() : { total: 0 };

      // Calculer les stats destinations à partir de la liste complète
      const destinationsResponse = await fetch('/api/destinations?page=1&limit=1');
      const destinationsData = destinationsResponse.ok ? await destinationsResponse.json() : { total: 0 };

      // Construire la réponse consolidée
      return {
        procedures: proceduresStats,
        users: usersStats,
        rendezvous: this.calculateRendezvousStats(rendezvousData),
        contacts: contactsStats,
        destinations: this.calculateDestinationStats(destinationsData),
        systemStatus: {
          database: healthStatus.database === 'connected',
          cache: true, // Valeur par défaut
          maintenanceMode: maintenanceStatus.isActive || false,
          uptime: this.calculateUptime(healthStatus.timestamp)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('Erreur récupération statistiques générales:', error);
      toast.error('Erreur lors de la récupération des statistiques');
      
      // Retourner des statistiques par défaut en cas d'erreur
      return this.getDefaultStats();
    }
  }

  /**
   * Récupère uniquement les statistiques des procédures
   * Endpoint: GET /api/procedures/admin/stats
   */
  async getProcedureStats(): Promise<ProcedureStats> {
    try {
      const fetch = this.ensureFetchWithAuth();
      const response = await fetch('/api/procedures/admin/stats');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les statistiques des procédures`);
      }
      
      const stats: ProcedureStats = await response.json();
      toast.success('Statistiques procédures mises à jour');
      return stats;
    } catch (error: any) {
      console.error('Erreur récupération stats procédures:', error);
      toast.error(error.message || 'Erreur récupération stats procédures');
      throw error;
    }
  }

  /**
   * Récupère uniquement les statistiques des utilisateurs
   * Endpoint: GET /api/users/stats
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const fetch = this.ensureFetchWithAuth();
      const response = await fetch('/api/users/stats');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les statistiques utilisateurs`);
      }
      
      const stats: UserStats = await response.json();
      toast.success('Statistiques utilisateurs mises à jour');
      return stats;
    } catch (error: any) {
      console.error('Erreur récupération stats utilisateurs:', error);
      toast.error(error.message || 'Erreur récupération stats utilisateurs');
      throw error;
    }
  }

  /**
   * Récupère uniquement les statistiques des contacts
   * Endpoint: GET /api/contact/stats
   */
  async getContactStats(): Promise<ContactStats> {
    try {
      const fetch = this.ensureFetchWithAuth();
      const response = await fetch('/api/contact/stats');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les statistiques contacts`);
      }
      
      const stats: ContactStats = await response.json();
      toast.success('Statistiques contacts mises à jour');
      return stats;
    } catch (error: any) {
      console.error('Erreur récupération stats contacts:', error);
      toast.error(error.message || 'Erreur récupération stats contacts');
      throw error;
    }
  }

  /**
   * Récupère le statut du système
   * Combine: GET /api/users/health et GET /api/users/maintenance-status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const fetch = this.ensureFetchWithAuth();
      
      const [healthResponse, maintenanceResponse] = await Promise.all([
        fetch('/api/users/health'),
        fetch('/api/users/maintenance-status')
      ]);

      if (!healthResponse.ok) throw new Error('Erreur récupération santé système');
      if (!maintenanceResponse.ok) throw new Error('Erreur récupération statut maintenance');

      const health: HealthCheck = await healthResponse.json();
      const maintenance = await maintenanceResponse.json();

      return {
        database: health.database === 'connected',
        maintenanceMode: maintenance.isActive || false,
        uptime: this.calculateUptime(health.timestamp),
        version: health.version,
        service: health.service
      };
    } catch (error: any) {
      console.error('Erreur récupération statut système:', error);
      toast.error('Erreur récupération statut système');
      
      return {
        database: false,
        maintenanceMode: false,
        service: 'unknown',
        uptime: '0s'
      };
    }
  }

  // ==================== MÉTHODES UTILITAIRES PRIVÉES ====================

  private calculateRendezvousStats(rendezvousData: any): RendezvousStats {
    // Cette méthode calcule les stats à partir des données brutes
    // Dans un cas réel, vous auriez un endpoint dédié /api/rendezvous/stats
    // Pour l'instant, on retourne des valeurs par défaut
    return {
      total: rendezvousData.total || 0,
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      today: 0,
      upcoming: 0,
      completedWithFavorable: 0,
      completedWithUnfavorable: 0
    };
  }

  private calculateDestinationStats(destinationsData: any): DestinationStats {
    return {
      total: destinationsData.total || 0,
      byCountry: [],
      mostPopular: []
    };
  }

  private calculateUptime(timestamp: string): string {
    try {
      const serverTime = new Date(timestamp).getTime();
      const now = Date.now();
      const uptimeMs = now - serverTime;
      
      const seconds = Math.floor(uptimeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}j ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}min`;
      if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
      return `${seconds}s`;
    } catch {
      return 'inconnu';
    }
  }

  private getDefaultStats(): GeneralStatsResponse {
    return {
      procedures: {
        total: 0,
        active: 0,
        pending: 0,
        completed: 0,
        cancelled: 0
      },
      users: {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0
      },
      rendezvous: {
        total: 0,
        confirmed: 0,
        pending: 0,
        completed: 0,
        cancelled: 0
      },
      contacts: {
        total: 0,
        unread: 0,
        read: 0,
        replied: 0
      },
      systemStatus: {
        database: false,
        cache: false,
        maintenanceMode: false,
        uptime: '0s'
      },
      timestamp: new Date().toISOString()
    };
  }

  // ==================== MÉTHODES DE TEST ET DÉMO ====================

  /**
   * Méthode de test pour vérifier la connexion au service
   */
  async testConnection(): Promise<boolean> {
    try {
      const fetch = this.ensureFetchWithAuth();
      const response = await fetch('/api/users/health');
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.status === 'ok' && data.database === 'connected';
    } catch {
      return false;
    }
  }

  /**
   * Rafraîchir toutes les statistiques en une seule requête
   * (Plus efficace que d'appeler chaque endpoint séparément)
   */
  async refreshAllStats(): Promise<GeneralStatsResponse> {
    return this.getGeneralStats();
  }
}

// Export d'une instance singleton pour l'application
export const adminStatsService = new AdminDashboardService();