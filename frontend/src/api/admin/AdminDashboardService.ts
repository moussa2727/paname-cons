/* eslint-disable no-undef */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

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
  totalContacts?: number;
  unreadContacts?: number;
}

export interface RecentActivity {
  _id: string;
  type: 'procedure' | 'rendezvous' | 'user' | 'contact';
  action: string;
  description: string;
  timestamp: Date;
  userEmail?: string;
}

export interface RendezvousData {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  niveauEtude: string;
  filiere: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
}

export interface ProcedureStatsResponse {
  totalProcedures: number;
  proceduresByStatus: { _id: string; count: number }[];
  proceduresByDestination: { _id: string; count: number }[];
}

class AdminDashboardService {
  private static instance: AdminDashboardService;
  private baseUrl: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 120000; // 2 minutes
  
  // Propriétés pour le rate-limiting
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: number = 0;
  private readonly REQUEST_DELAY = 200; // 200ms entre les requêtes
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL;
    console.log(`📡 AdminDashboardService initialisé avec URL: ${this.baseUrl}`);
  }

  static getInstance(): AdminDashboardService {
    if (!AdminDashboardService.instance) {
      AdminDashboardService.instance = new AdminDashboardService();
    }
    return AdminDashboardService.instance;
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

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Méthode de rate-limiting et de file d'attente
   */
  private async rateLimitedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Vérifier si une requête est déjà en cours
    if (this.requestQueue.has(key)) {
      console.log(`⏳ Requête ${key} déjà en cours, réutilisation...`);
      return this.requestQueue.get(key)!;
    }

    // Respecter un délai minimum entre les requêtes
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const delay = this.REQUEST_DELAY - timeSinceLastRequest;
      console.log(`⏳ Délai rate-limiting: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    
    // Exécuter la requête
    const promise = fetchFn();
    this.requestQueue.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  /**
   * Méthode de retry automatique pour les erreurs 429
   */
  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    maxRetries = this.MAX_RETRIES,
    baseDelay = this.RETRY_DELAY
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(1.5, attempt - 1); // Augmentation progressive
          console.log(`🔄 Tentative ${attempt + 1}/${maxRetries + 1} dans ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await fetchFn();
      } catch (error: any) {
        lastError = error;
        
        // Si c'est une erreur 429 et qu'on a encore des tentatives
        if ((error.message === 'TOO_MANY_REQUESTS' || error.message.includes('429')) && attempt < maxRetries) {
          console.warn(`⚠️ Rate limit détecté, nouvelle tentative...`);
          continue;
        }
        
        // Si c'est une erreur d'authentification, on propage
        if (error.message === 'SESSION_EXPIRED' || error.message === 'UNAUTHORIZED') {
          throw error;
        }
        
        // Pour les autres erreurs, on arrête après la première tentative
        break;
      }
    }
    
    throw lastError!;
  }

  // ==================== MÉTHODES DE STATISTIQUES ====================

  /**
   * Récupère les statistiques utilisateurs depuis /users/stats
   */
  async getUserStats(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): Promise<UserStatsResponse> {
    return this.rateLimitedFetch('user_stats', async () => {
      try {
        console.log('📊 Récupération des statistiques utilisateurs');
        
        const cacheKey = 'user_stats';
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log('📦 Utilisation du cache pour les stats utilisateurs');
          return cached.data;
        }

        return await this.fetchWithRetry(async () => {
          const response = await fetchWithAuth('/api/users/stats');
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('TOO_MANY_REQUESTS');
            }
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          const stats = await response.json();
          
          this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
          
          console.log('✅ Statistiques utilisateurs récupérées');
          return stats;
        });
      } catch (error: any) {
        console.error('❌ Erreur récupération stats utilisateurs:', error.message);
        // Retourner des valeurs par défaut au lieu de propager l'erreur
        return {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          regularUsers: 0,
        };
      }
    });
  }

  /**
   * Récupère les statistiques procédures depuis /procedures/admin/stats
   */
  async getProcedureStats(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): Promise<ProcedureStatsResponse> {
    return this.rateLimitedFetch('procedure_stats', async () => {
      try {
        console.log('📊 Récupération statistiques procédures');
        
        const cacheKey = 'procedure_stats';
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log('📦 Utilisation du cache pour les stats procédures');
          return cached.data;
        }

        return await this.fetchWithRetry(async () => {
          const response = await fetchWithAuth('/api/procedures/admin/stats');
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('TOO_MANY_REQUESTS');
            }
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          const stats = await response.json();
          
          this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
          
          console.log('✅ Statistiques procédures récupérées');
          return stats;
        });
      } catch (error: any) {
        console.error('❌ Erreur récupération stats procédures:', error.message);
        // Retourner des valeurs par défaut
        return {
          totalProcedures: 0,
          proceduresByStatus: [],
          proceduresByDestination: [],
        };
      }
    });
  }

  /**
   * Récupère les rendez-vous avec pagination et calcul les statistiques
   */
  async getRendezvousStats(
    fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>,
    page: number = 1,
    limit: number = 1000
  ): Promise<{
    totalRendezvous: number;
    stats: {
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
    };
  }> {
    return this.rateLimitedFetch('rendezvous_stats', async () => {
      try {
        console.log(`📅 Récupération statistiques rendez-vous`);
        
        return await this.fetchWithRetry(async () => {
          // Construire l'URL avec les paramètres
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('limit', limit.toString());
          
          const url = `/api/rendezvous?${params.toString()}`;
          const response = await fetchWithAuth(url);
          
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('TOO_MANY_REQUESTS');
            }
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Calculer les stats par statut
          const statusCounts = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
          };
          
          if (data.data && Array.isArray(data.data)) {
            data.data.forEach((rdv: RendezvousData) => {
              const status = rdv.status?.toLowerCase();
              if (status === 'en attente') statusCounts.pending++;
              else if (status === 'confirmé') statusCounts.confirmed++;
              else if (status === 'terminé') statusCounts.completed++;
              else if (status === 'annulé') statusCounts.cancelled++;
            });
          }
          
          const result = {
            totalRendezvous: data.total || 0,
            stats: statusCounts
          };
          
          console.log(`✅ Statistiques rendez-vous récupérées (total: ${data.total})`);
          return result;
        });
      } catch (error: any) {
        console.error('❌ Erreur récupération stats rendez-vous:', error.message);
        // Retourner des valeurs par défaut
        return {
          totalRendezvous: 0,
          stats: {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
          }
        };
      }
    });
  }

  /**
   * Récupère TOUTES les statistiques du dashboard en une seule méthode
   */
 async getDashboardStats(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): Promise<DashboardStats> {
  try {
    console.log('📊 Récupération complète des statistiques du dashboard');

    // Vérifier le cache d'abord
    const cacheKey = 'dashboard_stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Utilisation du cache pour les stats dashboard');
      return cached.data;
    }

    const stats = this.getDefaultStats();

    // MODIFICATION : Chargement séquentiel au lieu de parallèle
    try {
      const userStats = await this.getUserStats(fetchWithAuth);
      Object.assign(stats, userStats);
    } catch (userError) {
      console.warn('⚠️ Erreur stats utilisateurs, utilisation valeurs par défaut');
    }

    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const procedureStats = await this.getProcedureStats(fetchWithAuth);
      stats.totalProcedures = procedureStats.totalProcedures || 0;
      stats.proceduresByStatus = procedureStats.proceduresByStatus || [];
      stats.proceduresByDestination = procedureStats.proceduresByDestination || [];
    } catch (procError) {
      console.warn('⚠️ Erreur stats procédures, utilisation valeurs par défaut');
    }

    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const rendezvousStats = await this.getRendezvousStats(fetchWithAuth, 1, 1000);
      stats.totalRendezvous = rendezvousStats.totalRendezvous || 0;
      stats.rendezvousStats = rendezvousStats.stats;
    } catch (rdvError) {
      console.warn('⚠️ Erreur stats rendez-vous, utilisation valeurs par défaut');
    }

    // Mettre en cache
    this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });

    console.log('✅ Statistiques dashboard récupérées avec succès');
    return stats;
  } catch (error: any) {
    console.error('❌ Erreur récupération stats dashboard:', error.message);
    return this.getDefaultStats();
  }
}

  /**
   * Récupère les statistiques rapides (utilise le cache existant si possible)
   */
  async getQuickStats(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalProcedures: number;
    totalRendezvous: number;
  }> {
    try {
      console.log('⚡ Récupération des quick stats');
      
      // Si on a déjà les stats complètes en cache, les utiliser
      const dashboardCached = this.cache.get('dashboard_stats');
      if (dashboardCached && Date.now() - dashboardCached.timestamp < this.CACHE_TTL) {
        console.log('📦 Utilisation des stats dashboard pour quick stats');
        return {
          totalUsers: dashboardCached.data.totalUsers || 0,
          activeUsers: dashboardCached.data.activeUsers || 0,
          totalProcedures: dashboardCached.data.totalProcedures || 0,
          totalRendezvous: dashboardCached.data.totalRendezvous || 0,
        };
      }
      
      // Sinon, retourner des valeurs par défaut (ne pas faire de nouvelle requête)
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalProcedures: 0,
        totalRendezvous: 0,
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération quick stats:', error.message);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalProcedures: 0,
        totalRendezvous: 0,
      };
    }
  }

  /**
   * Récupère les activités récentes (pour le dashboard)
   */
  async getRecentActivities(
    fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>,
    limit = 5
  ): Promise<RecentActivity[]> {
    return this.rateLimitedFetch(`activities_${limit}`, async () => {
      try {
        console.log(`📋 Récupération des ${limit} activités récentes`);

        // Cache pour les activités
        const cacheKey = `recent_activities_${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log('📦 Utilisation du cache pour les activités');
          return cached.data;
        }

        return await this.fetchWithRetry(async () => {
          // Récupérer les rendez-vous récents (source principale)
          const params = new URLSearchParams();
          params.append('page', '1');
          params.append('limit', limit.toString());
          
          const response = await fetchWithAuth(`/api/rendezvous?${params.toString()}`);
          
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('TOO_MANY_REQUESTS');
            }
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }
          
          const rendezvousResponse = await response.json();

          const activities: RecentActivity[] = [];

          // Traiter les rendez-vous
          if (rendezvousResponse && rendezvousResponse.data) {
            const rendezvous = rendezvousResponse.data || [];
            rendezvous.forEach((rdv: RendezvousData) => {
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

          // Trier par date décroissante et limiter
          const sortedActivities = activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);

          // Mettre en cache
          this.cache.set(cacheKey, { data: sortedActivities, timestamp: Date.now() });

          return sortedActivities;
        });
      } catch (error: any) {
        console.error('❌ Erreur récupération activités récentes:', error.message);
        if (error.message === 'SESSION_EXPIRED' || error.message === 'UNAUTHORIZED') {
          throw error;
        }
        return []; // Retourner un tableau vide en cas d'erreur
      }
    });
  }

  /**
   * Récupère toutes les données du dashboard (stats + activités)
   */
 async getAllDashboardData(
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>
): Promise<{
  stats: DashboardStats;
  activities: RecentActivity[];
}> {
  try {
    console.log('🚀 Récupération de toutes les données du dashboard');

    const cacheKey = 'all_dashboard_data';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Utilisation du cache complet');
      return cached.data;
    }

    // MODIFICATION : Récupérer les données SÉQUENTIELLEMENT
    // Au lieu de Promise.all, on fait les appels un par un
    const stats = await this.getDashboardStats(fetchWithAuth);
    
    // Petite pause pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const activities = await this.getRecentActivities(fetchWithAuth, 5);

    const result = {
      stats,
      activities,
    };

    // Mettre en cache
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log('✅ Toutes les données récupérées');
    return result;
  } catch (error: any) {
    console.error('❌ Erreur récupération données complètes:', error.message);
    return {
      stats: this.getDefaultStats(),
      activities: [],
    };
  }
}

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.requestQueue.clear();
    console.log(`🧹 Cache vidé - ${cacheSize} entrées supprimées`);
  }
}

// Instance unique du service
export const adminDashboardService = AdminDashboardService.getInstance();

// ==================== HOOKS REACT ====================

/**
 * Hook principal pour les données du dashboard
 */
export const useDashboardData = () => {
  const { fetchWithAuth, isAuthenticated, user } = useAuth();
  const [data, setData] = useState<{
    stats: DashboardStats | null;
    activities: RecentActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    // Vérifier que l'utilisateur est admin et authentifié
    if (!isAuthenticated || user?.role !== 'admin') {
      console.log('🔒 Utilisateur non admin ou non authentifié');
      setLoading(false);
      return;
    }

    if (!fetchWithAuth) {
      console.error('❌ fetchWithAuth non disponible');
      setError('Service d\'authentification non disponible');
      setLoading(false);
      return;
    }

    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    try {
      console.log('🔄 Chargement données dashboard...');
      const dashboardData = await adminDashboardService.getAllDashboardData(fetchWithAuth);
      
      setData(dashboardData);
      setLastRefresh(new Date());
      setError(null);
      console.log('✅ Données chargées avec succès');
    } catch (err: any) {
      console.error('❌ Erreur chargement dashboard:', err.message);
      
      // Les erreurs d'authentification sont gérées par AuthContext
      if (err.message === 'SESSION_EXPIRED' || err.message === 'UNAUTHORIZED') {
        return; // AuthContext va rediriger
      }
      
      // Pour les erreurs de rate limiting, on affiche un message spécifique
      if (err.message === 'TOO_MANY_REQUESTS') {
        setError('Serveur temporairement surchargé. Veuillez réessayer dans quelques instants.');
      } else {
        setError('Impossible de charger les données du dashboard. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAuthenticated, user?.role]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      // Délai pour s'assurer que le contexte auth est prêt et éviter les conflits
      const timer = setTimeout(() => {
        fetchData();
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [fetchData, isAuthenticated, user?.role]);

  const refresh = useCallback(async () => {
    console.log('🔄 Rafraîchissement manuel');
    adminDashboardService.clearCache();
    await fetchData(true);
  }, [fetchData]);

  return {
    stats: data?.stats || null,
    activities: data?.activities || [],
    loading,
    error,
    refresh,
    lastRefresh,
    isAdmin: user?.role === 'admin',
  };
};

/**
 * Hook simplifié pour les statistiques rapides (utilise le cache)
 */
export const useQuickStats = () => {
  const { fetchWithAuth, isAuthenticated, user } = useAuth();
  const [quickStats, setQuickStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProcedures: 0,
    totalRendezvous: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !fetchWithAuth || user?.role !== 'admin') {
      return;
    }

    const loadQuickStats = async () => {
      setLoading(true);
      try {
        // Utiliser la méthode optimisée qui réutilise le cache
        const stats = await adminDashboardService.getQuickStats(fetchWithAuth);
        setQuickStats(stats);
      } catch (error) {
        console.error('❌ Erreur chargement quick stats:', error);
        // Ne rien faire - les erreurs sont silencieuses pour quick stats
      } finally {
        setLoading(false);
      }
    };

    // Attendre que le dashboard principal ait chargé
    const timer = setTimeout(() => {
      loadQuickStats();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, fetchWithAuth, user?.role]);

  return { quickStats, loading };
};