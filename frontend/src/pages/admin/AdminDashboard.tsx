import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Mail,
  Globe,
  RefreshCw,
  AlertTriangle,
  Shield,
  BarChart3,
  TrendingUp,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { 
  useDashboardData, 
  adminDashboardService,
  useQuickStats 
} from '../../api/admin/AdminDashboardService'; // Import ajouté
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

// Types (déjà définis dans votre service, donc inutile de les redéfinir ici)

// Composant d'icône pour les activités
const ActivityIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'procedure':
      return <FileText className='w-5 h-5 text-blue-500' />;
    case 'rendezvous':
      return <Calendar className='w-5 h-5 text-emerald-500' />;
    case 'user':
      return <Users className='w-5 h-5 text-violet-500' />;
    case 'contact':
      return <Mail className='w-5 h-5 text-amber-500' />;
    default:
      return <Clock className='w-5 h-5 text-slate-400' />;
  }
};

const AdminDashboard = () => {
  const { user, isAuthenticated, fetchWithAuth } = useAuth();
  const { stats, activities, error, refresh, lastRefresh } = useDashboardData();
  const { quickStats, loading: quickStatsLoading } = useQuickStats(); // Hook ajouté pour les stats rapides

  // États locaux
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Références
  const isMountedRef = useRef(true);

  // Initialisation améliorée
  useEffect(() => {
    isMountedRef.current = true;

    const initializeDashboard = async () => {
      if (!isMountedRef.current) return;

      // Vérification des permissions
      if (!isAuthenticated) {
        toast.error('Veuillez vous connecter pour accéder au tableau de bord');
        return;
      }

      if (user?.role !== 'admin') {
        toast.error('Accès refusé. Réservé aux administrateurs.');
        return;
      }

      // Chargement initial des données
      try {
        await refresh();
        startAutoRefresh(); // Démarrer le rafraîchissement automatique
      } catch (err) {
        // Gestion d'erreur silencieuse pour l'initialisation
        if (import.meta.env.DEV) {
          console.error('Erreur lors du chargement initial:', err);
        }
      }
    };

    const initTimer = window.setTimeout(() => {
      initializeDashboard();
    }, 500);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(initTimer);
      stopAutoRefresh(); // Arrêter le rafraîchissement automatique
    };
  }, [isAuthenticated, user?.role, refresh]);

  // Fonction pour le rafraîchissement automatique (toutes les 5 minutes)
  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // S'assurer qu'aucun intervalle n'est déjà en cours
    
    const interval = setInterval(async () => {
      if (!isMountedRef.current || !isAuthenticated || user?.role !== 'admin') return;
      
      try {
        // Rafraîchir silencieusement sans toast
        await refresh();
        console.log('🔄 Rafraîchissement automatique du dashboard');
      } catch (err) {
        // Ignorer les erreurs silencieuses pour le rafraîchissement automatique
        if (import.meta.env.DEV) {
          console.warn('⚠️ Erreur lors du rafraîchissement automatique:', err);
        }
      }
    }, 300000); // 5 minutes

    setAutoRefreshInterval(interval);
  }, [isAuthenticated, user?.role, refresh]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      setAutoRefreshInterval(null);
    }
  }, [autoRefreshInterval]);

  // Gestion du rafraîchissement manuel amélioré
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Utiliser la méthode de rafraîchissement du service
      await refresh();

      toast.success('Données actualisées avec succès', {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (err: any) {
      // Gestion d'erreur silencieuse pour le rafraîchissement
      if (import.meta.env.DEV) {
        console.error('Erreur lors du rafraîchissement:', err);
      }
      // Les erreurs sont gérées par le service
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refresh]);

  // Fonction utilitaire pour les données
  const safeFind = (array: any[] | undefined, value: string): number => {
    if (!array || !Array.isArray(array)) return 0;
    const item = array.find(item => item._id === value);
    return item ? item.count : 0;
  };

  // Vérification des permissions
  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center max-w-md p-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4'>
            <AlertTriangle className='w-8 h-8 text-red-600' />
          </div>
          <div className='text-gray-900 text-xl font-semibold mb-2'>
            Accès restreint
          </div>
          <div className='text-gray-600 mb-6'>
            Cette interface est réservée aux administrateurs du système.
          </div>
          <div className='text-xs text-gray-500 bg-gray-100 rounded-lg p-3'>
            <Shield className='w-3 h-3 inline mr-1' />
            Sécurité renforcée • Audit des accès
          </div>
        </div>
      </div>
    );
  }

  // Gestion des erreurs améliorée
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center max-w-md p-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4'>
            <AlertTriangle className='w-8 h-8 text-red-600' />
          </div>
          <div className='text-gray-900 text-xl font-semibold mb-2'>
            Erreur de chargement
          </div>
          <div className='text-gray-600 mb-6'>{error}</div>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className='bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2'
            >
              <RefreshCw
                size={18}
                className={isRefreshing ? 'animate-spin' : ''}
              />
              {isRefreshing ? 'Rechargement...' : 'Réessayer'}
            </button>
            <button
              onClick={() => {
                // Vider le cache et réessayer
                adminDashboardService.clearCache();
                handleRefresh();
              }}
              className='bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2'
            >
              <AlertTriangle size={18} />
              Vider le cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formatage de l'heure du dernier rafraîchissement
  const lastRefreshTime = lastRefresh 
    ? new Date(lastRefresh).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Configuration des cartes de statistiques - utilisation des stats rapides si disponibles
  const statCards = [
    {
      title: 'Utilisateurs',
      value: quickStats.totalUsers > 0 ? quickStats.totalUsers : (stats?.totalUsers || 0),
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: `${quickStats.activeUsers > 0 ? quickStats.activeUsers : (stats?.activeUsers || 0)} actifs`,
      trend: (quickStats.activeUsers > 0 ? quickStats.activeUsers : (stats?.activeUsers || 0)) > 0 ? 'positive' : 'neutral',
      detail: `${stats?.inactiveUsers || 0} inactifs`,
      loading: quickStatsLoading && quickStats.totalUsers === 0,
    },
    {
      title: 'Rendez-vous',
      value: quickStats.totalRendezvous > 0 ? quickStats.totalRendezvous : (stats?.totalRendezvous || 0),
      icon: Calendar,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      description: `${stats?.rendezvousStats?.confirmed || 0} confirmés`,
      trend: 'neutral',
      detail: `${stats?.rendezvousStats?.pending || 0} en attente`,
      loading: quickStatsLoading && quickStats.totalRendezvous === 0,
    },
    {
      title: 'Procédures',
      value: quickStats.totalProcedures > 0 ? quickStats.totalProcedures : (stats?.totalProcedures || 0),
      icon: FileText,
      color: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      description: 'En cours et terminées',
      trend: 'neutral',
      detail: `${stats?.proceduresByStatus?.length || 0} statuts`,
      loading: quickStatsLoading && quickStats.totalProcedures === 0,
    },
    {
      title: 'Administrateurs',
      value: stats?.adminUsers || 0,
      icon: Shield,
      color: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      description: 'Accès sécurisé',
      trend: 'neutral',
      detail: `${stats?.regularUsers || 0} utilisateurs réguliers`,
      isAdmin: true,
      loading: false,
    },
    {
      title: 'Messages',
      value: stats?.totalContacts || 0,
      icon: MessageSquare,
      color: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      description: `${stats?.unreadContacts || 0} non lus`,
      trend: (stats?.unreadContacts || 0) > 0 ? 'attention' : 'positive',
      detail: 'Dernières 24h',
      loading: false,
    },
    {
      title: 'Système',
      value: 'ACTIF',
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Normal',
      trend: 'positive',
      isSystem: true,
      loading: false,
    },
  ];

  // Statistiques des procédures
  const procedureStatusStats = [
    {
      status: 'En cours',
      value:
        safeFind(stats?.proceduresByStatus, 'En cours') ||
        safeFind(stats?.proceduresByStatus, 'en cours'),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    {
      status: 'Terminées',
      value:
        safeFind(stats?.proceduresByStatus, 'Terminée') ||
        safeFind(stats?.proceduresByStatus, 'terminée'),
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      status: 'Refusées',
      value:
        safeFind(stats?.proceduresByStatus, 'Refusée') ||
        safeFind(stats?.proceduresByStatus, 'refusée'),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      status: 'En attente',
      value:
        safeFind(stats?.proceduresByStatus, 'En attente') ||
        safeFind(stats?.proceduresByStatus, 'en attente'),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ];

  // Destinations populaires
  const popularDestinations = (stats?.proceduresByDestination || [])
    .slice(0, 5)
    .map(dest => ({
      name: dest._id,
      count: dest.count,
      percentage:
        (stats?.totalProcedures || 0) > 0
          ? Math.round((dest.count / (stats?.totalProcedures || 1)) * 100)
          : 0,
    }));

  return (
    <>
      <Helmet>
        <title>Tableau de Bord Administrateur - Paname Consulting</title>
        <meta
          name='description'
          content='Interface sécurisée de gestion administrative avec statistiques et contrôles systèmes'
        />
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
        <meta name='yandexbot' content='noindex, nofollow' />
        <meta name='duckduckbot' content='noindex, nofollow' />
        <meta name='baidu' content='noindex, nofollow' />
        <meta name='naver' content='noindex, nofollow' />
        <meta name='seznam' content='noindex, nofollow' />
      </Helmet>

      {/* Interface principale */}
      <div className='min-h-screen'>
        <div className='p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto'>
          {/* En-tête amélioré */}
          <div className='bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
              <div className='space-y-3'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md'>
                    <Shield className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>
                      Tableau de Bord Administrateur
                    </h1>
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium'>
                        <Shield size={12} />
                        <span>Session sécurisée</span>
                      </div>
                      <div className='h-1 w-1 bg-gray-300 rounded-full'></div>
                      <div className='text-xs text-gray-500'>
                        ID: {user?.id?.substring(0, 8)}...
                      </div>
                      <div className='h-1 w-1 bg-gray-300 rounded-full'></div>
                      <div className='text-xs text-gray-500'>
                        Mode: Admin
                      </div>
                    </div>
                  </div>
                </div>

                <div className='space-y-1'>
                  <p className='text-gray-700'>
                    Bonjour{' '}
                    <span className='font-semibold text-gray-900'>
                      {user?.firstName}
                    </span>
                    <span className='text-gray-500 mx-1'>•</span>
                    <span className='text-gray-600'>Rôle: Administrateur</span>
                  </p>
                  {lastRefreshTime && (
                    <div className='flex items-center gap-2 text-sm text-gray-500'>
                      <Clock size={14} />
                      <span>Dernière mise à jour: {lastRefreshTime}</span>
                      {autoRefreshInterval && (
                        <span className='text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full'>
                          Auto-rafraîchi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className='flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm hover:shadow-md'
                >
                  <RefreshCw
                    size={18}
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                  <span className='font-medium'>
                    {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    adminDashboardService.clearCache();
                    toast.info('Cache vidé avec succès', { autoClose: 1500 });
                    handleRefresh();
                  }}
                  className='flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all shadow-sm hover:shadow-md'
                  title='Vider le cache'
                >
                  <AlertTriangle size={16} />
                  <span className='font-medium text-sm'>Vider Cache</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cartes de statistiques - avec indicateurs de chargement */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4'>
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all duration-200 group border-gray-200 hover:border-gray-300 relative ${card.loading ? 'opacity-70' : ''}`}
                >
                  {card.loading && (
                    <div className='absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-2xl'>
                      <RefreshCw size={20} className='text-blue-500 animate-spin' />
                    </div>
                  )}
                  
                  <div className='flex items-start justify-between mb-3'>
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    {card.trend === 'positive' && (
                      <div className='flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full'>
                        <TrendingUp size={12} />
                        <span className='ml-1'>+</span>
                      </div>
                    )}
                    {card.trend === 'warning' && (
                      <div className='flex items-center text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full'>
                        <AlertTriangle size={12} />
                      </div>
                    )}
                    {card.trend === 'attention' && (
                      <div className='flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse'>
                        <AlertTriangle size={12} />
                      </div>
                    )}
                  </div>

                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-600 truncate'>
                      {card.title}
                    </p>
                    <div
                      className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}
                    >
                      {typeof card.value === 'string'
                        ? card.value
                        : card.value.toLocaleString('fr-FR')}
                    </div>
                    <p className='text-xs text-gray-500 truncate'>
                      {card.description}
                    </p>
                    {card.detail && (
                      <p className='text-xs text-gray-400'>{card.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deuxième ligne : Statistiques détaillées */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Procédures */}
            <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-2'>
                  <div className='p-2 bg-blue-50 rounded-lg'>
                    <FileText className='w-5 h-5 text-blue-600' />
                  </div>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Statut des Procédures
                  </h2>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-500'>
                    Total:{' '}
                    {(stats?.totalProcedures || 0).toLocaleString('fr-FR')}
                  </span>
                  <BarChart3 size={16} className='text-gray-400' />
                </div>
              </div>
              <div className='space-y-3'>
                {procedureStatusStats.map((stat, index) => {
                  const Icon = stat.icon;
                  const percentage =
                    (stats?.totalProcedures || 0) > 0
                      ? Math.round(
                          (stat.value / (stats?.totalProcedures || 1)) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-xl border ${stat.borderColor} ${stat.bgColor}`}
                    >
                      <div className='flex items-center space-x-3'>
                        <div className='p-1.5 rounded-lg bg-white shadow-sm'>
                          <Icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div>
                          <span className='text-sm font-medium text-gray-800'>
                            {stat.status}
                          </span>
                          <div className='h-1 w-16 bg-gray-200 rounded-full overflow-hidden mt-1'>
                            <div
                              className={`h-full ${stat.color.replace('text-', 'bg-')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center space-x-4'>
                        <span className='text-sm text-gray-500'>
                          {percentage}%
                        </span>
                        <span className='text-lg font-bold text-gray-900 min-w-[60px] text-right'>
                          {stat.value.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rendez-vous */}
            <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-2'>
                  <div className='p-2 bg-emerald-50 rounded-lg'>
                    <Calendar className='w-5 h-5 text-emerald-600' />
                  </div>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Rendez-vous
                  </h2>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-500'>
                    Total:{' '}
                    {(stats?.totalRendezvous || 0).toLocaleString('fr-FR')}
                  </span>
                  <UserCheck size={16} className='text-gray-400' />
                </div>
              </div>
              <div className='space-y-3'>
                {[
                  {
                    status: 'En attente',
                    value: stats?.rendezvousStats?.pending || 0,
                    color: 'yellow',
                  },
                  {
                    status: 'Confirmés',
                    value: stats?.rendezvousStats?.confirmed || 0,
                    color: 'blue',
                  },
                  {
                    status: 'Terminés',
                    value: stats?.rendezvousStats?.completed || 0,
                    color: 'emerald',
                  },
                  {
                    status: 'Annulés',
                    value: stats?.rendezvousStats?.cancelled || 0,
                    color: 'red',
                  },
                ].map((stat, index) => {
                  const percentage =
                    (stats?.totalRendezvous || 0) > 0
                      ? Math.round(
                          (stat.value / (stats?.totalRendezvous || 1)) * 100
                        )
                      : 0;

                  return (
                    <div key={index} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium text-gray-700'>
                          {stat.status}
                        </span>
                        <div className='flex items-center space-x-3'>
                          <span className='text-sm text-gray-500'>
                            {percentage}%
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              stat.color === 'yellow'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : stat.color === 'blue'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : stat.color === 'emerald'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {stat.value.toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                        <div
                          className={`h-full rounded-full ${
                            stat.color === 'yellow'
                              ? 'bg-yellow-500'
                              : stat.color === 'blue'
                                ? 'bg-blue-500'
                                : stat.color === 'emerald'
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Troisième ligne */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Destinations */}
            <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-2'>
                  <div className='p-2 bg-violet-50 rounded-lg'>
                    <Globe className='w-5 h-5 text-violet-600' />
                  </div>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Destinations populaires
                  </h2>
                </div>
                <span className='text-sm text-gray-500'>
                  Top 5 • Procédures
                </span>
              </div>
              <div className='space-y-4'>
                {popularDestinations.length > 0 ? (
                  popularDestinations.map((destination, index) => (
                    <div key={index} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='w-2 h-2 bg-violet-500 rounded-full'></div>
                          <span className='text-sm font-medium text-gray-800 truncate'>
                            {destination.name}
                          </span>
                        </div>
                        <div className='flex items-center gap-3'>
                          <span className='text-sm text-gray-500'>
                            {destination.percentage}%
                          </span>
                          <span className='text-sm font-semibold text-gray-900'>
                            {destination.count.toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full'
                          style={{ width: `${destination.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Globe className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-500'>
                      Aucune donnée de destination
                    </p>
                    <p className='text-sm text-gray-400 mt-1'>
                      Les procédures apparaîtront ici
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activités */}
            <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-2'>
                  <div className='p-2 bg-amber-50 rounded-lg'>
                    <Clock className='w-5 h-5 text-amber-600' />
                  </div>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Activités récentes
                  </h2>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-500'>
                    {activities.length} activité
                    {activities.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className='space-y-4 max-h-[300px] overflow-y-auto pr-2'>
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <div
                      key={index}
                      className='flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 group'
                    >
                      <div className='flex-shrink-0 mt-0.5'>
                        <div className='p-1.5 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors'>
                          <ActivityIcon type={activity.type} />
                        </div>
                      </div>
                      <div className='flex-1 min-w-0 space-y-1'>
                        <p className='text-sm font-medium text-gray-900 line-clamp-2'>
                          {activity.description}
                        </p>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>
                              {activity.type}
                            </div>
                            <span className='text-xs text-gray-500'>
                              {activity.userEmail
                                ? `${activity.userEmail.substring(0, 3)}...@...`
                                : 'Système'}
                            </span>
                          </div>
                          <span className='text-xs text-gray-500 flex-shrink-0'>
                            {new Date(activity.timestamp).toLocaleDateString(
                              'fr-FR',
                              {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Clock className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-500'>Aucune activité récente</p>
                    <p className='text-sm text-gray-400 mt-1'>
                      Les actions apparaîtront ici
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pied de page sécurisé amélioré */}
          <div className='pt-6 border-t border-gray-200'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-gray-500'>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <Shield size={14} className='text-gray-400' />
                  <span>Session sécurisée • Chiffrement TLS</span>
                </div>
                <div className='h-4 w-px bg-gray-300'></div>
                <div className='flex items-center gap-2'>
                  <Clock size={14} className='text-gray-400' />
                  <span>
                    Dernière activité: {lastRefreshTime || 'maintenant'}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse'></div>
                  <span>Système opérationnel</span>
                </div>
                <div className='h-4 w-px bg-gray-300'></div>
                <button
                  onClick={() => {
                    toast.info('Fonctionnalité de logs à venir', { autoClose: 1500 });
                  }}
                  className='text-blue-600 hover:text-blue-800 text-sm font-medium'
                >
                  Voir les logs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;