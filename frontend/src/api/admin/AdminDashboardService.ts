// services/AdminDashboardService.ts - VERSION CORRIGÉE
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  totalProcedures: number;
  activeProcedures: number;
  pendingProcedures: number;
  completedProcedures: number;
  cancelledProcedures: number;
  totalUsers: number;
  activeUsers: number;
  pendingRendezvous: number;
  unreadMessages: number;
  recentActivities: Array<{
    id: string;
    type: 'procedure' | 'user' | 'rendezvous' | 'message';
    action: string;
    timestamp: string;
    userEmail?: string;
    details?: string;
  }>;
}

export class AdminDashboardService {
  [x: string]: any;
  private fetchWithAuth: ReturnType<typeof useAuth>['fetchWithAuth'];
  private API_URL = import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
  
  // Système de throttling
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 seconde entre les batchs

  constructor(fetchWithAuth: ReturnType<typeof useAuth>['fetchWithAuth']) {
    this.fetchWithAuth = fetchWithAuth;
  }

  // ==================== GESTION DES REQUÊTES ====================

  /**
   * Méthode sécurisée pour éviter les requêtes simultanées excessives
   */
  private async throttledFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Vérifier si une requête identique est déjà en cours
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }

    // Respecter un intervalle minimal entre les batchs de requêtes
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    try {
      const promise = fetchFn();
      this.requestQueue.set(key, promise);
      this.lastRequestTime = Date.now();
      
      const result = await promise;
      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  /**
   * Récupérer UNIQUEMENT les stats essentielles en parallèle
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log('🔍 Récupération optimisée des statistiques dashboard...');
      
      // Récupérer UNIQUEMENT 2 stats en parallèle max
      const [proceduresStats, usersStats] = await Promise.all([
        this.throttledFetch('procedures_stats', () => this.getProceduresStats()),
        this.throttledFetch('users_stats', () => this.getUsersStats())
      ]);

      // Récupérer les autres stats séquentiellement pour réduire la charge
      const contactStats = await this.throttledFetch('contact_stats', () => this.getContactStats());
      
      // Pour rendezvous, utiliser l'endpoint spécifique si disponible, sinon calculer localement
      const rendezvousStats = await this.getOptimizedRendezvousStats();

      console.log('✅ Statistiques récupérées de manière optimisée');

      return {
        totalProcedures: proceduresStats.total || 0,
        activeProcedures: proceduresStats.active || 0,
        pendingProcedures: proceduresStats.pending || 0,
        completedProcedures: proceduresStats.completed || 0,
        cancelledProcedures: proceduresStats.cancelled || 0,
        totalUsers: usersStats.totalUsers || 0,
        activeUsers: usersStats.activeUsers || 0,
        pendingRendezvous: rendezvousStats.pending || 0,
        unreadMessages: contactStats.unread || 0,
        recentActivities: await this.getOptimizedRecentActivities()
      };
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw new Error(`Impossible de charger les statistiques: ${(error as Error).message}`);
    }
  }

  /**
   * Version optimisée des stats rendezvous
   */
  private async getOptimizedRendezvousStats() {
    try {
      // UNE seule requête avec des filtres côté serveur
      const response = await this.throttledFetch('rendezvous_stats_all', () =>
        this.fetchWithAuth(`${this.API_URL}/api/rendezvous?limit=1&includeStats=true`)
      );
      
      if (!response.ok) {
        // Fallback: compter seulement les pending
        const pendingResponse = await this.fetchWithAuth(
          `${this.API_URL}/api/rendezvous?status=En attente&limit=1`
        );
        
        if (pendingResponse.ok) {
          const data = await pendingResponse.json();
          return {
            total: 0, // Non disponible sans endpoint spécifique
            pending: data.total || 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
          };
        }
        throw new Error('Erreur API rendez-vous');
      }
      
      const data = await response.json();
      
      // Si le backend renvoie des stats détaillées
      if (data.stats) {
        return data.stats;
      }
      
      return {
        total: data.total || 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      };
    } catch (error) {
      console.error('❌ Erreur stats rendez-vous:', error);
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      };
    }
  }

  /**
   * Version optimisée des activités récentes
   */
  private async getOptimizedRecentActivities() {
    try {
      // UNE seule requête combinée si possible, sinon séquentielle
      const activities: { id: any; type: "procedure" | "message"; action: string; timestamp: any; userEmail: any; details: any; }[] = [];
      
      // Option 1: Endpoint combiné si disponible
      try {
        const response = await this.throttledFetch('recent_activities', () =>
          this.fetchWithAuth(`${this.API_URL}/api/admin/recent-activities?limit=10`)
        );
        
        if (response.ok) {
          const data = await response.json();
          return data.activities || [];
        }
      } catch {
        // Fallback à l'ancienne méthode mais avec throttling
      }
      
      // Option 2: Méthode actuelle avec améliorations
      const [proceduresRes, contactRes] = await Promise.all([
        this.throttledFetch('recent_procedures', () =>
          this.fetchWithAuth(`${this.API_URL}/api/procedures/admin/all?limit=5&sort=-createdAt`)
        ),
        this.throttledFetch('recent_contacts', () =>
          this.fetchWithAuth(`${this.API_URL}/api/contact?limit=3&isRead=false&sort=-createdAt`)
        )
      ]);
      
      if (proceduresRes.ok) {
        const procedures = await proceduresRes.json();
        if (procedures.data) {
          procedures.data.slice(0, 5).forEach((proc: any) => {
            activities.push({
              id: proc._id,
              type: 'procedure' as const,
              action: proc.status === 'pending' ? 'Nouvelle procédure créée' : 'Procédure mise à jour',
              timestamp: proc.updatedAt || proc.createdAt,
              userEmail: proc.userEmail || proc.user?.email,
              details: `Procédure ${proc.type || 'sans type'} - ${proc.status || 'sans statut'}`
            });
          });
        }
      }
      
      if (contactRes.ok) {
        const contacts = await contactRes.json();
        if (contacts.data) {
          contacts.data.slice(0, 3).forEach((contact: any) => {
            activities.push({
              id: contact._id,
              type: 'message' as const,
              action: 'Nouveau message de contact',
              timestamp: contact.createdAt,
              userEmail: contact.email,
              details: contact.subject || 'Sans sujet'
            });
          });
        }
      }
      
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8); // Réduit de 10 à 8
    } catch (error) {
      console.error('❌ Erreur activités récentes:', error);
      return [];
    }
  }

  /**
   * Autres méthodes restent similaires mais avec throttling
   */
  async getProceduresStats() {
    return this.throttledFetch('detailed_procedures_stats', async () => {
      try {
        const response = await this.fetchWithAuth(`${this.API_URL}/api/procedures/admin/stats`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('❌ Erreur stats procédures:', error);
        return { total: 0, active: 0, pending: 0, completed: 0, cancelled: 0 };
      }
    });
  }

  async getUsersStats() {
    return this.throttledFetch('detailed_users_stats', async () => {
      try {
        const response = await this.fetchWithAuth(`${this.API_URL}/api/users/stats`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('❌ Erreur stats utilisateurs:', error);
        return { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };
      }
    });
  }

  async getContactStats() {
    return this.throttledFetch('detailed_contact_stats', async () => {
      try {
        const response = await this.fetchWithAuth(`${this.API_URL}/api/contact/stats`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('❌ Erreur stats contact:', error);
        return { total: 0, read: 0, unread: 0 };
      }
    });
  }

  // ==================== CACHE AMÉLIORÉ ====================

  /**
   * Cache avec expiration et prévention des requêtes simultanées
   */
  async refreshStats(forceRefresh: boolean = false): Promise<DashboardStats> {
    const cacheKey = 'admin_dashboard_stats_v2';
    const cacheTime = 2 * 60 * 1000; // 2 minutes (réduit de 5)
    
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp, version = '1' } = JSON.parse(cached);
          
          // Version du cache - invalider si ancienne version
          if (version !== '2') {
            localStorage.removeItem(cacheKey);
          } else if (Date.now() - timestamp < cacheTime) {
            console.log('📦 Utilisation du cache valide');
            return data;
          }
        }
      }
      
      console.log('🔄 Rafraîchissement des statistiques avec throttling...');
      const stats = await this.getDashboardStats();
      
      // Mettre en cache avec version
      localStorage.setItem(cacheKey, JSON.stringify({
        data: stats,
        timestamp: Date.now(),
        version: '2'
      }));
      
      return stats;
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
      
      // Fallback au cache même expiré
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data } = JSON.parse(cached);
        console.log('⚠️ Utilisation du cache expiré en fallback');
        return data;
      }
      
      // Données minimales en dernier recours
      return {
        totalProcedures: 0,
        activeProcedures: 0,
        pendingProcedures: 0,
        completedProcedures: 0,
        cancelledProcedures: 0,
        totalUsers: 0,
        activeUsers: 0,
        pendingRendezvous: 0,
        unreadMessages: 0,
        recentActivities: []
      };
    }
  }

  // ==================== RECOMMANDATIONS BACKEND ====================

  /**
   * Suggestions pour optimiser le backend
   */
  static getBackendOptimizations() {
    return {
      recommendations: [
        "Créer un endpoint /api/admin/dashboard-stats combinant toutes les stats",
        "Ajouter un endpoint /api/rendezvous/stats pour les statistiques détaillées",
        "Implémenter un endpoint /api/admin/recent-activities combiné",
        "Ajouter des en-têtes Cache-Control appropriés",
        "Considérer l'implémentation de GraphQL pour les requêtes combinées"
      ],
      currentIssues: [
        "Trop de requêtes parallèles au dashboard",
        "Requêtes redondantes pour les rendez-vous",
        "Pas de cache côté serveur pour les stats",
        "Pas de pagination pour les activités récentes"
      ]
    };
  }
}

// Hook personnalisé avec protection supplémentaire
export const useAdminDashboard = () => {
  const { fetchWithAuth, isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  // Vérifier l'authentification et le rôle admin
  const isAdmin = isAuthenticated && user?.role === 'admin';
  
  if (!isAdmin && !authLoading) {
    throw new Error('Accès non autorisé - Administrateur requis');
  }
  
  const service = new AdminDashboardService(fetchWithAuth);
  
  // Limiter la fréquence des rafraîchissements
  let lastRefresh = 0;
  const MIN_REFRESH_INTERVAL = 30000; // 30 secondes
  
  const safeRefreshStats = async (force: boolean = false) => {
    const now = Date.now();
    
    if (!force && (now - lastRefresh < MIN_REFRESH_INTERVAL)) {
      console.log('⏳ Trop tôt pour rafraîchir, utilisation du cache');
      return service.refreshStats(false);
    }
    
    lastRefresh = now;
    return service.refreshStats(force);
  };
  
  return {
    service,
    refreshStats: safeRefreshStats,
    getDashboardStats: service.getDashboardStats.bind(service),
    user,
    isAuthenticated: isAdmin,
    isLoading: authLoading,
    optimizations: AdminDashboardService.getBackendOptimizations()
  };
};