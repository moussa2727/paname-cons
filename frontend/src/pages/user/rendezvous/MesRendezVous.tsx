import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, FileText, Home, XCircle, MapPin, AlertCircle, CheckCircle, MoreVertical } from 'lucide-react';
import { RendezvousService, Rendezvous } from '../../../api/user/Rendezvous/MesRendezVous';

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
  const [hasFetched, setHasFetched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Vérification d'authentification au chargement
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié');
      setIsLoading(false);
      return;
    }
    
    if (user?.email && !hasFetched) {
      console.log('✅ Utilisateur authentifié, chargement des rendez-vous...');
      fetchRendezvous();
    }
  }, [isAuthenticated, user, page, hasFetched, statusFilter]);

  const fetchRendezvous = async () => {
    if (!user?.email || !token) {
      console.error('❌ Email utilisateur ou token non disponible');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await RendezvousService.getUserRendezvous(
        user.email, 
        page, 
        6, 
        statusFilter, // ← 4ème paramètre : statusFilter (string)
        token,        // ← 5ème paramètre : token (string)
        refreshToken  // ← 6ème paramètre : refreshToken (function)
      );
      
      setRendezvous(response.data);
      setTotalPages(response.totalPages);
      setHasFetched(true);
      
    } catch (error) {
      console.error('💥 Erreur fetchRendezvous:', error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide') ||
        error.message.includes('Token non disponible')
      )) {
        console.log('🔒 Session expirée');
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        // Affichage d'un message d'erreur générique
        toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }

    console.log('✅ Tentative de confirmation du rendez-vous:', id);

    try {
      await RendezvousService.confirmRendezvous(id, token, refreshToken);
      
      toast.success('Rendez-vous confirmé avec succès');
      
      // Mise à jour optimiste de l'état local
      setRendezvous(prev => prev.map(rdv => 
        rdv._id === id ? { ...rdv, status: 'Confirmé' } : rdv
      ));
      
      // Recharger les données pour s'assurer de la synchronisation
      fetchRendezvous();
      
    } catch (error) {
      console.error('💥 Erreur confirmation rendez-vous:', error);
      
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
      setMobileMenuOpen(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }

    console.log('🗑️ Tentative d\'annulation du rendez-vous:', id);

    try {
      await RendezvousService.cancelRendezvous(id, token, refreshToken);
      
      toast.success('Rendez-vous annulé avec succès');
      
      // Mise à jour optimiste de l'état local
      setRendezvous(prev => prev.map(rdv => 
        rdv._id === id ? { ...rdv, status: 'Annulé' } : rdv
      ));
      
      // Recharger les données pour s'assurer de la synchronisation
      fetchRendezvous();
      
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

  // Fonction pour gérer le clic sur annuler
  const handleCancelClick = (rdv: Rendezvous) => {
    if (!RendezvousService.canCancelRendezvous(rdv)) {
      const message = RendezvousService.getTimeRemainingMessage(rdv) || 'Annulation impossible pour ce rendez-vous';
      toast.info(message);
      return;
    }
    setConfirmId(rdv._id);
  };

  const getStatusBadge = (status: string, avisAdmin?: string) => {
    const config = RendezvousService.getStatusConfig(status);
    const IconComponent = config.icon === 'CheckCircle' ? CheckCircle : 
                         config.icon === 'Clock' ? Clock : XCircle;
    
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
    return RendezvousService.isUpcoming(rdv);
  };

  // Affichage du loading pendant la vérification d'authentification
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header uniformisé */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Home className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-800">Mes Rendez-vous</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Sélecteur de filtre par statut */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="En attente">En attente</option>
                <option value="Confirmé">Confirmé</option>
                <option value="Terminé">Terminé</option>
                <option value="Annulé">Annulé</option>
              </select>

              <button
                onClick={() => fetchRendezvous()}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <svg className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation uniformisée */}
          <div className="mt-3">
            <nav className="flex space-x-1">
              {[
                { id: 'profile', label: 'Profil', to: '/user-profile', icon: User },
                { id: 'rendezvous', label: 'Rendez-vous', to: '/user-rendez-vous', icon: Calendar, active: true },
                { id: 'procedures', label: 'Procédures', to: '/user-procedure', icon: FileText }
              ].map((tab) => (
                <Link
                  key={tab.id}
                  to={tab.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab.active
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-500'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* En-tête amélioré */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Gérez vos consultations et suivez l'état de vos rendez-vous en temps réel
            </p>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: rendezvous.length, color: 'bg-blue-500' },
              { label: 'À venir', value: rendezvous.filter(isUpcoming).length, color: 'bg-green-500' },
              { label: 'Confirmés', value: rendezvous.filter(r => r.status === 'Confirmé').length, color: 'bg-blue-500' },
              { label: 'En attente', value: rendezvous.filter(r => r.status === 'En attente').length, color: 'bg-yellow-500' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Carte principale améliorée */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Rendez-vous programmés</h2>
                  <p className="text-gray-600 mt-1">
                    Vos prochaines consultations avec nos experts
                  </p>
                </div>
                <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>⚠️ Règles d'annulation :</strong> Possible jusqu'à 2 heures avant le rendez-vous
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-600">Chargement de vos rendez-vous...</p>
                </div>
              </div>
            ) : rendezvous.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-6">
                  <Calendar className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Aucun rendez-vous programmé</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Prenez votre premier rendez-vous pour discuter de votre projet d'études à l'étranger avec nos conseillers experts.
                </p>
                <button
                  onClick={() => navigate('/rendez-vous')}
                  className="px-8 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
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
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Date & Heure</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Destination</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rendezvous.map(rdv => {
                          const timeRemainingMessage = RendezvousService.getTimeRemainingMessage(rdv);
                          const canCancelRdv = RendezvousService.canCancelRendezvous(rdv);
                          
                          return (
                            <tr key={rdv._id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-600 mt-1">
                                      {new Date(rdv.date).getDate()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-800">{RendezvousService.formatDate(rdv.date)}</div>
                                    <div className="flex items-center gap-1 text-gray-600 text-sm mt-1">
                                      <Clock className="w-4 h-4" />
                                      {RendezvousService.formatTime(rdv.time)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  {rdv.destination}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-gray-600">{rdv.typeConsultation || 'Consultation standard'}</span>
                              </td>
                              <td className="px-6 py-5">
                                {getStatusBadge(rdv.status, rdv.avisAdmin)}
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  {/* ACTIONS POUR L'UTILISATEUR - CONFIRMATION ET ANNULATION */}
                                  {rdv.status === 'En attente' && (
                                    <>
                                      <button
                                        onClick={() => handleConfirm(rdv._id)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-green-600 hover:bg-green-50 border border-green-200 hover:border-green-300"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Confirmer
                                      </button>
                                      
                                      <button
                                        onClick={() => handleCancelClick(rdv)}
                                        disabled={!canCancelRdv}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                          canCancelRdv 
                                            ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300' 
                                            : 'text-gray-400 cursor-not-allowed border border-gray-200'
                                        }`}
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Annuler
                                      </button>
                                      
                                      {/* MESSAGE TEMPS RESTANT */}
                                      {!canCancelRdv && (
                                        <div className="flex items-center gap-1 text-xs text-amber-600 max-w-[180px]">
                                          <AlertCircle className="w-3 h-3" />
                                          {timeRemainingMessage || 'Annulation impossible'}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {(rdv.status === 'Confirmé') && (
                                    <>
                                      <button
                                        onClick={() => handleCancelClick(rdv)}
                                        disabled={!canCancelRdv}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                          canCancelRdv 
                                            ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300' 
                                            : 'text-gray-400 cursor-not-allowed border border-gray-200'
                                        }`}
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Annuler
                                      </button>
                                      
                                      {/* MESSAGE TEMPS RESTANT */}
                                      {!canCancelRdv && (
                                        <div className="flex items-center gap-1 text-xs text-amber-600 max-w-[180px]">
                                          <AlertCircle className="w-3 h-3" />
                                          {timeRemainingMessage || 'Annulation impossible'}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  <button
                                    onClick={() => setSelectedRdv(rdv)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                    <div className="divide-y divide-gray-100">
                      {rendezvous.map(rdv => {
                        const timeRemainingMessage = RendezvousService.getTimeRemainingMessage(rdv);
                        const canCancelRdv = RendezvousService.canCancelRendezvous(rdv);
                        
                        return (
                          <div key={rdv._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs font-medium text-blue-600 mt-1">
                                    {new Date(rdv.date).getDate()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {RendezvousService.formatDate(rdv.date)}
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-600 text-xs mt-1">
                                    <Clock className="w-3 h-3" />
                                    {RendezvousService.formatTime(rdv.time)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getStatusBadge(rdv.status, rdv.avisAdmin)}
                                <button
                                  onClick={() => setMobileMenuOpen(mobileMenuOpen === rdv._id ? null : rdv._id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{rdv.destination}</span>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {rdv.typeConsultation || 'Consultation standard'}
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {/* ACTIONS POUR L'UTILISATEUR - VERSION MOBILE */}
                              {rdv.status === 'En attente' && (
                                <div className="flex flex-col gap-3">
                                  <button
                                    onClick={() => handleConfirm(rdv._id)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-green-600 hover:bg-green-50 border border-green-200"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Confirmer le rendez-vous
                                  </button>
                                  
                                  <button
                                    onClick={() => handleCancelClick(rdv)}
                                    disabled={!canCancelRdv}
                                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                      canCancelRdv 
                                        ? 'text-red-600 hover:bg-red-50 border border-red-200' 
                                        : 'text-gray-400 cursor-not-allowed border border-gray-200'
                                    }`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Annuler le rendez-vous
                                  </button>
                                  
                                  {/* MESSAGE TEMPS RESTANT */}
                                  {!canCancelRdv && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                                      <AlertCircle className="w-3 h-3" />
                                      {timeRemainingMessage || 'Annulation impossible'}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {(rdv.status === 'Confirmé') && (
                                <div className="flex flex-col gap-3">
                                  <button
                                    onClick={() => handleCancelClick(rdv)}
                                    disabled={!canCancelRdv}
                                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                      canCancelRdv 
                                        ? 'text-red-600 hover:bg-red-50 border border-red-200' 
                                        : 'text-gray-400 cursor-not-allowed border border-gray-200'
                                    }`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Annuler le rendez-vous
                                  </button>
                                  
                                  {/* MESSAGE TEMPS RESTANT */}
                                  {!canCancelRdv && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                                      <AlertCircle className="w-3 h-3" />
                                      {timeRemainingMessage || 'Annulation impossible'}
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
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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

      {/* Modal de confirmation d'annulation */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmer l'annulation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.
              <span className="block mt-2 text-sm text-amber-600">
                ⚠️ L'annulation n'est possible que jusqu'à 2 heures avant le rendez-vous.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => setConfirmId(null)} 
                className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium order-2 sm:order-1"
              >
                Conserver
              </button>
              <button 
                onClick={() => handleCancel(confirmId)} 
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-sm order-1 sm:order-2"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {selectedRdv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">Détails du rendez-vous</h3>
              <button 
                onClick={() => setSelectedRdv(null)} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{RendezvousService.formatDate(selectedRdv.date)}</p>
                  <p className="text-gray-600 text-sm">{RendezvousService.formatTime(selectedRdv.time)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Destination</p>
                  <p className="text-gray-600 text-sm">{selectedRdv.destination}</p>
                </div>
              </div>
              
              {selectedRdv.notes && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Notes supplémentaires</p>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{selectedRdv.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesRendezVous;