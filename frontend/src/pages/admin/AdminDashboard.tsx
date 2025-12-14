import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Calendar, 
  MessageSquare, 
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Globe,
  Server
} from 'lucide-react';
import RequireAdmin from '../../context/RequireAdmin';
import { adminStatsService } from '../../api/admin/AdminDashboardService';
import { useAuth } from '../../context/AuthContext';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
  color?: string;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  onRefresh,
  loading = false 
}) => (
  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-sky-500 relative">
    {loading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
        <RefreshCw className="animate-spin text-sky-600" size={24} />
      </div>
    )}
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 rounded-lg bg-sky-100">
        {icon}
      </div>
      <div className="flex items-center space-x-2">
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 hover:bg-sky-100 rounded transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={`text-sky-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-800 truncate">{value.toLocaleString()}</h3>
    <p className="text-sm text-gray-600 mt-1">{title}</p>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

interface DetailCardProps {
  title: string;
  icon: React.ReactNode;
  data: Array<{ label: string; value: number; color: string }>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, icon, data, onRefresh, loading = false }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 relative">
    {loading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
        <RefreshCw className="animate-spin text-sky-600" size={32} />
      </div>
    )}
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className="flex items-center">
        {icon}
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 ml-2">{title}</h2>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 sm:p-2 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw size={18} className={`text-sky-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
    <div className="space-y-2 sm:space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex justify-between items-center py-1.5 sm:py-2 border-b last:border-b-0">
          <span className="text-xs sm:text-sm text-gray-600 truncate">{item.label}</span>
          <span className={`font-semibold text-sm ${item.color}`}>{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  </div>
);

interface StatusBadgeProps {
  status: boolean;
  label: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => (
  <div className="flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm w-full">
    {status ? (
      <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
    ) : (
      <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
    )}
    <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
    <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {status ? 'OK' : 'Erreur'}
    </span>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  
  // États séparés pour chaque section
  const [proceduresStats, setProceduresStats] = useState<any>(null);
  const [usersStats, setUsersStats] = useState<any>(null);
  const [rendezvousStats, setRendezvousStats] = useState<any>(null);
  const [contactsStats, setContactsStats] = useState<any>(null);
  const [destinationsStats, setDestinationsStats] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  
  // États de chargement séparés
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingSystem, setLoadingSystem] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // ✅ Injection stricte de fetchWithAuth dans le service
    adminStatsService.setFetchWithAuth(fetchWithAuth);
    loadAllStats();
  }, [fetchWithAuth]);

  // ✅ Chargement initial - utilise getGeneralStats()
  const loadAllStats = async () => {
    try {
      setLoadingAll(true);
      const data = await adminStatsService.getGeneralStats();
      
      // Extraction des données de la réponse consolidée
      setProceduresStats(data.procedures);
      setUsersStats(data.users);
      setRendezvousStats(data.rendezvous);
      setContactsStats(data.contacts);
      setDestinationsStats(data.destinations);
      setSystemStatus(data.systemStatus);
      
      setLastUpdate(new Date());
    } catch (error) {
      // ✅ Gestion d'erreur déléguée au service (toast déjà affiché)
      console.error('Erreur chargement initial:', error);
    } finally {
      setLoadingAll(false);
    }
  };

  // ✅ Refresh global - utilise refreshAllStats()
  const handleRefreshAll = async () => {
    try {
      setRefreshingAll(true);
      const data = await adminStatsService.refreshAllStats();
      
      setProceduresStats(data.procedures);
      setUsersStats(data.users);
      setRendezvousStats(data.rendezvous);
      setContactsStats(data.contacts);
      setDestinationsStats(data.destinations);
      setSystemStatus(data.systemStatus);
      
      setLastUpdate(new Date());
    } catch (error) {
      // ✅ Gestion d'erreur déléguée au service
      console.error('Erreur refresh global:', error);
    } finally {
      setRefreshingAll(false);
    }
  };

  // ✅ Refresh procédures - utilise getProcedureStats()
  const refreshProcedures = async () => {
    try {
      setLoadingProcedures(true);
      const data = await adminStatsService.getProcedureStats();
      setProceduresStats(data);
    } catch (error) {
      console.error('Erreur refresh procédures:', error);
    } finally {
      setLoadingProcedures(false);
    }
  };

  // ✅ Refresh utilisateurs - utilise getUserStats()
  const refreshUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await adminStatsService.getUserStats();
      setUsersStats(data);
    } catch (error) {
      console.error('Erreur refresh utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ✅ Refresh contacts - utilise getContactStats()
  const refreshContacts = async () => {
    try {
      setLoadingContacts(true);
      const data = await adminStatsService.getContactStats();
      setContactsStats(data);
    } catch (error) {
      console.error('Erreur refresh contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // ✅ Refresh système - utilise getSystemStatus()
  const refreshSystem = async () => {
    try {
      setLoadingSystem(true);
      const data = await adminStatsService.getSystemStatus();
      setSystemStatus(data);
    } catch (error) {
      console.error('Erreur refresh système:', error);
    } finally {
      setLoadingSystem(false);
    }
  };

  if (loadingAll) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-xs">
          <RefreshCw className="animate-spin mx-auto mb-4 text-sky-600" size={48} />
          <p className="text-gray-600 font-medium">Chargement des statistiques...</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-2 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Stats Cards Grid - avec refresh individuel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
          <StatsCard
            title="Utilisateurs totaux"
            value={usersStats?.totalUsers || 0}
            icon={<Users className="text-sky-600" size={24} />}
            subtitle={`${usersStats?.activeUsers || 0} actifs`}
            onRefresh={refreshUsers}
            loading={loadingUsers}
          />
          
          <StatsCard
            title="Procédures"
            value={proceduresStats?.total || 0}
            icon={<FileText className="text-sky-600" size={24} />}
            subtitle={`${proceduresStats?.active || 0} en cours`}
            onRefresh={refreshProcedures}
            loading={loadingProcedures}
          />
          
          <StatsCard
            title="Rendez-vous"
            value={rendezvousStats?.total || 0}
            icon={<Calendar className="text-sky-600" size={24} />}
            subtitle={`${rendezvousStats?.confirmed || 0} confirmés`}
          />
          
          <StatsCard
            title="Messages"
            value={contactsStats?.total || 0}
            icon={<MessageSquare className="text-sky-600" size={24} />}
            subtitle={`${contactsStats?.unread || 0} non lus`}
            onRefresh={refreshContacts}
            loading={loadingContacts}
          />
        </div>

        {/* Detailed Stats Section - avec refresh individuel */}
        <div className="grid grid-cols-1 gap-5 mb-6">
          {/* Procédures Details */}
          <DetailCard
            title="Détail des procédures"
            icon={<BarChart3 className="text-sky-600" size={24} />}
            data={[
              { label: 'En attente', value: proceduresStats?.pending || 0, color: 'text-yellow-600' },
              { label: 'En cours', value: proceduresStats?.active || 0, color: 'text-sky-600' },
              { label: 'Complétées', value: proceduresStats?.completed || 0, color: 'text-green-600' },
              { label: 'Annulées', value: proceduresStats?.cancelled || 0, color: 'text-red-600' },
            ]}
            onRefresh={refreshProcedures}
            loading={loadingProcedures}
          />

          {/* Users Details */}
          <DetailCard
            title="Activité utilisateurs"
            icon={<Users className="text-sky-600" size={24} />}
            data={[
              { label: 'Utilisateurs actifs', value: usersStats?.activeUsers || 0, color: 'text-green-600' },
              { label: 'Utilisateurs inactifs', value: usersStats?.inactiveUsers || 0, color: 'text-gray-600' },
              { label: 'Connexions (24h)', value: usersStats?.last24hLogins || 0, color: 'text-sky-600' },
              { label: 'Inscriptions (7j)', value: usersStats?.last7dRegistrations || 0, color: 'text-purple-600' },
            ]}
            onRefresh={refreshUsers}
            loading={loadingUsers}
          />
        </div>

        {/* Contacts & Rendezvous Details */}
        <div className="grid grid-cols-1 gap-5 mb-6">
          <DetailCard
            title="Détail des contacts"
            icon={<MessageSquare className="text-sky-600" size={24} />}
            data={[
              { label: 'Non lus', value: contactsStats?.unread || 0, color: 'text-orange-600' },
              { label: 'Lus', value: contactsStats?.read || 0, color: 'text-sky-600' },
              { label: 'Répondus', value: contactsStats?.replied || 0, color: 'text-green-600' },
            ]}
            onRefresh={refreshContacts}
            loading={loadingContacts}
          />

          <DetailCard
            title="Détail des rendez-vous"
            icon={<Calendar className="text-sky-600" size={24} />}
            data={[
              { label: 'Confirmés', value: rendezvousStats?.confirmed || 0, color: 'text-green-600' },
              { label: 'En attente', value: rendezvousStats?.pending || 0, color: 'text-yellow-600' },
              { label: 'Complétés', value: rendezvousStats?.completed || 0, color: 'text-sky-600' },
              { label: 'Annulés', value: rendezvousStats?.cancelled || 0, color: 'text-red-600' },
            ]}
          />
        </div>

        {/* System Status - avec refresh individuel */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 relative">
          {loadingSystem && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
              <RefreshCw className="animate-spin text-sky-600" size={32} />
            </div>
          )}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center">
              <Activity className="text-sky-600 mr-2" size={24} />
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">État du système</h2>
            </div>
            <button
              onClick={refreshSystem}
              disabled={loadingSystem}
              className="p-1.5 sm:p-2 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={18} className={`text-sky-600 ${loadingSystem ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <StatusBadge 
              status={systemStatus?.database || false} 
              label="Base de données" 
            />
            <StatusBadge 
              status={systemStatus?.cache || false} 
              label="Cache" 
            />
            <StatusBadge 
              status={!systemStatus?.maintenanceMode} 
              label="Service disponible" 
            />
          </div>
          {systemStatus?.uptime && (
            <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-sky-600 flex-shrink-0" />
                <span>Temps de fonctionnement: <span className="font-medium text-gray-800">{systemStatus.uptime}</span></span>
              </div>
              {systemStatus?.version && (
                <div className="flex items-center">
                  <Server size={16} className="mr-2 text-sky-600 flex-shrink-0" />
                  <span>Version: <span className="font-medium text-gray-800">{systemStatus.version}</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 text-center border-t-4 border-sky-500">
            <Globe className="mx-auto mb-1.5 sm:mb-2 text-sky-600" size={20} />
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{destinationsStats?.total || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Destinations</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 text-center border-t-4 border-sky-500">
            <Calendar className="mx-auto mb-1.5 sm:mb-2 text-sky-600" size={20} />
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{rendezvousStats?.today || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Aujourd'hui</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 text-center border-t-4 border-sky-500">
            <Clock className="mx-auto mb-1.5 sm:mb-2 text-sky-600" size={20} />
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{rendezvousStats?.upcoming || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">À venir</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 text-center border-t-4 border-sky-500">
            <MessageSquare className="mx-auto mb-1.5 sm:mb-2 text-sky-600" size={20} />
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{contactsStats?.replied || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Réponses</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Enrober strictement avec RequireAdmin
export default function ProtectedAdminDashboard() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}