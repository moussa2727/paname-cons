import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Clock,
  Mail,
  TrendingUp,
  BookOpen,
  Globe
} from 'lucide-react';
import { dashboardApi, DashboardStats, RecentActivity } from '../../api/admin/AdminDashboardService';
import { Helmet } from 'react-helmet-async';
interface DashboardData {
  stats: DashboardStats | null;
  recentActivities: RecentActivity[];
  loading: boolean;
  error: string | null;
}

const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    recentActivities: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const [stats, activities] = await Promise.all([
        dashboardApi.getDashboardStats(),
        dashboardApi.getRecentActivities(5)
      ]);

      setData({
        stats,
        recentActivities: activities,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erreur chargement dashboard:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur lors du chargement des données'
      }));
    }
  };

  const { stats, recentActivities, loading, error } = data;

  // Fonction sécurisée pour trouver les valeurs dans les tableaux
  const safeFind = (array: any[] | undefined, key: string, value: string) => {
    if (!array || !Array.isArray(array)) return 0;
    const item = array.find(item => item._id === value);
    return item ? item.count : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Erreur</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">Aucune donnée disponible</div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      description: `${stats.activeUsers || 0} actifs`
    },
    {
      title: 'Rendez-vous',
      value: stats.totalRendezvous || 0,
      icon: Calendar,
      color: 'bg-green-500',
      description: `${stats.rendezvousStats?.confirmed || 0} confirmés`
    },
    {
      title: 'Procédures',
      value: stats.totalProcedures || 0,
      icon: FileText,
      color: 'bg-purple-500',
      description: 'En cours et terminées'
    },
    {
      title: 'Administrateur',
      value: stats.adminUsers || 0,
      icon: Users,
      color: 'bg-orange-500',
      description: `${stats.regularUsers || 0} utilisateurs réguliers`
    }
  ];

  const procedureStats = [
    {
      status: 'En cours',
      value: safeFind(stats.proceduresByStatus, '_id', 'En cours'),
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      status: 'Terminées',
      value: safeFind(stats.proceduresByStatus, '_id', 'Terminée'),
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      status: 'Refusées',
      value: safeFind(stats.proceduresByStatus, '_id', 'Refusée'),
      icon: Mail,
      color: 'text-red-600'
    }
  ];

  const rendezvousStats = [
    {
      status: 'En attente',
      value: stats.rendezvousStats?.pending || 0,
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      status: 'Confirmés',
      value: stats.rendezvousStats?.confirmed || 0,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      status: 'Terminés',
      value: stats.rendezvousStats?.completed || 0,
      color: 'bg-green-100 text-green-800'
    },
    {
      status: 'Annulés',
      value: stats.rendezvousStats?.cancelled || 0,
      color: 'bg-red-100 text-red-800'
    }
  ];

  return (

    <>

      <Helmet>
          <title>Tableau de Bord d'administration- Paname Consulting</title>
          <meta
            name="description"
            content="Tableau de bord administrateur de Paname Consulting avec statistiques clés et activités récentes."
          />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <meta name="yandexbot" content="noindex, nofollow" />
        <meta name="duckduckbot" content="noindex, nofollow" />
        <meta name="baidu" content="noindex, nofollow" />
        <meta name="naver" content="noindex, nofollow" />
        <meta name="seznam" content="noindex, nofollow" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Administrateur</h1>
          <div className="flex items-center space-x-2 text-blue-600">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Vue d'ensemble</span>
          </div>
        </div>

        {/* Cartes de statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.color} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistiques des procédures */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Statut des Procédures</h2>
            </div>
            <div className="space-y-4">
              {procedureStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="text-sm font-medium text-gray-700">{stat.status}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {stat.value.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistiques des rendez-vous */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Rendez-vous par Statut</h2>
            </div>
            <div className="space-y-3">
              {rendezvousStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{stat.status}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${stat.color}`}>
                    {stat.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Destinations populaires */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Destinations Populaires</h2>
          </div>
          <div className="space-y-3">
            {(stats.proceduresByDestination || []).slice(0, 5).map((destination, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{destination._id}</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {destination.count} procédures
                </span>
              </div>
            ))}
            {(!stats.proceduresByDestination || stats.proceduresByDestination.length === 0) && (
              <div className="text-center text-gray-500 py-4">
                Aucune donnée de destination disponible
              </div>
            )}
          </div>
        </div>

        {/* Activités récentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Activités Récentes</h2>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {activity.type === 'procedure' && (
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  )}
                  {activity.type === 'rendezvous' && (
                    <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  {activity.type === 'user' && (
                    <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.userEmail && `Par ${activity.userEmail} • `}
                    {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                Aucune activité récente
              </div>
            )}
          </div>
        </div>
      </div>
    
    </>

    

  );
};

export default AdminDashboard;