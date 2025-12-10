// [file name]: MesRendezVous.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  GraduationCap, 
  XCircle, 
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  User,
  Plus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useRendezvous } from '../../../api/user/Rendezvous/MesRendezVous';

// Types pour les filtres
type RendezvousStatus = 'Tous' | 'Confirmé' | 'En attente' | 'Terminé' | 'Annulé';

const MesRendezVous: React.FC = () => {
  // Service rendez-vous
  const { 
    getUserRendezvous, 
    getRendezvousById, 
    cancelRendezvous,
    currentUser 
  } = useRendezvous();

  // États
  const [rendezvousList, setRendezvousList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRendezvous, setSelectedRendezvous] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [rendezvousToCancel, setRendezvousToCancel] = useState<string | null>(null);

  // États pour la pagination et filtres
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<RendezvousStatus>('Tous');
  
  // Références pour éviter les appels multiples
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Charger les rendez-vous
   */
  const loadRendezvous = useCallback(async (forceRefresh: boolean = false) => {
    // Empêcher les appels multiples
    if (isFetchingRef.current && !forceRefresh) {
      console.log('⏳ Fetch déjà en cours');
      return;
    }

    // Attendre au moins 1 seconde entre les requêtes
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000 && !forceRefresh) {
      console.log('⏳ Trop tôt pour requête');
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    if (!initialLoad) {
      setLoading(true);
    }
    
    setError(null);

    try {
      console.log('📡 Chargement des rendez-vous...');

      const response = await getUserRendezvous(
        currentPage,
        itemsPerPage,
        statusFilter === 'Tous' ? undefined : statusFilter
      );
      
      console.log('✅ Réponse reçue:', {
        dataCount: response.data.length,
        total: response.total
      });
      
      // Mettre à jour l'état
      setRendezvousList(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
      
      // Marquer le chargement initial comme terminé
      if (initialLoad) {
        setInitialLoad(false);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement:', error);
      
      // Ne pas afficher d'erreur pour les cas normaux
      if (!error.message.includes('Trop de requêtes') && 
          !error.message.includes('Veuillez patienter')) {
        setError('Impossible de charger les rendez-vous');
      }
      
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [getUserRendezvous, currentPage, itemsPerPage, statusFilter, initialLoad]);

  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Chargement initial (pas de délai)
  useEffect(() => {
    console.log('🚀 Initialisation du composant MesRendezVous');
    loadRendezvous();
  }, []);

  // Recharger quand les filtres changent
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCurrentPage(1); // Toujours revenir à la première page
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [statusFilter, itemsPerPage]);

  // Recharger quand la page change
  useEffect(() => {
    if (currentPage === 1 && initialLoad) return; // Éviter double appel initial
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      loadRendezvous();
    }, 200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentPage]);

  // Formater la date en français
  const formatDate = (dateString: string, timeString?: string): string => {
    try {
      const date = parseISO(dateString);
      let formatted = format(date, 'EEEE d MMMM yyyy', { locale: fr });
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      
      if (timeString) {
        const [hours, minutes] = timeString.split(':');
        formatted += ` à ${hours}h${minutes}`;
      }
      
      return formatted;
    } catch (error) {
      console.warn('⚠️ Erreur de formatage de date:', error);
      return dateString;
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Confirmé': return 'bg-green-100 text-green-800 border border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Terminé': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Annulé': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmé': return <CheckCircle className="w-4 h-4" />;
      case 'En attente': return <Clock className="w-4 h-4" />;
      case 'Terminé': return <AlertCircle className="w-4 h-4" />;
      case 'Annulé': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Vérifier si un rendez-vous peut être annulé
  const canCancel = (rdv: any): boolean => {
    return rdv?.status === 'Confirmé';
  };

  // Gérer le clic sur "Voir détails"
  const handleViewDetails = async (id: string) => {
    try {
      const rdv = await getRendezvousById(id);
      setSelectedRendezvous(rdv);
      setShowDetailsModal(true);
    } catch (error: any) {
      console.error('Erreur récupération détails:', error);
      if (!error.message.includes('Veuillez patienter')) {
        toast.error('Impossible de charger les détails', { 
          autoClose: 3000,
          position: 'top-right'
        });
      }
    }
  };

  // Gérer le clic sur "Annuler"
  const handleCancelClick = (id: string) => {
    setRendezvousToCancel(id);
    setShowCancelModal(true);
  };

  // Confirmer l'annulation
  const confirmCancellation = async () => {
    if (!rendezvousToCancel) return;
    
    try {
      await cancelRendezvous(rendezvousToCancel);
      
      // Recharger la liste après un court délai
      setTimeout(() => {
        loadRendezvous(true);
      }, 500);
      
      setShowCancelModal(false);
      setRendezvousToCancel(null);
    } catch (error: any) {
      console.error('Erreur annulation:', error);
    }
  };

  // Gérer la pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Calculer la plage d'affichage
  const getDisplayRange = () => {
    const start = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return { start, end };
  };

  const { start, end } = getDisplayRange();

  // ==================== RENDU ====================

  // État de chargement initial
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-900 mb-2">
              Mes Rendez-vous
            </h1>
            <p className="text-sky-600">Gestion de vos rendez-vous</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mb-4"></div>
            <p className="text-sky-600">Chargement de vos rendez-vous...</p>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-900 mb-2">
              Mes Rendez-vous
            </h1>
          </div>
          
          <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 border border-red-200 shadow-sm">
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-red-800 mb-2">
                Erreur de chargement
              </h3>
              <p className="text-red-600 mb-6 text-center max-w-md">
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setInitialLoad(true);
                    loadRendezvous(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg"
                >
                  <RefreshCw className="w-4 h-4 inline-block mr-2" />
                  Réessayer
                </button>
                <button
                  onClick={() => window.location.href = '/rendezvous/nouveau'}
                  className="px-6 py-3 bg-white text-sky-700 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors"
                >
                  Prendre un rendez-vous
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État vide (pas de données)
  if (!loading && rendezvousList.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-sky-900 mb-2">
                  Mes Rendez-vous
                </h1>
                <p className="text-sky-600">Gestion de vos rendez-vous</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadRendezvous(true)}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${loading
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Actualisation...' : 'Actualiser'}
                </button>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl p-4 md:p-6 mb-6 border border-sky-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-sky-800 mb-2">
                  Filtrer par statut
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Tous', 'Confirmé', 'En attente', 'Terminé', 'Annulé'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as RendezvousStatus)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                        ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* État vide */}
          <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 border border-sky-100 shadow-lg">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 md:w-24 md:h-24 bg-sky-100 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-10 h-10 md:w-12 md:h-12 text-sky-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-sky-900 mb-3">
                {statusFilter === 'Tous' 
                  ? 'Aucun rendez-vous pour le moment'
                  : `Aucun rendez-vous avec le statut "${statusFilter}"`}
              </h3>
              <p className="text-sky-600 mb-8 max-w-md mx-auto">
                {statusFilter === 'Tous' 
                  ? 'Créez votre premier rendez-vous pour commencer.'
                  : 'Essayez avec un autre filtre ou créez un nouveau rendez-vous.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {statusFilter !== 'Tous' && (
                  <button
                    onClick={() => setStatusFilter('Tous')}
                    className="px-6 py-3 bg-white text-sky-700 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors"
                  >
                    Voir tous les rendez-vous
                  </button>
                )}
                <button
                  onClick={() => window.location.href = '/rendezvous/nouveau'}
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Prendre un rendez-vous
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État normal (avec données)
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-sky-900 mb-2">
                Mes Rendez-vous
              </h1>
              <p className="text-sky-600">
                {totalItems} rendez-vous trouvés • Page {currentPage}/{totalPages}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadRendezvous(true)}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${loading
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'}`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualisation...' : 'Actualiser'}
              </button>
              <button
                onClick={() => window.location.href = '/rendezvous/nouveau'}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Nouveau rendez-vous
              </button>
            </div>
          </div>
        </div>

        {/* Filtres et pagination */}
        <div className="bg-white rounded-xl p-4 md:p-6 mb-6 border border-sky-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-sky-800 mb-2">
                Filtrer par statut
              </label>
              <div className="flex flex-wrap gap-2">
                {['Tous', 'Confirmé', 'En attente', 'Terminé', 'Annulé'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as RendezvousStatus)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-sky-800 mb-2">
                  Affichage
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  disabled={loading}
                  className={`bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value={5}>5 par page</option>
                  <option value={10}>10 par page</option>
                  <option value={20}>20 par page</option>
                </select>
              </div>
              
              {totalPages > 1 && (
                <div>
                  <label className="block text-sm font-medium text-sky-800 mb-2">
                    Page
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className={`p-2 rounded-lg ${currentPage === 1 || loading
                        ? 'text-sky-300 cursor-not-allowed'
                        : 'text-sky-600 hover:bg-sky-50 border border-sky-200'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <span className="px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sky-700">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className={`p-2 rounded-lg ${currentPage === totalPages || loading
                        ? 'text-sky-300 cursor-not-allowed'
                        : 'text-sky-600 hover:bg-sky-50 border border-sky-200'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des rendez-vous - Version mobile */}
        <div className="md:hidden space-y-4 mb-6">
          {rendezvousList.map((rdv) => (
            <div key={rdv._id} className="bg-white rounded-xl p-4 border border-sky-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-semibold text-sky-900">
                    {formatDate(rdv.date)}
                  </div>
                  <div className="text-sky-600 text-sm mt-1">
                    {rdv.time}
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(rdv.status)} flex items-center gap-2`}>
                  {getStatusIcon(rdv.status)}
                  {rdv.status}
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-sky-600 mb-1">Destination</div>
                    <div className="font-medium text-sky-800">{rdv.destination}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-sky-600 mb-1">Filière</div>
                    <div className="font-medium text-sky-800">{rdv.filiere}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-sky-600 mb-1">Niveau d'étude</div>
                    <div className="font-medium text-sky-800">{rdv.niveauEtude}</div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-sky-200 flex gap-3">
                <button
                  onClick={() => handleViewDetails(rdv._id)}
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-colors border ${loading
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'}`}
                >
                  <Eye className="w-4 h-4 inline-block mr-2" />
                  Détails
                </button>
                {canCancel(rdv) && (
                  <button
                    onClick={() => handleCancelClick(rdv._id)}
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-lg font-medium transition-colors border ${loading
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'}`}
                  >
                    <Trash2 className="w-4 h-4 inline-block mr-2" />
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Liste des rendez-vous - Version desktop */}
        <div className="hidden md:block bg-white rounded-xl border border-sky-200 overflow-hidden shadow-sm mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                <tr>
                  <th className="p-4 text-left text-sky-800 font-semibold">Date et Heure</th>
                  <th className="p-4 text-left text-sky-800 font-semibold">Destination</th>
                  <th className="p-4 text-left text-sky-800 font-semibold">Filière</th>
                  <th className="p-4 text-left text-sky-800 font-semibold">Niveau</th>
                  <th className="p-4 text-left text-sky-800 font-semibold">Statut</th>
                  <th className="p-4 text-left text-sky-800 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rendezvousList.map((rdv, index) => (
                  <tr 
                    key={rdv._id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-sky-50/30'} hover:bg-sky-100/50 border-t border-sky-100`}
                  >
                    <td className="p-4">
                      <div className="font-medium text-sky-900">{formatDate(rdv.date)}</div>
                      <div className="text-sky-600 text-sm mt-1">{rdv.time}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sky-800 font-medium">{rdv.destination}</div>
                      {rdv.destinationAutre && (
                        <div className="text-sky-600 text-sm mt-1">{rdv.destinationAutre}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sky-800">{rdv.filiere}</div>
                      {rdv.filiereAutre && (
                        <div className="text-sky-600 text-sm mt-1">{rdv.filiereAutre}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sky-800">{rdv.niveauEtude}</div>
                    </td>
                    <td className="p-4">
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(rdv.status)} flex items-center gap-2 justify-center max-w-[150px]`}>
                        {getStatusIcon(rdv.status)}
                        {rdv.status}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(rdv._id)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border ${loading
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'}`}
                        >
                          <Eye className="w-4 h-4" />
                          Détails
                        </button>
                        {canCancel(rdv) && (
                          <button
                            onClick={() => handleCancelClick(rdv._id)}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border ${loading
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination complète */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-sky-600 text-sm">
              Affichage de {start} à {end} sur {totalItems} rendez-vous
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || loading}
                className={`px-3 py-1.5 rounded-lg ${currentPage === 1 || loading
                  ? 'text-sky-300 cursor-not-allowed'
                  : 'text-sky-700 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                Première
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className={`p-2 rounded-lg ${currentPage === 1 || loading
                  ? 'text-sky-300 cursor-not-allowed'
                  : 'text-sky-600 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Pages numériques */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={`w-10 h-10 rounded-lg font-medium ${currentPage === pageNum
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow'
                      : 'text-sky-700 hover:bg-sky-50 border border-sky-200'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className={`p-2 rounded-lg ${currentPage === totalPages || loading
                  ? 'text-sky-300 cursor-not-allowed'
                  : 'text-sky-600 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || loading}
                className={`px-3 py-1.5 rounded-lg ${currentPage === totalPages || loading
                  ? 'text-sky-300 cursor-not-allowed'
                  : 'text-sky-700 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                Dernière
              </button>
            </div>
          </div>
        )}

        {/* Modal de détails */}
        {showDetailsModal && selectedRendezvous && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-sky-900">
                    Détails du rendez-vous
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-sky-400 hover:text-sky-600 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations principales */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 md:p-6 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sky-900 text-lg md:text-xl">
                            {formatDate(selectedRendezvous.date, selectedRendezvous.time)}
                          </h4>
                          <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-medium inline-block ${getStatusColor(selectedRendezvous.status)}`}>
                            {selectedRendezvous.status}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-sky-50 p-4 md:p-6 rounded-xl">
                      <h5 className="font-semibold text-sky-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-sky-600" />
                        Informations personnelles
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-sky-600 mb-1">Nom complet</div>
                          <div className="font-medium text-sky-900">
                            {selectedRendezvous.firstName} {selectedRendezvous.lastName}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-sky-600 mb-1">Email</div>
                          <div className="font-medium text-sky-900">
                            {selectedRendezvous.email}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-sky-600 mb-1">Téléphone</div>
                          <div className="font-medium text-sky-900">
                            {selectedRendezvous.telephone}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-sky-600 mb-1">Niveau d'étude</div>
                          <div className="font-medium text-sky-900">
                            {selectedRendezvous.niveauEtude}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informations académiques et destination */}
                  <div className="space-y-6">
                    <div className="bg-sky-50 p-4 md:p-6 rounded-xl">
                      <h5 className="font-semibold text-sky-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-sky-600" />
                        Destination
                      </h5>
                      <div className="font-medium text-sky-900 text-lg mb-2">
                        {selectedRendezvous.effectiveDestination || selectedRendezvous.destination}
                      </div>
                      {selectedRendezvous.destinationAutre && (
                        <div className="text-sky-600">
                          <span className="text-sm text-sky-500">Précision: </span>
                          {selectedRendezvous.destinationAutre}
                        </div>
                      )}
                    </div>

                    <div className="bg-sky-50 p-4 md:p-6 rounded-xl">
                      <h5 className="font-semibold text-sky-800 mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-sky-600" />
                        Filière
                      </h5>
                      <div className="font-medium text-sky-900 text-lg mb-2">
                        {selectedRendezvous.effectiveFiliere || selectedRendezvous.filiere}
                      </div>
                      {selectedRendezvous.filiereAutre && (
                        <div className="text-sky-600">
                          <span className="text-sm text-sky-500">Précision: </span>
                          {selectedRendezvous.filiereAutre}
                        </div>
                      )}
                    </div>

                    {selectedRendezvous.avisAdmin && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl border border-blue-200">
                        <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600" />
                          Avis administratif
                        </h5>
                        <div className={`px-4 py-3 rounded-lg font-medium ${selectedRendezvous.avisAdmin === 'Favorable' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'}`}>
                          {selectedRendezvous.avisAdmin}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-sky-200 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-3 bg-white text-sky-700 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors font-medium"
                  >
                    Fermer
                  </button>
                  {canCancel(selectedRendezvous) && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleCancelClick(selectedRendezvous._id);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg"
                    >
                      Annuler ce rendez-vous
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation d'annulation */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-sky-900 mb-2">
                    Confirmer l'annulation
                  </h3>
                  <p className="text-sky-600">
                    Êtes-vous sûr de vouloir annuler ce rendez-vous ? 
                    Cette action est irréversible.
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setRendezvousToCancel(null);
                    }}
                    className="px-6 py-2.5 bg-white text-sky-700 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors font-medium"
                  >
                    Non, garder
                  </button>
                  <button
                    onClick={confirmCancellation}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium"
                  >
                    Oui, annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MesRendezVous;