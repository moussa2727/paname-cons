import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, FileText, Home, XCircle, History, MapPin, AlertCircle, CheckCircle, MoreVertical } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
  destination: string;
  avisAdmin?: string;
  typeConsultation?: string;
  notes?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MesRendezVous = () => {
  const { user, isAuthenticated, token, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedRdv, setSelectedRdv] = useState<Rendezvous | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);

  // Vérification d'authentification au chargement
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié, redirection vers /connexion');
      navigate('/connexion');
      return;
    }
    
    if (user?.email) {
      console.log('✅ Utilisateur authentifié, chargement des rendez-vous...');
      fetchRendezvous();
    }
  }, [isAuthenticated, navigate, page, user]);

  const fetchRendezvous = async () => {
    if (!user?.email) {
      console.error('❌ Email utilisateur non disponible');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    console.log('📡 Début de la récupération des rendez-vous...');
    
    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        console.log('🔑 Utilisation du token pour fetch rendezvous:', currentToken?.substring(0, 20) + '...');
        return fetch(
          `${API_URL}/api/rendezvous/user?email=${encodeURIComponent(user.email)}&page=${page}&limit=6`,
          {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );
      };

      if (!token) {
        console.error('❌ Token non disponible');
        throw new Error('Token non disponible');
      }

      let response = await makeRequest(token);
      console.log('📡 Statut réponse rendezvous:', response.status);

      // Gestion du token expiré
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        if (refreshed) {
          console.log('✅ Token rafraîchi avec succès');
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('🔄 Nouvelle tentative avec le nouveau token...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      // Gestion des autres erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur HTTP:', response.status, errorData);
        throw new Error(errorData.message || 'Erreur lors de la récupération des rendez-vous');
      }
      
      // Traitement de la réponse réussie
      const data = await response.json();
      console.log('✅ Rendez-vous récupérés avec succès:', data.data?.length || 0, 'rendez-vous');
      
      setRendezvous(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / 6));
      
    } catch (error) {
      console.error('💥 Erreur fetchRendezvous:', error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide') ||
        error.message.includes('Token non disponible')
      )) {
        console.log('🔒 Session expirée, déconnexion...');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/connexion'), 2000);
      } else {
        // Affichage d'un message d'erreur générique
        toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }

    console.log('🗑️ Tentative d\'annulation du rendez-vous:', id);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        console.log('🔑 Utilisation du token pour annulation:', currentToken?.substring(0, 20) + '...');
        return fetch(`${API_URL}/api/rendezvous/${id}/cancel`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'Annulé' }),
          credentials: 'include'
        });
      };

      let response = await makeRequest(token);
      console.log('📡 Statut réponse annulation:', response.status);

      // Gestion du token expiré
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        if (refreshed) {
          console.log('✅ Token rafraîchi avec succès');
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('🔄 Nouvelle tentative d\'annulation avec le nouveau token...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      // Gestion des autres erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur HTTP annulation:', response.status, errorData);
        throw new Error(errorData.message || 'Erreur lors de l\'annulation du rendez-vous');
      }
      
      console.log('✅ Rendez-vous annulé avec succès');
      toast.success('Rendez-vous annulé avec succès');
      
      // Mise à jour optimiste de l'état local
      setRendezvous(prev => prev.map(rdv => 
        rdv._id === id ? { ...rdv, status: 'Annulé' } : rdv
      ));
      
    } catch (error) {
      console.error('💥 Erreur annulation rendez-vous:', error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide')
      )) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        // Affichage d'un message d'erreur générique
        toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
      }
    } finally {
      setConfirmId(null);
      setMobileMenuOpen(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.replace(':', 'h');
  };

  const canCancel = (rdv: Rendezvous) => {
    if (rdv.status === 'Annulé' || rdv.status === 'Terminé') return false;
    
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  };

  const getTimeRemainingMessage = (rdv: Rendezvous) => {
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 24 && hoursDiff > 0) {
      const minutesRemaining = Math.floor((timeDiff / (1000 * 60)) % 60);
      const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
      
      if (hoursRemaining > 0) {
        return `Annulation possible dans ${hoursRemaining}h ${minutesRemaining}min`;
      } else {
        return `Annulation possible dans ${minutesRemaining}min`;
      }
    }
    
    return null;
  };

  const getStatusConfig = (status: string) => {
    const config = {
      'Confirmé': { color: 'text-green-800 bg-green-100 border-green-200', icon: CheckCircle },
      'En attente': { color: 'text-yellow-800 bg-yellow-100 border-yellow-200', icon: Clock },
      'Terminé': { color: 'text-blue-800 bg-blue-100 border-blue-200', icon: CheckCircle },
      'Annulé': { color: 'text-red-800 bg-red-100 border-red-200', icon: XCircle }
    };
    return config[status as keyof typeof config] || config['En attente'];
  };

  const getStatusBadge = (status: string, avisAdmin?: string) => {
    const config = getStatusConfig(status);
    const IconComponent = config.icon;
    
    return (
      <div className="flex flex-col gap-2">
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}>
          <IconComponent className="w-3 h-3" />
          {status}
        </span>
        {avisAdmin && (
          <span className="px-2 py-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full">
            {avisAdmin}
          </span>
        )}
      </div>
    );
  };

  const isUpcoming = (rdv: Rendezvous) => {
    const now = new Date();
    const rdvDate = new Date(`${rdv.date}T${rdv.time}`);
    return rdvDate > now && rdv.status !== 'Annulé';
  };

  // Affichage du loading pendant la vérification d'authentification
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
          <p className="text-slate-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
          <>

           <Helmet>
            <title>Consultez vos  rendez-vous - Paname Consulting</title>
            <link rel="canonical" href="https://panameconsulting.vercel.app/user-rendezvous" />
            <meta name="robots" content="noindex, nofollow" />
          </Helmet>
           <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                {/* Navigation utilisateur améliorée */}
                <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                      <div className="flex items-center space-x-4 md:space-x-8">
                        <Link 
                          to="/" 
                          className="flex items-center text-sky-600 hover:text-sky-700 transition-colors group"
                        >
                          <div className="p-2 bg-sky-100 rounded-lg group-hover:bg-sky-200 transition-colors">
                            <Home className="w-5 h-5" />
                          </div>
                          <span className="ml-2 font-medium hidden sm:inline">Accueil</span>
                        </Link>
                        
                        <nav className="flex space-x-1 md:space-x-2">
                          {[
                            { to: '/user-profile', icon: User, label: 'Profil' },
                            { to: '/user-rendez-vous', icon: Calendar, label: 'Rendez-vous', active: true },
                            { to: '/user-procedure', icon: FileText, label: 'Procédures' },
                            { to: '/user-historique', icon: History, label: 'Historique' }
                          ].map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={`flex items-center px-3 py-2 rounded-xl transition-all duration-200 ${
                                item.active 
                                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
                              }`}
                            >
                              <item.icon className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline text-sm font-medium">{item.label}</span>
                            </Link>
                          ))}
                        </nav>
                      </div>
                      
                      <button
                        onClick={() => navigate('/rendez-vous')}
                        className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 font-semibold"
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden xs:inline">Nouveau RDV</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="py-8 px-4 sm:px-6 lg:px-8">
                  <div className="max-w-7xl mx-auto">
                    {/* En-tête amélioré */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4">
                        <Calendar className="w-8 h-8 text-sky-600" />
                      </div>
                      <h1 className="text-4xl font-bold text-slate-800 mb-3">Mes Rendez-vous</h1>
                      <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Gérez vos consultations et suivez l'état de vos rendez-vous en temps réel
                      </p>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {[
                        { label: 'Total', value: rendezvous.length, color: 'bg-blue-500' },
                        { label: 'À venir', value: rendezvous.filter(isUpcoming).length, color: 'bg-green-500' },
                        { label: 'Confirmés', value: rendezvous.filter(r => r.status === 'Confirmé').length, color: 'bg-sky-500' },
                        { label: 'En attente', value: rendezvous.filter(r => r.status === 'En attente').length, color: 'bg-yellow-500' }
                      ].map((stat, index) => (
                        <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                              <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Carte principale améliorée */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                      <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <div>
                            <h2 className="text-2xl font-bold text-slate-800">Rendez-vous programmés</h2>
                            <p className="text-slate-600 mt-1">Vos prochaines consultations avec nos experts</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => navigate('/user-historique')}
                              className="flex items-center gap-2 px-4 py-2.5 text-sky-600 hover:bg-sky-50 rounded-xl border border-sky-200 transition-colors font-medium"
                            >
                              <History className="w-4 h-4" />
                              <span>Historique complet</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {isLoading ? (
                        <div className="flex justify-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
                            <p className="text-slate-600">Chargement de vos rendez-vous...</p>
                          </div>
                        </div>
                      ) : rendezvous.length === 0 ? (
                        <div className="text-center py-16 px-6">
                          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-6">
                            <Calendar className="w-10 h-10" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Aucun rendez-vous programmé</h3>
                          <p className="text-slate-600 mb-8 max-w-md mx-auto">
                            Prenez votre premier rendez-vous pour discuter de votre projet d'études à l'étranger avec nos conseillers experts.
                          </p>
                          <button
                            onClick={() => navigate('/rendez-vous')}
                            className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            Prendre un rendez-vous
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-hidden">
                            {/* Version desktop améliorée */}
                            <div className="hidden lg:block">
                              <table className="w-full">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Date & Heure</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Destination</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {rendezvous.map(rdv => {
                                    const timeRemainingMessage = getTimeRemainingMessage(rdv);
                                    const statusConfig = getStatusConfig(rdv.status);
                                    const canCancelRdv = canCancel(rdv);
                                    
                                    return (
                                      <tr key={rdv._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                          <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center">
                                              <Calendar className="w-4 h-4 text-sky-600" />
                                              <span className="text-xs font-medium text-sky-600 mt-1">
                                                {new Date(rdv.date).getDate()}
                                              </span>
                                            </div>
                                            <div>
                                              <div className="font-semibold text-slate-800">{formatDate(rdv.date)}</div>
                                              <div className="flex items-center gap-1 text-slate-600 text-sm mt-1">
                                                <Clock className="w-4 h-4" />
                                                {formatTime(rdv.time)}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-5">
                                          <div className="flex items-center gap-2 text-slate-700">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            {rdv.destination}
                                          </div>
                                        </td>
                                        <td className="px-6 py-5">
                                          <span className="text-slate-600">{rdv.typeConsultation || 'Consultation standard'}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                          {getStatusBadge(rdv.status, rdv.avisAdmin)}
                                        </td>
                                        <td className="px-6 py-5">
                                          <div className="flex items-center gap-3">
                                            {(rdv.status === 'En attente' || rdv.status === 'Confirmé') && (
                                              <>
                                                <button
                                                  onClick={() => canCancelRdv ? setConfirmId(rdv._id) : toast.info('Annulation possible jusqu\'à 24h avant le rendez-vous')}
                                                  disabled={!canCancelRdv}
                                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    canCancelRdv 
                                                      ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300' 
                                                      : 'text-slate-400 cursor-not-allowed border border-slate-200'
                                                  }`}
                                                >
                                                  <XCircle className="w-4 h-4" />
                                                  Annuler
                                                </button>
                                                {timeRemainingMessage && (
                                                  <div className="flex items-center gap-1 text-xs text-amber-600 max-w-[180px]">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {timeRemainingMessage}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            <button
                                              onClick={() => setSelectedRdv(rdv)}
                                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Version mobile améliorée */}
                            <div className="lg:hidden">
                              <div className="divide-y divide-slate-100">
                                {rendezvous.map(rdv => {
                                  const timeRemainingMessage = getTimeRemainingMessage(rdv);
                                  const canCancelRdv = canCancel(rdv);
                                  const statusConfig = getStatusConfig(rdv.status);
                                  
                                  return (
                                    <div key={rdv._id} className="p-6 hover:bg-slate-50/50 transition-colors">
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex-shrink-0 w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center">
                                            <Calendar className="w-4 h-4 text-sky-600" />
                                            <span className="text-xs font-medium text-sky-600 mt-1">
                                              {new Date(rdv.date).getDate()}
                                            </span>
                                          </div>
                                          <div>
                                            <div className="font-semibold text-slate-800 text-sm">
                                              {formatDate(rdv.date)}
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-600 text-xs mt-1">
                                              <Clock className="w-3 h-3" />
                                              {formatTime(rdv.time)}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(rdv.status, rdv.avisAdmin)}
                                          <button
                                            onClick={() => setMobileMenuOpen(mobileMenuOpen === rdv._id ? null : rdv._id)}
                                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-600">
                                          <MapPin className="w-4 h-4 text-slate-400" />
                                          <span className="text-sm">{rdv.destination}</span>
                                        </div>
                                        
                                        <div className="text-sm text-slate-600">
                                          <span className="font-medium">Type:</span> {rdv.typeConsultation || 'Consultation standard'}
                                        </div>
                                      </div>
                                      
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        {(rdv.status === 'En attente' || rdv.status === 'Confirmé') && (
                                          <div className="flex flex-col gap-3">
                                            <button
                                              onClick={() => canCancelRdv ? setConfirmId(rdv._id) : toast.info('Annulation possible jusqu\'à 24h avant le rendez-vous')}
                                              disabled={!canCancelRdv}
                                              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                canCancelRdv 
                                                  ? 'text-red-600 hover:bg-red-50 border border-red-200' 
                                                  : 'text-slate-400 cursor-not-allowed border border-slate-200'
                                              }`}
                                            >
                                              <XCircle className="w-4 h-4" />
                                              Annuler le rendez-vous
                                            </button>
                                            {timeRemainingMessage && (
                                              <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                                                <AlertCircle className="w-3 h-3" />
                                                {timeRemainingMessage}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Pagination améliorée */}
                          {totalPages > 1 && (
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setPage(p => Math.max(1, p - 1))}
                                  disabled={page === 1}
                                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white rounded-xl border border-slate-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  <span>Précédent</span>
                                </button>
                                
                                <div className="flex items-center gap-2">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                      key={pageNum}
                                      onClick={() => setPage(pageNum)}
                                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                        page === pageNum
                                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  ))}
                                </div>
                                
                                <button
                                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                  disabled={page === totalPages}
                                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white rounded-xl border border-slate-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                  <span>Suivant</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal de confirmation d'annulation amélioré */}
                {confirmId && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmer l'annulation</h3>
                      <p className="text-slate-600 mb-6">
                        Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible et vous ne pourrez plus modifier cette décision.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <button 
                          onClick={() => setConfirmId(null)} 
                          className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium order-2 sm:order-1"
                        >
                          Conserver
                        </button>
                        <button 
                          onClick={() => handleCancel(confirmId)} 
                          className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-200 order-1 sm:order-2"
                        >
                          Confirmer l'annulation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal de détails */}
                {selectedRdv && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-slate-800">Détails du rendez-vous</h3>
                        <button 
                          onClick={() => setSelectedRdv(null)} 
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{formatDate(selectedRdv.date)}</p>
                            <p className="text-slate-600 text-sm">{formatTime(selectedRdv.time)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">Destination</p>
                            <p className="text-slate-600 text-sm">{selectedRdv.destination}</p>
                          </div>
                        </div>
                        
                        {selectedRdv.notes && (
                          <div>
                            <p className="font-medium text-slate-700 mb-2">Notes supplémentaires</p>
                            <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg">{selectedRdv.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
           </div>
          </> 
  );
};

export default MesRendezVous;