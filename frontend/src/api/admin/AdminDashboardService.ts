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

class AdminDashboardService {
  private static instance: AdminDashboardService;
  private baseUrl: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 120000; // 2 minutes

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
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

  // ==================== MÉTHODES PRINCIPALES ====================
  async getDashboardStats(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): Promise<DashboardStats> {
    try {
      console.log('📊 Récupération des statistiques du dashboard');

      // Vérifier le cache d'abord
      const cacheKey = 'dashboard_stats';
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('📦 Utilisation du cache pour les stats dashboard');
        return cached.data;
      }

      const stats = this.getDefaultStats();

      // Récupérer uniquement les stats utilisateurs (requête principale)
      const response = await fetchWithAuth('/users/stats');
      const userStats = await response.json();
      
      if (userStats) {
        stats.totalUsers = userStats.totalUsers || 0;
        stats.activeUsers = userStats.activeUsers || 0;
        stats.inactiveUsers = userStats.inactiveUsers || 0;
        stats.adminUsers = userStats.adminUsers || 0;
        stats.regularUsers = userStats.regularUsers || 0;
      }

      // Mettre en cache
      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });

      console.log('✅ Statistiques récupérées avec succès');
      return stats;
    } catch (error: any) {
      console.error('❌ Erreur récupération stats dashboard:', error.message);
      throw error;
    }
  }

  async getRecentActivities(
    fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>,
    limit = 5
  ): Promise<RecentActivity[]> {
    try {
      console.log(`📋 Récupération des ${limit} activités récentes`);

      // Cache pour les activités
      const cacheKey = `recent_activities_${limit}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('📦 Utilisation du cache pour les activités');
        return cached.data;
      }

      // Récupérer uniquement les rendez-vous (source principale)
      const response = await fetchWithAuth(`/rendezvous?page=1&limit=${limit}`);
      const rendezvousResponse = await response.json();

      const activities: RecentActivity[] = [];

      // Traiter les rendez-vous
      if (rendezvousResponse && rendezvousResponse.data) {
        const rendezvous = rendezvousResponse.data || [];
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

      // Trier par date décroissante et limiter
      const sortedActivities = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      // Mettre en cache
      this.cache.set(cacheKey, { data: sortedActivities, timestamp: Date.now() });

      return sortedActivities;
    } catch (error) {
      console.error('❌ Erreur récupération activités récentes:', error);
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
        throw error;
      }
      return [];
    }
  }

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

      // Récupérer les données en parallèle
      const [stats, activities] = await Promise.all([
        this.getDashboardStats(fetchWithAuth),
        this.getRecentActivities(fetchWithAuth, 5),
      ]);

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
      throw error;
    }
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache vidé - ${cacheSize} entrées supprimées`);
  }
}

// Instance unique du service
export const adminDashboardService = AdminDashboardService.getInstance();

// Hook React pour utiliser le service
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
      
      setError('Impossible de charger les données du dashboard. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAuthenticated, user?.role]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      // Petit délai pour s'assurer que le contexte auth est prêt
      const timer = setTimeout(() => {
        fetchData();
      }, 500);
      
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

// Hook ultra-simplifié pour les statistiques rapides
export const useQuickStats = () => {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [quickStats, setQuickStats] = React.useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProcedures: 0,
    totalRendezvous: 0,
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !fetchWithAuth) {
      return;
    }

    const loadQuickStats = async () => {
      setLoading(true);
      try {
        const stats = await adminDashboardService.getDashboardStats(fetchWithAuth);
        setQuickStats({
          totalUsers: stats.totalUsers,
          activeUsers: stats.activeUsers,
          totalProcedures: stats.totalProcedures,
          totalRendezvous: stats.totalRendezvous,
        });
      } catch (error) {
        console.error('❌ Erreur chargement quick stats:', error);
        // Ne rien faire, AuthContext gérera les erreurs d'authentification
      } finally {
        setLoading(false);
      }
    };

    // Attendre 1 seconde avant de charger
    const timer = setTimeout(() => {
      loadQuickStats();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, fetchWithAuth]);

  return { quickStats, loading };
};