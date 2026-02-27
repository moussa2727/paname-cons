import { useAuth } from '../../context/AuthContext';
import React from 'react';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalProcedures: number;
  proceduresByStatus: { _id: string; count: number }[];
  proceduresByDestination: { _id: string; count: number }[];
  totalRendezvous: number;
  rendezvousStats: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  totalContacts: number;
  unreadContacts: number;
}

export interface RecentActivity {
  _id: string;
  type: 'procedure' | 'rendezvous' | 'user' | 'contact';
  action: string;
  description: string;
  timestamp: Date;
  userEmail?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

class AdminDashboardService {
  private static instance: AdminDashboardService;
  private baseUrl: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 secondes
  private readonly MAX_CACHE_SIZE = 50;
  private activeRequests = new Map<string, Promise<any>>();

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL;

    // Validation en production
    if (!this.baseUrl) {
      throw new Error('VITE_API_URL est requis en production');
    }

    // Nettoyage de l'URL
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  static getInstance(): AdminDashboardService {
    if (!AdminDashboardService.instance) {
      AdminDashboardService.instance = new AdminDashboardService();
    }
    return AdminDashboardService.instance;
  }

  private async request(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {},
    useRequestDeduplication = true
  ) {
    if (!accessToken) {
      throw new Error('UNAUTHORIZED');
    }

    // Déduplication des requêtes identiques
    const requestKey = `${endpoint}:${JSON.stringify(options)}`;

    if (useRequestDeduplication && this.activeRequests.has(requestKey)) {
      return await this.activeRequests.get(requestKey)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            const error = new Error('UNAUTHORIZED') as ApiError;
            error.status = 401;
            throw error;
          }

          if (response.status === 403) {
            const error = new Error('FORBIDDEN') as ApiError;
            error.status = 403;
            throw error;
          }

          if (response.status === 429) {
            const error = new Error('TOO_MANY_REQUESTS') as ApiError;
            error.status = 429;
            error.message = 'Trop de requêtes, veuillez patienter';
            throw error;
          }

          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            errorData.message ||
              `Erreur ${response.status}: ${response.statusText}`
          ) as ApiError;
          error.status = response.status;
          error.code = errorData.code;
          throw error;
        }

        const data = await response.json();
        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          const timeoutError = new Error(
            'Le serveur met trop de temps à répondre'
          ) as ApiError;
          timeoutError.code = 'TIMEOUT';
          throw timeoutError;
        }

        // Ne pas loguer les erreurs en production
        if (import.meta.env.DEV) {
          console.error(`API Error ${endpoint}:`, error);
        }

        throw error;
      } finally {
        if (useRequestDeduplication) {
          this.activeRequests.delete(requestKey);
        }
      }
    })();

    if (useRequestDeduplication) {
      this.activeRequests.set(requestKey, requestPromise);
    }

    return await requestPromise;
  }

  private async requestWithCache(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {},
    useCache = true
  ) {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // Vérifier le cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    // Faire la requête
    const data = await this.request(endpoint, accessToken, options, true);

    // Mettre en cache
    if (useCache) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      // Nettoyer le cache si trop grand
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        const oldestKey = Array.from(this.cache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0]?.[0];
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
    }

    return data;
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
      totalContacts: 0,
      unreadContacts: 0,
    };
  }

  // ==================== MÉTHODES PRINCIPALES ====================

  /**
   * Récupère toutes les statistiques pour le dashboard admin
   * Utilise STRICTEMENT les endpoints définis dans les contrôleurs
   */
  async getDashboardStats(accessToken: string): Promise<DashboardStats> {
    try {
      // Récupérer TOUTES les stats en parallèle avec les endpoints officiels
      const [userStats, procedureStats, contactStats, rendezvousStats] =
        await Promise.allSettled([
          // Endpoint: GET /users/stats
          this.requestWithCache(
            '/api/users/stats',
            accessToken,
            {},
            true
          ).catch(() => null),

          // Endpoint: GET /procedures/admin/stats
          this.requestWithCache(
            '/api/procedures/admin/stats',
            accessToken,
            {},
            true
          ).catch(() => null),

          // Endpoint: GET /contact/stats
          this.requestWithCache(
            '/api/contact/stats',
            accessToken,
            {},
            true
          ).catch(() => null),

          // Endpoint: GET /rendezvous/stats/overview
          this.requestWithCache(
            '/api/rendezvous/stats/overview',
            accessToken,
            {},
            true
          ).catch(() => null),
        ]);

      // Initialiser avec les valeurs par défaut
      const stats: DashboardStats = this.getDefaultStats();

      // Traiter les statistiques utilisateurs
      if (userStats.status === 'fulfilled' && userStats.value) {
        const userData = userStats.value;
        stats.totalUsers = userData.totalUsers || 0;
        stats.activeUsers = userData.activeUsers || 0;
        stats.inactiveUsers = userData.inactiveUsers || 0;
        stats.adminUsers = userData.adminUsers || 0;
        stats.regularUsers = userData.regularUsers || 0;
      }

      // Traiter les statistiques des procédures
      if (procedureStats.status === 'fulfilled' && procedureStats.value) {
        const procData = procedureStats.value;
        stats.totalProcedures = procData.total || 0;
        stats.proceduresByStatus = procData.byStatus || [];
        stats.proceduresByDestination = procData.byDestination || [];
      }

      // Traiter les statistiques des contacts
      if (contactStats.status === 'fulfilled' && contactStats.value) {
        const contactData = contactStats.value;
        stats.totalContacts = contactData.total || 0;
        stats.unreadContacts = contactData.unread || 0;
      }

      // Traiter les statistiques des rendez-vous
      if (rendezvousStats.status === 'fulfilled' && rendezvousStats.value) {
        const rdvData = rendezvousStats.value;
        stats.totalRendezvous = rdvData.total || 0;

        // Si le backend retourne un tableau byStatus, le convertir en objet
        if (rdvData.byStatus && Array.isArray(rdvData.byStatus)) {
          const statusMap: Record<string, number> = {};
          rdvData.byStatus.forEach((item: { _id: string; count: number }) => {
            statusMap[item._id] = item.count;
          });

          stats.rendezvousStats = {
            pending: statusMap['En attente'] || 0,
            confirmed: statusMap['Confirmé'] || 0,
            completed: statusMap['Terminé'] || 0,
            cancelled: statusMap['Annulé'] || 0,
          };
        } else if (rdvData.stats) {
          // Ou si le backend retourne directement un objet stats
          stats.rendezvousStats = {
            pending: rdvData.stats.pending || 0,
            confirmed: rdvData.stats.confirmed || 0,
            completed: rdvData.stats.completed || 0,
            cancelled: rdvData.stats.cancelled || 0,
          };
        }
      }

      return stats;
    } catch (error: any) {
      // En production, ne pas exposer les détails d'erreur
      if (import.meta.env.DEV) {
        console.error('Erreur récupération stats dashboard:', error);
      }

      // Retourner des valeurs par défaut en cas d'erreur
      return this.getDefaultStats();
    }
  }

  /**
   * Récupère les activités récentes
   */
  async getRecentActivities(
    accessToken: string,
    limit = 5
  ): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Récupérer les activités en parallèle
      const [proceduresResponse, rendezvousResponse, contactsResponse] =
        await Promise.allSettled([
          this.requestWithCache(
            `/api/procedures/admin/all?page=1&limit=${limit}`,
            accessToken,
            {},
            false
          ),
          this.requestWithCache(
            `/api/rendezvous?page=1&limit=${limit}`,
            accessToken,
            {},
            false
          ),
          this.requestWithCache(
            `/api/contact?page=1&limit=${limit}`,
            accessToken,
            {},
            false
          ),
        ]);

      // Procédures récentes
      if (
        proceduresResponse.status === 'fulfilled' &&
        proceduresResponse.value
      ) {
        const procedures = proceduresResponse.value.data || [];
        procedures.forEach((procedure: any) => {
          const maskedEmail = this.maskEmail(procedure.email);
          activities.push({
            _id: procedure._id,
            type: 'procedure',
            action: procedure.statut,
            description: `Procédure ${procedure.statut}`,
            timestamp: new Date(procedure.createdAt || procedure.updatedAt),
            userEmail: maskedEmail,
          });
        });
      }

      // Rendez-vous récents
      if (
        rendezvousResponse.status === 'fulfilled' &&
        rendezvousResponse.value
      ) {
        const rendezvous = rendezvousResponse.value.data || [];
        rendezvous.forEach((rdv: any) => {
          const maskedEmail = this.maskEmail(rdv.email);
          activities.push({
            _id: rdv._id,
            type: 'rendezvous',
            action: rdv.status,
            description: `Rendez-vous ${rdv.status}`,
            timestamp: new Date(rdv.createdAt || rdv.updatedAt),
            userEmail: maskedEmail,
          });
        });
      }

      // Contacts récents
      if (contactsResponse.status === 'fulfilled' && contactsResponse.value) {
        const contacts = contactsResponse.value.data || [];
        contacts.forEach((contact: any) => {
          const maskedEmail = this.maskEmail(contact.email);
          activities.push({
            _id: contact._id,
            type: 'contact',
            action: contact.isRead ? 'lu' : 'non lu',
            description: `Message reçu`,
            timestamp: new Date(contact.createdAt),
            userEmail: maskedEmail,
          });
        });
      }

      // Trier par date décroissante et limiter
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur récupération activités récentes:', error);
      }
      return [];
    }
  }

  /**
   * Récupère les statistiques détaillées des procédures
   */
  async getDetailedProcedureStats(accessToken: string): Promise<any> {
    try {
      return await this.requestWithCache(
        '/api/procedures/admin/stats',
        accessToken,
        {},
        true
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur récupération stats procédures:', error);
      }
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        byStatus: [],
        byDestination: [],
      };
    }
  }

  /**
   * Récupère les messages de contact non lus
   */
  async getUnreadContacts(accessToken: string): Promise<any[]> {
    try {
      const response = await this.requestWithCache(
        '/api/contact?isRead=false&limit=5',
        accessToken,
        {},
        true
      );
      return response.data || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur récupération contacts non lus:', error);
      }
      return [];
    }
  }

  /**
   * Récupère les statistiques détaillées des rendez-vous
   */
  async getDetailedRendezvousStats(accessToken: string): Promise<any> {
    try {
      return await this.requestWithCache(
        '/api/rendezvous/stats/overview',
        accessToken,
        {},
        true
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur récupération stats rendez-vous:', error);
      }
      return {
        total: 0,
        byStatus: [],
        upcoming: 0,
        byDate: [],
      };
    }
  }

  /**
 * Récupère le statut du mode maintenance
 */
async getMaintenanceStatus(
  fetchWithAuth: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>
): Promise<any> {
  try {
    // Utiliser le bon endpoint
    return await fetchWithAuth('/api/users/maintenance-status');
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Erreur récupération statut maintenance:', error);
    }
    return null;
  }
}

/**
 * Active/désactive le mode maintenance
 */
async toggleMaintenanceMode(
  enabled: boolean,
  fetchWithAuth: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>
): Promise<any> {
  try {
    // Utiliser le bon endpoint
    const result = await fetchWithAuth('/api/users/maintenance-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }), // Note: { enabled } et non { isActive }
    });

    // FORCER LE RAFRAÎCHISSEMENT IMMÉDIAT APRÈS LE TOGGLE
    await new Promise(resolve => setTimeout(resolve, 300));

    return result;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Erreur changement mode maintenance:', error);
    }
    throw error;
  }
}

  

  /**
   * Masque les emails dans les logs
   */
  private maskEmail(email: string): string {
    if (!email) return '***';
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';

    const maskedName =
      name.length > 2
        ? name.substring(0, 2) + '*'.repeat(Math.max(name.length - 2, 1))
        : '*'.repeat(name.length);

    return `${maskedName}@${domain}`;
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    if (import.meta.env.DEV) {
      console.log(`Cache vidé - ${cacheSize} entrées supprimées`);
    }
  }

  /**
   * Annuler toutes les requêtes en cours
   */
  cancelAllRequests(): void {
    const requestCount = this.activeRequests.size;
    this.activeRequests.clear();
    if (import.meta.env.DEV) {
      console.log(`${requestCount} requêtes annulées`);
    }
  }

  /**
   * Obtenir des informations sur l'état du service
   */
  getServiceStatus(): {
    cacheSize: number;
    activeRequests: number;
    baseUrl: string;
    endpoints: string[];
  } {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests.size,
      baseUrl: this.baseUrl,
      endpoints: [
        '/api/users/stats',
        '/api/procedures/admin/stats',
        '/api/contact/stats',
        '/api/rendezvous/stats/overview',
        '/api/procedures/admin/all',
        '/api/rendezvous',
        '/api/contact',
      ],
    };
  }
}

// Instance unique du service
export const adminDashboardService = AdminDashboardService.getInstance();

// ==================== HOOK REACT AMÉLIORÉ ====================
export const useAdminDashboard = () => {
  const {
    access_token,
    refreshToken,
    isAuthenticated,
    user,
    isLoading,
    fetchWithAuth,
    checkMaintenanceStatus,
    toggleMaintenanceMode: contextToggleMaintenanceMode,
    maintenanceStatus,
  } = useAuth();

  // Wrapper pour gérer le rafraîchissement automatique du token
  const secureRequest = async <T>(
    fn: (token: string) => Promise<T>
  ): Promise<T> => {
    if (!access_token) {
      throw new Error('UNAUTHORIZED');
    }

    try {
      return await fn(access_token);
    } catch (error: any) {
      // Si le token a expiré, essayer de le rafraîchir
      if (error.message === 'UNAUTHORIZED' && refreshToken) {
        const refreshed = await refreshToken();
        if (refreshed && access_token) {
          // Réessayer avec le nouveau token
          return await fn(access_token);
        }
      }
      throw error;
    }
  };

  return {
    // Méthodes principales avec gestion automatique du refresh token
    getDashboardStats: () =>
      secureRequest(token => adminDashboardService.getDashboardStats(token)),

    getRecentActivities: (limit?: number) =>
      secureRequest(token =>
        adminDashboardService.getRecentActivities(token, limit)
      ),

    getDetailedProcedureStats: () =>
      secureRequest(token =>
        adminDashboardService.getDetailedProcedureStats(token)
      ),

    getDetailedRendezvousStats: () =>
      secureRequest(token =>
        adminDashboardService.getDetailedRendezvousStats(token)
      ),

    getUnreadContacts: () =>
      secureRequest(token => adminDashboardService.getUnreadContacts(token)),

    // Méthodes de maintenance (utilisent fetchWithAuth directement)
    getMaintenanceStatus: () =>
      adminDashboardService.getMaintenanceStatus(fetchWithAuth),

    toggleMaintenanceMode: (enabled: boolean) =>
      adminDashboardService.toggleMaintenanceMode(enabled, fetchWithAuth),

    // Méthodes du contexte
    checkMaintenanceStatusFromContext: checkMaintenanceStatus,
    toggleMaintenanceModeFromContext: contextToggleMaintenanceMode,
    maintenanceStatus,

    // Méthodes utilitaires
    clearCache: () => adminDashboardService.clearCache(),
    cancelRequests: () => adminDashboardService.cancelAllRequests(),
    getServiceStatus: () => adminDashboardService.getServiceStatus(),

    // Informations du contexte
    isAuthenticated,
    user,
    isLoading,
  };
};

// Hook pour les données du dashboard
export const useDashboardData = () => {
  const { getDashboardStats, getRecentActivities, isAuthenticated } =
    useAdminDashboard();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [activities, setActivities] = React.useState<RecentActivity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const lastFetchRef = React.useRef<number>(0);
  const isFetchingRef = React.useRef<boolean>(false);
  const fetchCountRef = React.useRef<number>(0);
  const maxFetches = 3; // Limite de tentatives
  const minInterval = 30000; // 30 secondes minimum entre les requêtes

  const fetchDashboardData = React.useCallback(async () => {
    // Éviter les appels multiples
    if (
      isFetchingRef.current ||
      !isAuthenticated ||
      fetchCountRef.current >= maxFetches
    ) {
      return;
    }

    // Limiter la fréquence des requêtes
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    if (timeSinceLastFetch < minInterval) {
      return;
    }

    isFetchingRef.current = true;
    fetchCountRef.current++;
    lastFetchRef.current = now;

    try {
      setLoading(true);
      setError(null);

      const [statsData, activitiesData] = await Promise.allSettled([
        getDashboardStats(),
        getRecentActivities(10),
      ]);

      // Traiter les résultats
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        setError('Erreur lors du chargement des statistiques');
      }

      if (activitiesData.status === 'fulfilled') {
        setActivities(activitiesData.value);
      }

      fetchCountRef.current = 0; // Réinitialiser en cas de succès
    } catch (err: any) {
      // Messages d'erreur génériques en production
      if (
        err.message?.includes('429') ||
        err.message?.includes('TOO_MANY_REQUESTS')
      ) {
        setError('Trop de requêtes, veuillez patienter');
        lastFetchRef.current = now + 60000; // Attendre 1 minute supplémentaire
      } else if (err.message === 'UNAUTHORIZED') {
        setError('Session expirée');
      } else {
        setError('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [
    getDashboardStats,
    getRecentActivities,
    isAuthenticated,
    maxFetches,
    minInterval,
  ]);

  React.useEffect(() => {
    let isMounted = true;

    if (isAuthenticated) {
      // Attendre un peu avant la première requête
      const timer = setTimeout(() => {
        if (isMounted) {
          fetchDashboardData();
        }
      }, 1000);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      setStats(null);
      setActivities([]);
      setLoading(false);
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [fetchDashboardData, isAuthenticated]);

  // Rafraîchissement automatique contrôlé
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 300000); // Rafraîchir toutes les 5 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, fetchDashboardData]);

  const refresh = React.useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const forceRefresh = React.useCallback(() => {
    fetchCountRef.current = 0;
    lastFetchRef.current = 0;
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    activities,
    loading,
    error,
    refresh,
    forceRefresh,
    lastFetchTime: lastFetchRef.current,
    fetchCount: fetchCountRef.current,
  };
};

// Hook simplifié pour les statistiques rapides
export const useQuickStats = () => {
  const { getDashboardStats, isAuthenticated } = useAdminDashboard();
  const [quickStats, setQuickStats] = React.useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProcedures: 0,
    totalRendezvous: 0,
    unreadContacts: 0,
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const loadQuickStats = async () => {
      setLoading(true);
      try {
        const stats = await getDashboardStats();
        setQuickStats({
          totalUsers: stats.totalUsers,
          activeUsers: stats.activeUsers,
          totalProcedures: stats.totalProcedures,
          totalRendezvous: stats.totalRendezvous,
          unreadContacts: stats.unreadContacts,
        });
      } catch (error) {
        // Ne pas loguer en production
        if (import.meta.env.DEV) {
          console.error('Erreur chargement quick stats:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadQuickStats();
  }, [isAuthenticated, getDashboardStats]);

  return { quickStats, loading };
};