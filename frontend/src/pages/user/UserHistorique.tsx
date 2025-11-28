import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, FileText, Home, BarChart3, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: string;
  destination: string;
  avisAdmin?: string;
  niveauEtude: string;
  filiere: string;
}

interface UserStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UserHistorique = () => {
  const { user, isAuthenticated, token, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [completedRendezvous, setCompletedRendezvous] = useState<Rendezvous[]>([]);
  const [cancelledRendezvous, setCancelledRendezvous] = useState<Rendezvous[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showCompletedHistory, setShowCompletedHistory] = useState(false);
  const [showCancelledHistory, setShowCancelledHistory] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    } else {
      fetchUserStats();
    }
  }, [isAuthenticated, navigate]);

const fetchUserStats = async () => {
  setIsLoading(true);
  try {
    const makeRequest = async (currentToken: string): Promise<Response> => {
      return fetch(
        `${API_URL}/api/rendezvous/user/stats?email=${user?.email}`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        }
      );
    };

    if (!token) {
      throw new Error('Token non disponible. Veuillez vous reconnecter.');
    }

    let response = await makeRequest(token);

    // Si token expiré, rafraîchir et réessayer
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('token');
        if (newToken) {
          response = await makeRequest(newToken);
        } else {
          throw new Error('Token non disponible après rafraîchissement');
        }
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des statistiques');
    }
    
    const data = await response.json();
    setUserStats(data);
  } catch (error) {
    console.error('❌ Erreur fetchUserStats:', error);
    
    if (error instanceof Error && (
      error.message.includes('Session expirée') || 
      error.message.includes('Token invalide')
    )) {
      toast.error('Session expirée. Redirection...');
      setTimeout(() => navigate('/connexion'), 2000);
    } else {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  } finally {
    setIsLoading(false);
  }
};

  const fetchCompletedRendezvous = async () => {
    if (completedRendezvous.length > 0) return;
    
    setIsHistoryLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/rendezvous/user/completed?email=${user?.email}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des rendez-vous terminés');
      }
      
      const data = await response.json();
      setCompletedRendezvous(data.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchCancelledRendezvous = async () => {
    if (cancelledRendezvous.length > 0) return;
    
    setIsHistoryLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/rendezvous/user/cancelled?email=${user?.email}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des rendez-vous annulés');
      }
      
      const data = await response.json();
      setCancelledRendezvous(data.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status: string, avisAdmin?: string) => {
    return (
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${status === 'Confirmé' ? 'bg-green-100 text-green-800' :
            status === 'Terminé' ? 'bg-blue-100 text-blue-800' :
            status === 'Annulé' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'}`}>
          {status}
        </span>
        {avisAdmin && (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            {avisAdmin}
          </span>
        )}
      </div>
    );
  };

  const toggleCompletedHistory = async () => {
    if (!showCompletedHistory) {
      await fetchCompletedRendezvous();
    }
    setShowCompletedHistory(!showCompletedHistory);
    setShowCancelledHistory(false);
  };

  const toggleCancelledHistory = async () => {
    if (!showCancelledHistory) {
      await fetchCancelledRendezvous();
    }
    setShowCancelledHistory(!showCancelledHistory);
    setShowCompletedHistory(false);
  };

  const renderRendezvousList = (rdvList: Rendezvous[], emptyMessage: string) => {
    if (rdvList.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {rdvList.map(rdv => (
          <div key={rdv._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sky-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-sm">{formatDate(rdv.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{rdv.time}</span>
                </div>
              </div>
              {getStatusBadge(rdv.status, rdv.avisAdmin)}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700 text-xs">Destination:</span>
                <p className="text-gray-600 text-sm">{rdv.destination}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 text-xs">Niveau d'étude:</span>
                <p className="text-gray-600 text-sm">{rdv.niveauEtude}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-700 text-xs">Filière:</span>
                <p className="text-gray-600 text-sm">{rdv.filiere}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation utilisateur */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 md:space-x-6">
              <Link to="/" className="flex items-center text-sky-600 hover:text-sky-700 transition-colors">
                <Home className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Accueil</span>
              </Link>
              <nav className="flex space-x-2 md:space-x-4">
                <Link to="/user-profile" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <User className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mon Profil</span>
                </Link>
                <Link to="/user-rendez-vous" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <Calendar className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mes Rendez-vous</span>
                </Link>
                <Link to="/user-procedure" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <FileText className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mes Procédures</span>
                </Link>
                <Link to="/user-historique" className="flex items-center px-2 py-2 md:px-3 bg-sky-100 text-sky-700 rounded-md">
                  <BarChart3 className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Historique</span>
                </Link>
              </nav>
            </div>
            <button
              onClick={() => navigate('/rendez-vous')}
              className="px-3 py-2 md:px-4 md:py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm flex items-center gap-2 text-sm md:text-base"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-6 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* En-tête avec bouton retour */}
          <div className="mb-6 md:mb-8">
            <button
              onClick={() => navigate('/user-rendez-vous')}
              className="flex items-center gap-2 text-sky-600 hover:text-sky-700 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm md:text-base">Retour aux rendez-vous</span>
            </button>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-sky-600">Historique des Rendez-vous</h1>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  Consultez l'historique complet de vos rendez-vous
                </p>
              </div>
            </div>
          </div>

          {/* Carte principale */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100">
              <h2 className="text-xl md:text-2xl font-bold text-sky-600">Vue d'ensemble</h2>
              <p className="text-gray-600 text-sm md:text-base">Statistiques et historique de vos rendez-vous</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
              </div>
            ) : userStats ? (
              <div className="p-4 md:p-6">
                {/* Cartes de statistiques */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                  <div className="bg-blue-50 rounded-lg p-4 md:p-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-xs md:text-sm font-medium">Total</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">{userStats.total}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 md:p-6 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-xs md:text-sm font-medium">Confirmés</p>
                        <p className="text-xl md:text-2xl font-bold text-green-700 mt-1">{userStats.confirmed}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 md:p-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-xs md:text-sm font-medium">Terminés</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">{userStats.completed}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 md:p-6 border border-red-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-600 text-xs md:text-sm font-medium">Annulés</p>
                        <p className="text-xl md:text-2xl font-bold text-red-700 mt-1">{userStats.cancelled}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Résumé */}
                <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 md:mb-4">Résumé</h3>
                  <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Rendez-vous planifiés:</span>
                      <span className="font-semibold">{userStats.pending + userStats.confirmed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Taux d'annulation:</span>
                      <span className="font-semibold">
                        {userStats.total > 0 
                          ? `${((userStats.cancelled / userStats.total) * 100).toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Taux de complétion:</span>
                      <span className="font-semibold">
                        {userStats.total > 0 
                          ? `${((userStats.completed / userStats.total) * 100).toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historique des rendez-vous terminés et annulés */}
                <div className="space-y-4 md:space-y-6">
                  {/* Rendez-vous terminés */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={toggleCompletedHistory}
                      className="w-full flex justify-between items-center p-4 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">Rendez-vous terminés</h4>
                          <p className="text-xs md:text-sm text-gray-600">
                            {userStats.completed} rendez-vous - Cliquez pour {showCompletedHistory ? 'masquer' : 'afficher'}
                          </p>
                        </div>
                      </div>
                      {showCompletedHistory ? <EyeOff className="w-5 h-5 text-blue-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                    </button>
                    
                    {showCompletedHistory && (
                      <div className="p-4 border-t border-gray-200">
                        {isHistoryLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : (
                          renderRendezvousList(
                            completedRendezvous, 
                            "Aucun rendez-vous terminé pour le moment"
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rendez-vous annulés */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={toggleCancelledHistory}
                      className="w-full flex justify-between items-center p-4 bg-red-50 hover:bg-red-100 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">Rendez-vous annulés</h4>
                          <p className="text-xs md:text-sm text-gray-600">
                            {userStats.cancelled} rendez-vous - Cliquez pour {showCancelledHistory ? 'masquer' : 'afficher'}
                          </p>
                        </div>
                      </div>
                      {showCancelledHistory ? <EyeOff className="w-5 h-5 text-red-600" /> : <Eye className="w-5 h-5 text-red-600" />}
                    </button>
                    
                    {showCancelledHistory && (
                      <div className="p-4 border-t border-gray-200">
                        {isHistoryLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                          </div>
                        ) : (
                          renderRendezvousList(
                            cancelledRendezvous, 
                            "Aucun rendez-vous annulé pour le moment"
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-4">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune donnée</h3>
                <p className="text-gray-500">Vous n'avez aucun rendez-vous pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHistorique;