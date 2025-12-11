// components/admin/AdminDashboard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboardService, useAdminDashboard } from '../../api/admin/AdminDashboardService';
import RequireAdmin from '../../context/RequireAdmin';
import { toast } from 'react-toastify';
import {
  Users,
  FileText,
  Calendar,
  MessageSquare,
  BarChart3,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Download,
  Eye,
  Trash2,
  Edit,
  Settings,
  Home,
  Menu,
  X,
  PieChart,
  UserPlus,
  Mail,
  Files,
  CalendarDays,
  Globe,
  Shield,
  Cpu,
  Database,
  Cloud,
  Wifi,
  AlertCircle,
  Info,
  LayoutDashboard,
  List,
  BellRing,
  Sparkles,
  Activity,
  Server,
  HardDrive,
  Network,
  BarChart,
  FileCheck,
  MailCheck,
  CalendarCheck,
  Users2,
  ChartNoAxesCombined,
  Zap,
  Target,
  Percent,
  Timer,
  Smartphone,
  Monitor
} from 'lucide-react';

// Types
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'sky' | 'emerald' | 'amber' | 'purple' | 'rose' | 'blue' | 'indigo' | 'cyan';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  loading?: boolean;
  onClick?: () => void;
}

interface ActivityItem {
  id: string;
  type: 'procedure' | 'user' | 'rendezvous' | 'message';
  action: string;
  timestamp: string;
  userEmail?: string;
  details?: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

interface SystemMetric {
  name: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { service, refreshStats, user: adminUser, isLoading: authLoading } = useAdminDashboard();
  
  // États principaux
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // États UI
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'system'>('overview');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showStatsDetails, setShowStatsDetails] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Références
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadAttempts = useRef(0);
  
  // Gestion responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Chargement des données avec retry
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      setError(null);
      
      // Limiter les tentatives
      if (dataLoadAttempts.current >= 3) {
        throw new Error('Trop de tentatives échouées');
      }
      
      const dashboardStats = await refreshStats(isManualRefresh);
      setStats(dashboardStats);
      
      // Charger les données mensuelles (simulées pour l'exemple)
      const mockMonthlyData = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          procedures: Math.floor(Math.random() * 50) + 10,
          users: Math.floor(Math.random() * 20) + 5,
          rendezvous: Math.floor(Math.random() * 30) + 8
        };
      }).reverse();
      
      setMonthlyData(mockMonthlyData);
      setLastUpdated(new Date());
      dataLoadAttempts.current = 0;
      
      if (isManualRefresh) {
        toast.success('Données actualisées', {
          position: isMobile ? 'top-center' : 'top-right',
          autoClose: 1500
        });
      }
    } catch (err: any) {
      dataLoadAttempts.current++;
      console.error('Erreur chargement dashboard:', err);
      setError(err.message || 'Impossible de charger les données');
      
      if (isManualRefresh) {
        toast.error('Erreur lors de l\'actualisation', {
          position: isMobile ? 'top-center' : 'top-right'
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshStats, isMobile]);
  
  // Chargement initial
  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading, loadDashboardData]);
  
  // Auto-refresh toutes les 2 minutes
  useEffect(() => {
    if (!isLoading) {
      refreshTimeoutRef.current = setTimeout(() => {
        loadDashboardData(false);
      }, 120000); // 2 minutes
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isLoading, loadDashboardData]);
  
  // Gestion des erreurs
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <XCircle className="w-20 h-20 text-rose-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur de connexion</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => loadDashboardData(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="inline w-5 h-5 mr-2" />
                Réessayer
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border-2 border-slate-300 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Composants UI
  const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend,
    trendValue,
    description,
    loading = false,
    onClick 
  }) => {
    const colorConfig = {
      sky: { bg: 'from-sky-50 to-sky-100', border: 'border-sky-200', text: 'text-sky-700', iconBg: 'bg-sky-500/10', gradient: 'from-sky-500 to-cyan-500' },
      emerald: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-green-500' },
      amber: { bg: 'from-amber-50 to-amber-100', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-500/10', gradient: 'from-amber-500 to-orange-500' },
      purple: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-500/10', gradient: 'from-purple-500 to-violet-500' },
      rose: { bg: 'from-rose-50 to-rose-100', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-500/10', gradient: 'from-rose-500 to-pink-500' },
      blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-500/10', gradient: 'from-blue-500 to-indigo-500' },
      indigo: { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-500/10', gradient: 'from-indigo-500 to-purple-500' },
      cyan: { bg: 'from-cyan-50 to-cyan-100', border: 'border-cyan-200', text: 'text-cyan-700', iconBg: 'bg-cyan-500/10', gradient: 'from-cyan-500 to-teal-500' }
    };
    
    const config = colorConfig[color];
    
    if (loading) {
      return (
        <div className={`bg-gradient-to-br ${config.bg} ${config.border} border rounded-3xl p-6 animate-pulse`}>
          <div className="flex items-center justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-300"></div>
            <div className="w-16 h-6 rounded-full bg-slate-300"></div>
          </div>
          <div className="h-9 w-28 bg-slate-300 rounded-xl mb-2"></div>
          <div className="h-4 w-36 bg-slate-300 rounded"></div>
        </div>
      );
    }
    
    return (
      <div 
        onClick={onClick}
        className={`
          bg-gradient-to-br ${config.bg} ${config.border} border rounded-3xl p-6
          transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
          ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
          relative overflow-hidden group
        `}
      >
        {/* Effet de brillance */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="flex items-center justify-between mb-5">
          <div className={`p-3 rounded-2xl ${config.iconBg}`}>
            <div className={config.text}>
              {icon}
            </div>
          </div>
          
          {trend && trendValue && (
            <div className={`flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${
              trend === 'up' 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                : trend === 'down'
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 mr-1.5" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 mr-1.5" />
              ) : (
                <div className="w-4 h-4 mr-1.5 flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-slate-700 rounded-full"></div>
                </div>
              )}
              {trendValue}
            </div>
          )}
        </div>
        
        <h3 className="text-3xl font-bold text-slate-900 mb-2">{value}</h3>
        <p className="text-slate-700 font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-slate-500 mt-3">{description}</p>
        )}
        
        {/* Badge d'interaction */}
        {onClick && (
          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </div>
    );
  };
  
  const ActivityItem: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const getIconConfig = () => {
      switch (item.type) {
        case 'procedure':
          return { icon: Files, bg: 'bg-sky-100', text: 'text-sky-600' };
        case 'user':
          return { icon: Users2, bg: 'bg-emerald-100', text: 'text-emerald-600' };
        case 'rendezvous':
          return { icon: CalendarDays, bg: 'bg-purple-100', text: 'text-purple-600' };
        case 'message':
          return { icon: Mail, bg: 'bg-amber-100', text: 'text-amber-600' };
        default:
          return { icon: Bell, bg: 'bg-slate-100', text: 'text-slate-600' };
      }
    };
    
    const { icon: Icon, bg, text } = getIconConfig();
    const timeAgo = getTimeAgo(item.timestamp);
    
    return (
      <div className="flex items-start p-5 hover:bg-slate-50 rounded-2xl transition-colors duration-200 group">
        <div className={`flex-shrink-0 p-3 rounded-2xl ${bg}`}>
          <Icon className={`w-5 h-5 ${text}`} />
        </div>
        
        <div className="ml-4 flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {item.action}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center mt-2 text-sm text-slate-600 space-y-1 sm:space-y-0">
            {item.userEmail && (
              <span className="font-medium truncate flex items-center">
                <User className="w-3 h-3 mr-1.5" />
                {item.userEmail}
              </span>
            )}
            {item.details && (
              <>
                {item.userEmail && <span className="hidden sm:inline mx-2 text-slate-400">•</span>}
                <span className="truncate flex items-center">
                  <Info className="w-3 h-3 mr-1.5" />
                  {item.details}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="ml-2 flex-shrink-0 flex flex-col items-end">
          <div className="text-xs text-slate-500 whitespace-nowrap flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {timeAgo}
          </div>
          <button className="mt-3 text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity opacity-0 group-hover:opacity-100">
            Voir
          </button>
        </div>
      </div>
    );
  };
  
  const SystemMetricCard: React.FC<{ metric: SystemMetric }> = ({ metric }) => {
    const statusConfig = {
      healthy: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
      warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
      critical: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: XCircle }
    };
    
    const config = statusConfig[metric.status];
    const StatusIcon = config.icon;
    
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-100 rounded-xl">
              {metric.icon}
            </div>
            <span className="font-semibold text-slate-900">{metric.name}</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text} ${config.border} border flex items-center`}>
            <StatusIcon className="w-3 h-3 mr-1.5" />
            {metric.status === 'healthy' ? 'OK' : metric.status === 'warning' ? 'Attention' : 'Critique'}
          </span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
      </div>
    );
  };
  
  const MiniChart: React.FC<{ data: ChartDataPoint[], title: string, total: number }> = ({ data, title, total }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          <span className="text-sm text-slate-500">
            {total} total
          </span>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-16 text-sm text-slate-600 font-medium">{item.name}</div>
              <div className="flex-1 ml-3">
                <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
              <div className="w-12 text-right text-sm font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Utilitaires
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} j`;
    return `${Math.floor(diffDays / 7)} sem`;
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'users':
        navigate('/gestionnaire/utilisateurs');
        break;
      case 'procedures':
        navigate('/gestionnaire/procedures');
        break;
      case 'rendezvous':
        navigate('/gestionnaire/rendezvous');
        break;
      case 'messages':
        navigate('/gestionnaire/messages');
        break;
      case 'export':
        handleExportData();
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };
  
  const handleExportData = () => {
    if (!stats) return;
    
    const dataStr = JSON.stringify({
      stats,
      monthlyData,
      exportedAt: new Date().toISOString()
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paname-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Export réussi', {
      position: isMobile ? 'top-center' : 'top-right'
    });
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/connexion');
      toast.info('À bientôt !');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };
  
  // Données système simulées
  const systemMetrics: SystemMetric[] = [
    { name: 'API Serveur', value: 'En ligne', status: 'healthy', icon: <Server className="w-5 h-5 text-blue-600" /> },
    { name: 'Base de données', value: 'Connectée', status: 'healthy', icon: <Database className="w-5 h-5 text-emerald-600" /> },
    { name: 'Mémoire', value: '68%', status: 'warning', icon: <HardDrive className="w-5 h-5 text-amber-600" /> },
    { name: 'Disponibilité', value: '99.8%', status: 'healthy', icon: <Shield className="w-5 h-5 text-purple-600" /> },
  ];
  
  // Données pour mini-charts
  const procedureChartData: ChartDataPoint[] = [
    { name: 'Actives', value: stats?.activeProcedures || 0, color: '#10b981' },
    { name: 'En attente', value: stats?.pendingProcedures || 0, color: '#f59e0b' },
    { name: 'Terminées', value: stats?.completedProcedures || 0, color: '#3b82f6' },
    { name: 'Annulées', value: stats?.cancelledProcedures || 0, color: '#ef4444' },
  ];
  
  const userChartData: ChartDataPoint[] = [
    { name: 'Actifs', value: stats?.activeUsers || 0, color: '#10b981' },
    { name: 'Inactifs', value: (stats?.totalUsers || 0) - (stats?.activeUsers || 0), color: '#6b7280' },
  ];
  
  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-9 w-44 bg-slate-300 rounded-xl animate-pulse"></div>
          <div className="flex items-center space-x-4">
            <div className="h-11 w-11 bg-slate-300 rounded-full animate-pulse"></div>
            <div className="h-11 w-28 bg-slate-300 rounded-xl animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200">
              <div className="flex justify-between mb-5">
                <div className="h-12 w-12 bg-slate-300 rounded-2xl animate-pulse"></div>
                <div className="h-7 w-20 bg-slate-300 rounded-full animate-pulse"></div>
              </div>
              <div className="h-9 w-28 bg-slate-300 rounded-xl animate-pulse mb-3"></div>
              <div className="h-4 w-36 bg-slate-300 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200">
            <div className="h-7 w-44 bg-slate-300 rounded mb-6 animate-pulse"></div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl mb-4 animate-pulse"></div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
              <div className="h-7 w-36 bg-slate-300 rounded mb-6 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-6 border border-blue-200">
              <div className="h-7 w-32 bg-blue-200 rounded mb-6 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-white rounded-2xl animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Top Bar Mobile */}
        {isMobile && (
          <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl shadow-lg">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-lg">Dashboard</h1>
                  <p className="text-xs text-slate-500">Panel d'administration</p>
                </div>
              </div>
              <button
                onClick={() => loadDashboardData(true)}
                disabled={isRefreshing}
                className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header Desktop */}
          {!isMobile && (
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl">
                    <LayoutDashboard className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Bonjour, <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{user?.firstName}</span>
                  </h1>
                </div>
                <p className="text-slate-600 text-lg">
                  Gestion complète de votre plateforme Paname Consulting
                </p>
              </div>
              <div className="flex items-center space-x-4 mt-6 md:mt-0">
                <div className="text-sm text-slate-500 bg-slate-100 px-4 py-2.5 rounded-xl">
                  <Timer className="inline w-4 h-4 mr-2" />
                  Mis à jour à {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  onClick={() => loadDashboardData(true)}
                  disabled={isRefreshing}
                  className="flex items-center space-x-3 px-5 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="font-semibold">Actualiser</span>
                </button>
                <button
                  onClick={() => handleQuickAction('export')}
                  className="flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-semibold">Exporter</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              title="Utilisateurs totaux"
              value={stats?.totalUsers || 0}
              icon={<Users2 className="w-6 h-6" />}
              color="sky"
              trend="up"
              trendValue="+8%"
              description={`${stats?.activeUsers || 0} actifs`}
              onClick={() => handleQuickAction('users')}
            />
            
            <StatCard
              title="Procédures actives"
              value={stats?.totalProcedures || 0}
              icon={<Files className="w-6 h-6" />}
              color="emerald"
              trend="up"
              trendValue="+12%"
              description={`${stats?.pendingProcedures || 0} en attente`}
              onClick={() => handleQuickAction('procedures')}
            />
            
            <StatCard
              title="RDV en attente"
              value={stats?.pendingRendezvous || 0}
              icon={<CalendarDays className="w-6 h-6" />}
              color="purple"
              trend="down"
              trendValue="-5%"
              description="À confirmer"
              onClick={() => handleQuickAction('rendezvous')}
            />
            
            <StatCard
              title="Messages non lus"
              value={stats?.unreadMessages || 0}
              icon={<Mail className="w-6 h-6" />}
              color="amber"
              trend="up"
              trendValue="+15%"
              description="À traiter"
              onClick={() => handleQuickAction('messages')}
            />
          </div>
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Activity & Analytics */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center">
                      <Activity className="w-5 h-5 mr-3 text-blue-600" />
                      Activité récente
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Dernières actions sur la plateforme</p>
                  </div>
                  <button className="text-sm bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Tout voir
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {stats?.recentActivities?.length > 0 ? (
                    stats.recentActivities.map((activity: ActivityItem) => (
                      <ActivityItem key={activity.id} item={activity} />
                    ))
                  ) : (
                    <div className="p-10 text-center">
                      <Clock className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg">Aucune activité récente</p>
                      <p className="text-sm text-slate-400 mt-2">Les nouvelles activités apparaîtront ici</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Analytics Charts */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <ChartNoAxesCombined className="w-5 h-5 mr-3 text-emerald-600" />
                  Statistiques détaillées
                </h2>
                <div className="space-y-8">
                  <MiniChart 
                    data={procedureChartData} 
                    title="Répartition des procédures"
                    total={stats?.totalProcedures || 0}
                  />
                  <MiniChart 
                    data={userChartData} 
                    title="Statut des utilisateurs"
                    total={stats?.totalUsers || 0}
                  />
                </div>
              </div>
            </div>
            
            {/* Right Column - System & Quick Actions */}
            <div className="space-y-6">
              {/* System Status */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <Server className="w-5 h-5 mr-3 text-purple-600" />
                  Statut système
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {systemMetrics.map((metric, index) => (
                    <SystemMetricCard key={index} metric={metric} />
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center">
                      <Timer className="w-4 h-4 mr-2" />
                      Dernière vérification
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <Zap className="w-5 h-5 mr-3 text-amber-600" />
                  Actions rapides
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleQuickAction('users')}
                    className="bg-white rounded-2xl p-5 text-center hover:shadow-lg active:scale-95 transition-all duration-200 border border-slate-200"
                  >
                    <div className="p-3 bg-sky-100 rounded-xl w-fit mx-auto mb-3">
                      <Users2 className="w-6 h-6 text-sky-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Utilisateurs</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('procedures')}
                    className="bg-white rounded-2xl p-5 text-center hover:shadow-lg active:scale-95 transition-all duration-200 border border-slate-200"
                  >
                    <div className="p-3 bg-emerald-100 rounded-xl w-fit mx-auto mb-3">
                      <FileCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Procédures</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('rendezvous')}
                    className="bg-white rounded-2xl p-5 text-center hover:shadow-lg active:scale-95 transition-all duration-200 border border-slate-200"
                  >
                    <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto mb-3">
                      <CalendarCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Rendez-vous</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('messages')}
                    className="bg-white rounded-2xl p-5 text-center hover:shadow-lg active:scale-95 transition-all duration-200 border border-slate-200"
                  >
                    <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto mb-3">
                      <MailCheck className="w-6 h-6 text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Messages</span>
                  </button>
                </div>
              </div>
              
              {/* Performance Summary */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-lg flex items-center">
                    <Target className="w-5 h-5 mr-3 text-cyan-400" />
                    Performance
                  </h2>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Temps de réponse API
                    </span>
                    <span className="font-bold">142ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      Requêtes aujourd'hui
                    </span>
                    <span className="font-bold">1,428</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center">
                      <Percent className="w-4 h-4 mr-2" />
                      Taux de réussite
                    </span>
                    <span className="font-bold text-emerald-400">99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Device Stats */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <Monitor className="w-5 h-5 mr-3 text-indigo-600" />
              Accès par appareil
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-500 rounded-xl">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">68%</div>
                    <div className="text-sm text-slate-600">Mobile</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-500 rounded-xl">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">28%</div>
                    <div className="text-sm text-slate-600">Desktop</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-500 rounded-xl">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">4%</div>
                    <div className="text-sm text-slate-600">Tablette</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Section - Mobile Actions */}
          {isMobile && (
            <div className="fixed bottom-6 inset-x-4 z-40">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-5 gap-4">
                  <button
                    onClick={() => handleQuickAction('users')}
                    className="flex flex-col items-center space-y-2 active:scale-95 transition-transform"
                  >
                    <div className="p-2.5 bg-sky-100 rounded-xl">
                      <Users2 className="w-5 h-5 text-sky-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Users</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('procedures')}
                    className="flex flex-col items-center space-y-2 active:scale-95 transition-transform"
                  >
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                      <Files className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Procs</span>
                  </button>
                  <button
                    onClick={() => loadDashboardData(true)}
                    disabled={isRefreshing}
                    className="flex flex-col items-center space-y-2 active:scale-95 transition-transform"
                  >
                    <div className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl">
                      <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Refresh</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('export')}
                    className="flex flex-col items-center space-y-2 active:scale-95 transition-transform"
                  >
                    <div className="p-2.5 bg-amber-100 rounded-xl">
                      <Download className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Export</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('logout')}
                    className="flex flex-col items-center space-y-2 active:scale-95 transition-transform"
                  >
                    <div className="p-2.5 bg-rose-100 rounded-xl">
                      <LogOut className="w-5 h-5 text-rose-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Quitter</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="text-center text-sm text-slate-500 mt-8 pb-8">
            <p>Paname Consulting Admin Dashboard • Version 1.0.0</p>
            <p className="mt-1">Dernière mise à jour : {lastUpdated.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminDashboard;