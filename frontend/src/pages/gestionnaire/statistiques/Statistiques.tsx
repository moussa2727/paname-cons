import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Users,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Hooks uniquement - Utilisation des méthodes stats disponibles
// ─────────────────────────────────────────────────────────────────────────────

import { useRendezvous } from "../../../hooks/useRendezvous";
import { useUser } from "../../../hooks/useUser";
import { useProcedures } from "../../../hooks/useProcedures";
import { useMessages } from "../../../hooks/useMessages";
import { useDestinations } from "../../../hooks/useDestinations";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Types - Supprimés car non utilisés (garder pour usage futur si nécessaire)
// ─────────────────────────────────────────────────────────────────────────────

// Note: Ces types peuvent être ré-importés si nécessaire plus tard
// import type { ProcedureStatus } from "../../../types/procedures.types";
// import type { RendezvousStatus } from "../../../types/rendezvous.types";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales (uniquement pour l'UI)
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  gradient: string;
  trend: "up" | "down" | "neutral";
  sub?: string;
}

interface AlertItem {
  icon: React.ElementType;
  text: string;
  color: string;
  bg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant StatCard
// ─────────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  trend,
  sub,
}) => {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-rose-600"
        : "text-gray-500";
  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : TrendingUp;

  return (
    <div className="shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span
          className={`text-xs font-semibold flex items-center gap-0.5 ${trendColor}`}
        >
          {change !== 0 && (change > 0 ? "+" : "")}
          {change !== 0 ? `${change}%` : "—"}
          <TrendIcon className="w-3 h-3" />
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const Statistiques: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Hooks - Utilisation UNIQUEMENT des méthodes stats disponibles ─────

  // useRendezvous - loadStatistics() est la seule méthode de stats
  const { statistics: rendezvousStats, loadStatistics: loadRendezvousStats } =
    useRendezvous({
      autoLoad: false, // On contrôle manuellement le chargement
    });

  // useUser - fetchStatistics() est la méthode de stats
  const { statistics: userStats, fetchStatistics: fetchUserStats } = useUser();

  // useProcedures - loadStatistics() est la méthode de stats
  const { statistics: procedureStats, loadStatistics: loadProcedureStats } =
    useProcedures({
      shouldLoadStatistics: false, // On contrôle manuellement
    });

  // useMessages - stats est dans le hook, refresh() recharge tout
  const { stats: messageStats, refresh: refreshMessages } = useMessages();

  // useDestinations - Pas de stats directes, on utilise getDestinationsStatistics
  const { getDestinationsStatistics } = useDestinations();

  // ─── Chargement unique de toutes les stats au montage ──────────────────
  useEffect(() => {
    if (!isAdmin) return;

    const loadAllStatistics = async () => {
      console.log("[Statistiques] Chargement de toutes les stats...");

      try {
        await Promise.all([
          loadRendezvousStats(),
          fetchUserStats(),
          loadProcedureStats(),
          refreshMessages(), // refresh recharge tout, y compris les stats
          getDestinationsStatistics(), // Méthode spécifique aux destinations
        ]);

        console.log("[Statistiques] ✅ Toutes les stats chargées");
      } catch (error) {
        console.error("[Statistiques] Erreur chargement stats:", error);
        toast.error("Impossible de charger certaines statistiques");
      }
    };

    loadAllStatistics();
  }, [
    isAdmin,
    loadRendezvousStats,
    fetchUserStats,
    loadProcedureStats,
    refreshMessages,
    getDestinationsStatistics,
  ]);

  // ─── Données pour l'activité hebdomadaire ─────────────────────────────
  const weeklyActivity = useMemo(() => {
    // Utiliser les données disponibles dans les stats
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    return days.map((day) => ({
      name: day,
      rendezvous: rendezvousStats?.upcoming?.thisWeek
        ? Math.floor(rendezvousStats.upcoming.thisWeek / 7) // Répartition approximative
        : 0,
      procedures: procedureStats?.newProcedures?.thisWeek
        ? Math.floor(procedureStats.newProcedures.thisWeek / 7)
        : 0,
      messages: messageStats?.thisWeek
        ? Math.floor(messageStats.thisWeek / 7)
        : 0,
    }));
  }, [rendezvousStats, procedureStats, messageStats]);

  // ─── Données pour les destinations (depuis les stats procédures) ──────
  const destinationData = useMemo(() => {
    if (procedureStats?.topDestinations?.length) {
      return procedureStats.topDestinations.map((dest) => ({
        name: dest.destination,
        value: dest.count,
      }));
    }

    // Fallback sur données vides
    return [{ name: "Aucune donnée", value: 1 }];
  }, [procedureStats]);

  // ─── Couleurs pour le pie chart ───────────────────────────────────────
  const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

  // ─── Cartes de statistiques (basées uniquement sur les données des hooks) ─
  const statCards = useMemo(() => {
    if (!rendezvousStats || !procedureStats || !messageStats || !userStats) {
      return [];
    }

    return [
      {
        title: "Rendez-vous",
        value: rendezvousStats.total || 0,
        change: Math.round(rendezvousStats.completionRate || 0),
        icon: Calendar,
        gradient: "from-sky-400 to-sky-600",
        trend: "up" as const,
        sub: `${rendezvousStats.byStatus?.confirmed || 0} confirmés`,
      },
      {
        title: "Procédures",
        value: procedureStats.total || 0,
        change: Math.round(procedureStats.completionRate || 0),
        icon: FileText,
        gradient: "from-emerald-400 to-emerald-600",
        trend: "up" as const,
        sub: `${procedureStats.byStatus?.IN_PROGRESS || 0} en cours`,
      },
      {
        title: "Messages",
        value: messageStats?.total || 0,
        change: Math.round(messageStats?.responseRate || 0),
        icon: MessageSquare,
        gradient: "from-amber-400 to-amber-600",
        trend: "up" as const,
        sub: `${messageStats?.unread || 0} non lus`,
      },
      {
        title: "Utilisateurs",
        value: userStats?.totalUsers || 0,
        change: userStats?.recentlyCreated || 0,
        icon: Users,
        gradient: "from-indigo-400 to-indigo-600",
        trend: "up" as const,
        sub: `${userStats?.activeUsers || 0} actifs`,
      },
      {
        title: "Taux complétion",
        value: `${Math.round(procedureStats.completionRate || 0)}%`,
        change: Math.round(procedureStats.completionRate || 0),
        icon: TrendingUp,
        gradient: "from-violet-400 to-violet-600",
        trend: "up" as const,
      },
      {
        title: "Annulations",
        value: `${Math.round(rendezvousStats.cancellationRate || 0)}%`,
        change: -Math.round(rendezvousStats.cancellationRate || 0),
        icon: TrendingDown,
        gradient: "from-rose-400 to-rose-600",
        trend: "down" as const,
      },
    ];
  }, [rendezvousStats, procedureStats, messageStats, userStats]);

  // ─── Alertes dynamiques basées sur les stats ──────────────────────────
  const alerts = useMemo((): AlertItem[] => {
    const items: AlertItem[] = [];

    if (rendezvousStats?.byStatus?.pending) {
      items.push({
        icon: Clock,
        text: `${rendezvousStats.byStatus.pending} rendez-vous en attente de confirmation`,
        color: "text-amber-600",
        bg: "bg-amber-50",
      });
    }

    if (procedureStats?.byStatus?.IN_PROGRESS) {
      items.push({
        icon: CheckCircle,
        text: `${procedureStats.byStatus.IN_PROGRESS} procédures actives`,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      });
    }

    if (messageStats?.unread) {
      items.push({
        icon: XCircle,
        text: `${messageStats.unread} messages non lus`,
        color: "text-rose-600",
        bg: "bg-rose-50",
      });
    }

    if (rendezvousStats?.upcoming?.today) {
      items.push({
        icon: Calendar,
        text: `${rendezvousStats.upcoming.today} rendez-vous aujourd'hui`,
        color: "text-sky-600",
        bg: "bg-sky-50",
      });
    }

    if (procedureStats?.newProcedures?.today) {
      items.push({
        icon: FileText,
        text: `${procedureStats.newProcedures.today} nouvelles procédures aujourd'hui`,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
      });
    }

    return items;
  }, [rendezvousStats, procedureStats, messageStats]);

  // ─── Rafraîchissement manuel ──────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([
        loadRendezvousStats(),
        fetchUserStats(),
        loadProcedureStats(),
        refreshMessages(),
        getDestinationsStatistics(),
      ]);
      toast.success("Statistiques actualisées avec succès");
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
      toast.error("Impossible de charger les statistiques");
    } finally {
      setIsRefreshing(false);
    }
  }, [
    loadRendezvousStats,
    fetchUserStats,
    loadProcedureStats,
    refreshMessages,
    getDestinationsStatistics,
  ]);

  // ─── Vérification admin ───────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-red-600">
            Vous n'avez pas les permissions nécessaires pour accéder aux
            statistiques.
          </p>
        </div>
      </div>
    );
  }

  // ─── Vérification chargement initial ───────────────────────────────────
  const isLoading =
    !rendezvousStats || !procedureStats || !messageStats || !userStats;

  // ─── Rendu ─────────────────────────────────────────────────────────────
  return (
    <>
      <Helmet>
        <title>Statistiques - Paname Consulting</title>
        <meta
          name="description"
          content="Tableau de bord statistiques Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                Statistiques
              </h1>
              <p className="text-xs text-gray-500">Paname Consulting · Admin</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="p-2 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 text-sky-600 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cartes statistiques */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card) => (
                  <StatCard key={card.title} {...card} />
                ))}
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activité hebdomadaire */}
                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Activité hebdomadaire (moyenne)
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weeklyActivity}>
                      <defs>
                        <linearGradient id="gRdv" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#0284c7"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#0284c7"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="gProc" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#f59e0b"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f59e0b"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e0f2fe",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="rendezvous"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fill="url(#gRdv)"
                        name="Rendez-vous"
                      />
                      <Area
                        type="monotone"
                        dataKey="procedures"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#gProc)"
                        name="Procédures"
                      />
                      <Area
                        type="monotone"
                        dataKey="messages"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#gMsg)"
                        name="Messages"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Destinations populaires */}
                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Destinations les plus demandées
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={destinationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${Math.round((percent || 0) * 100)}%`
                        }
                        labelLine={false}
                        fontSize={11}
                      >
                        {destinationData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Statistiques hebdomadaires et mensuelles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cette semaine */}
                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    Cette semaine
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Rendez-vous
                        </p>
                        <p className="text-2xl font-bold text-sky-600">
                          {rendezvousStats?.upcoming?.thisWeek || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Messages</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {messageStats?.thisWeek || 0}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Procédures</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {procedureStats?.newProcedures?.thisWeek || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Taux complétion
                        </p>
                        <p className="text-2xl font-bold text-violet-600">
                          {Math.round(procedureStats?.completionRate || 0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ce mois */}
                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Ce mois
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Rendez-vous
                        </p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {rendezvousStats?.upcoming?.thisMonth || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Messages</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {messageStats?.thisMonth || 0}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Procédures</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {procedureStats?.newProcedures?.thisMonth || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Nouveaux utilisateurs
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {userStats?.recentlyCreated || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alertes */}
              {alerts.length > 0 && (
                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Alertes
                  </h3>
                  <div className="space-y-2">
                    {alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 ${alert.bg} rounded-xl`}
                      >
                        <alert.icon
                          className={`w-4 h-4 ${alert.color} shrink-0`}
                        />
                        <span className="text-sm text-gray-700">
                          {alert.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Statistiques;
