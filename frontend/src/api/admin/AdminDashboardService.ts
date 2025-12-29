/* eslint-disable no-undef */
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
    expired: number;
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

    // 🔧 Déduplication des requêtes identiques
    const requestKey = `${endpoint}:${JSON.stringify(options)}`;

    if (useRequestDeduplication && this.activeRequests.has(requestKey)) {
      console.log(` Utilisation de la requête en cours pour ${endpoint}`);
      return await this.activeRequests.get(requestKey)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `${this.baseUrl}/api${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const finalHeaders = { ...headers };

    if (options.headers) {
      Object.entries(options.headers as Record<string, string>).forEach(
        ([key, value]) => {
          if (
            key.toLowerCase() !== 'content-type' ||
            value !== 'multipart/form-data'
          ) {
            finalHeaders[key] = value;
          }
        }
      );
    }

    const requestPromise = (async () => {
      try {
        console.log(` Envoi requête ${endpoint}`);

        const response = await fetch(url, {
          ...options,
          headers: finalHeaders,
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
        console.log(` Réponse reçue de ${endpoint}`);
        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          console.error(` Timeout sur l'endpoint ${endpoint}`);
          const timeoutError = new Error(
            'Le serveur met trop de temps à répondre'
          ) as ApiError;
          timeoutError.code = 'TIMEOUT';
          throw timeoutError;
        }

        console.error(` API Error ${endpoint}:`, error);
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
        console.log(` Utilisation du cache pour ${endpoint}`);
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
          console.log(` Cache nettoyé - clé supprimée: ${oldestKey}`);
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
        expired: 0,
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
      console.log(' Récupération des statistiques du dashboard');

      // Récupérer TOUTES les stats en parallèle avec les endpoints officiels
       const [userStats, procedureStats, contactStats, rendezvousStats] =
      await Promise.allSettled([
        // ✅ Endpoint: GET /users/stats 
        this.requestWithCache('/users/stats', accessToken, {}, true).catch(
          () => null
        ),
        
        // ✅ Endpoint: GET /procedures/admin/stats 
        this.requestWithCache(
          '/procedures/admin/stats',
          accessToken,
          {},
          true
        ).catch(() => null),
        
        // ✅ Endpoint: GET /contact/stats 
        this.requestWithCache('/contact/stats', accessToken, {}, true).catch(
          () => null
        ),
        
        // ✅ CORRIGÉ: Utiliser '/rendezvous/stats/overview' au lieu de '/rendezvous/stats'
        this.requestWithCache('/rendezvous/stats/overview', accessToken, {}, true).catch(
          () => null
        ),
      ])

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
        
        // Format attendu depuis le backend
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
            expired: statusMap['Expiré'] || 0,
          };
        } else if (rdvData.stats) {
          // Ou si le backend retourne directement un objet stats
          stats.rendezvousStats = {
            pending: rdvData.stats.pending || 0,
            confirmed: rdvData.stats.confirmed || 0,
            completed: rdvData.stats.completed || 0,
            cancelled: rdvData.stats.cancelled || 0,
            expired: rdvData.stats.expired || 0,
          };
        }
      }

      console.log(' Statistiques récupérées avec succès');
      return stats;
    } catch (error: any) {
      console.error(' Erreur récupération stats dashboard:', error);

      // Retourner des valeurs par défaut en cas d'erreur
      return this.getDefaultStats();
    }
  }

  /**
   * Récupère les activités récentes
   * Utilise STRICTEMENT les endpoints définis dans les contrôleurs
   */
  async getRecentActivities(
    accessToken: string,
    limit = 5
  ): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Récupérer les activités en parallèle avec les endpoints officiels
      const [proceduresResponse, rendezvousResponse, contactsResponse] =
        await Promise.allSettled([
          //  Endpoint: GET /procedures/admin/all?page=1&limit={limit} (procedure.controller.ts ligne 46)
          this.requestWithCache(
            `/procedures/admin/all?page=1&limit=${limit}`,
            accessToken,
            {},
            false
          ),
          
          //  Endpoint: GET /rendezvous?page=1&limit={limit} (rendez-vous.controller.ts ligne 138)
          this.requestWithCache(
            `/rendezvous?page=1&limit=${limit}`,
            accessToken,
            {},
            false
          ),
          
          //  Endpoint: GET /contact?page=1&limit={limit} (contact.controller.ts ligne 27)
          this.requestWithCache(
            `/contact?page=1&limit=${limit}`,
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
          activities.push({
            _id: procedure._id,
            type: 'procedure',
            action: procedure.statut,
            description: `Procédure ${procedure.statut} pour ${procedure.prenom} ${procedure.nom}`,
            timestamp: new Date(procedure.createdAt || procedure.updatedAt),
            userEmail: procedure.email,
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
          activities.push({
            _id: rdv._id,
            type: 'rendezvous',
            action: rdv.status,
            description: `Rendez-vous ${rdv.status} pour ${rdv.firstName} ${rdv.lastName}`,
            timestamp: new Date(rdv.createdAt || rdv.updatedAt),
            userEmail: rdv.email,
          });
        });
      }

      // Contacts récents
      if (contactsResponse.status === 'fulfilled' && contactsResponse.value) {
        const contacts = contactsResponse.value.data || [];
        contacts.forEach((contact: any) => {
          activities.push({
            _id: contact._id,
            type: 'contact',
            action: contact.isRead ? 'lu' : 'non lu',
            description: `Message de ${contact.email}: ${contact.message?.substring(0, 50)}...`,
            timestamp: new Date(contact.createdAt),
            userEmail: contact.email,
          });
        });
      }

      // Trier par date décroissante et limiter
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error(' Erreur récupération activités récentes:', error);
      return [];
    }
  }

  /**
   * Récupère les statistiques détaillées des procédures
   *  Endpoint: GET /procedures/admin/stats (procedure.controller.ts ligne 78)
   */
  async getDetailedProcedureStats(accessToken: string): Promise<any> {
    try {
      return await this.requestWithCache(
        '/procedures/admin/stats',
        accessToken,
        {},
        true
      );
    } catch (error) {
      console.error(' Erreur récupération stats procédures:', error);
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
   *  Endpoint: GET /contact?isRead=false&limit=5 (contact.controller.ts ligne 27)
   */
  async getUnreadContacts(accessToken: string): Promise<any[]> {
    try {
      const response = await this.requestWithCache(
        '/contact?isRead=false&limit=5',
        accessToken,
        {},
        true
      );
      return response.data || [];
    } catch (error) {
      console.error(' Erreur récupération contacts non lus:', error);
      return [];
    }
  }

  /**
   * Récupère les statistiques détaillées des rendez-vous
   *  NOUVEL Endpoint: GET /rendezvous/stats (ajouté dans le backend)
   */
  async getDetailedRendezvousStats(accessToken: string): Promise<any> {
    try {
      return await this.requestWithCache(
        '/rendezvous/stats',
        accessToken,
        {},
        true
      );
    } catch (error) {
      console.error(' Erreur récupération stats rendez-vous:', error);
      return {
        total: 0,
        byStatus: [],
        upcoming: 0,
        byDate: [],
      };
    }
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(` Cache vidé - ${cacheSize} entrées supprimées`);
  }

  /**
   * Annuler toutes les requêtes en cours
   */
  cancelAllRequests(): void {
    const requestCount = this.activeRequests.size;
    this.activeRequests.clear();
    console.log(` ${requestCount} requêtes annulées`);
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
        '/users/stats',
        '/procedures/admin/stats',
        '/contact/stats',
        '/rendezvous/stats',
        '/procedures/admin/all',
        '/rendezvous',
        '/contact'
      ],
    };
  }
}

// Instance unique du service
export const adminDashboardService = AdminDashboardService.getInstance();

// Hook React pour utiliser le service
export const useAdminDashboard = () => {
  const { access_token, refreshToken, isAuthenticated, user, isLoading } =
    useAuth();

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
        console.log(' Tentative de rafraîchissement du token...');
        const refreshed = await refreshToken();
        if (refreshed && access_token) {
          // Réessayer avec le nouveau token
          console.log(' Token rafraîchi, nouvelle tentative...');
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
  const maxFetches = 3; //  Limite de tentatives
  const minInterval = 30000; //  30 secondes minimum entre les requêtes

  const fetchDashboardData = React.useCallback(async () => {
    // Éviter les appels multiples
    if (
      isFetchingRef.current ||
      !isAuthenticated ||
      fetchCountRef.current >= maxFetches
    ) {
      console.log(' Appel ignoré - en cours ou limite atteinte');
      return;
    }

    // Limiter la fréquence des requêtes
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    if (timeSinceLastFetch < minInterval) {
      console.log(
        ` Trop tôt pour une nouvelle requête (${Math.round(timeSinceLastFetch / 1000)}s)`
      );
      return;
    }

    isFetchingRef.current = true;
    fetchCountRef.current++;
    lastFetchRef.current = now;

    try {
      console.log(' Chargement des données du dashboard...');
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
        console.error(' Erreur stats:', statsData.reason);
        setError('Erreur lors du chargement des statistiques');
      }

      if (activitiesData.status === 'fulfilled') {
        setActivities(activitiesData.value);
      } else {
        console.error(' Erreur activités:', activitiesData.reason);
      }

      fetchCountRef.current = 0; // Réinitialiser en cas de succès
      console.log(' Données du dashboard chargées');
    } catch (err: any) {
      console.error('❌ Erreur chargement dashboard:', err);
      setError(err.message || 'Erreur lors du chargement des données');

      // Si c'est une erreur 429 (trop de requêtes), attendre plus longtemps
      if (
        err.message?.includes('429') ||
        err.message?.includes('TOO_MANY_REQUESTS')
      ) {
        console.warn(' Trop de requêtes, attente augmentée');
        lastFetchRef.current = now + 60000; // Attendre 1 minute supplémentaire
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
    if (isAuthenticated) {
      console.log(
        ' Utilisateur authentifié, préparation chargement dashboard'
      );

      // Attendre un peu avant la première requête
      const timer = setTimeout(() => {
        fetchDashboardData();
      }, 1000);

      return () => {
        clearTimeout(timer);
        console.log('🧹 Nettoyage timer chargement dashboard');
      };
    } else {
      console.log(
        '👤 Utilisateur non authentifié, pas de chargement dashboard'
      );
      setStats(null);
      setActivities([]);
      setLoading(false);
      setError(null);
    }
  }, [fetchDashboardData, isAuthenticated]);

  // Ajouter un intervalle de rafraîchissement contrôlé
  React.useEffect(() => {
    if (!isAuthenticated) {
      console.log(
        ' Arrêt rafraîchissement automatique - utilisateur non authentifié'
      );
      return;
    }

    console.log(' Démarrage rafraîchissement automatique (5 minutes)');
    const refreshInterval = setInterval(() => {
      console.log(' Rafraîchissement automatique des données');
      fetchDashboardData();
    }, 300000); //  Rafraîchir toutes les 5 minutes

    return () => {
      console.log(' Nettoyage intervalle rafraîchissement');
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, fetchDashboardData]);

  const refresh = React.useCallback(() => {
    console.log(' Rafraîchissement manuel demandé');
    fetchDashboardData();
  }, [fetchDashboardData]);

  const forceRefresh = React.useCallback(() => {
    console.log(' Force refresh demandé');
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
        console.error(' Erreur chargement quick stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuickStats();
  }, [isAuthenticated, getDashboardStats]);

  return { quickStats, loading };
};