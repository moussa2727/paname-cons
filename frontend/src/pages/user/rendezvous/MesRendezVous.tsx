// MesRendezvous.tsx - VERSION SIMPLIFIÉE ET SÉCURISÉE
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiBook,
  FiAward,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiInfo,
  FiStar,
  FiFilter,
} from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { Home, RefreshCw, User, Calendar, FileText } from 'lucide-react';
import { 
  UserRendezvousService, 
  Rendezvous, 
  PaginationState,
  AuthFunctions 
} from '../../../api/user/Rendezvous/UserRendezvousService';

// Composant de chargement
const LoadingScreen = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

const pageConfigs = {
  '/mon-profil': {
    title: 'Mon Profil',
    subtitle: 'Gérez vos informations personnelles',
    pageTitle: 'Mon Profil - Paname Consulting',
    description: 'Gérez vos informations personnelles avec Paname Consulting'
  },
  '/mes-rendez-vous': {
    title: 'Mes Rendez-vous',
    subtitle: 'Consultez et gérez vos rendez-vous',
    pageTitle: 'Mes Rendez-vous - Paname Consulting',
    description: 'Consultez et gérez vos rendez-vous avec Paname Consulting'
  },
  '/ma-procedure': {
    title: 'Ma Procédure',
    subtitle: 'Suivez l\'avancement de votre dossier',
    pageTitle: 'Ma Procédure - Paname Consulting',
    description: 'Suivez l\'avancement de votre dossier avec Paname Consulting'
  },
};

const navTabs = [
  {
    id: 'profile',
    label: 'Profil',
    to: '/mon-profil',
    icon: User,
  },
  {
    id: 'rendezvous',
    label: 'RDV',
    to: '/mes-rendez-vous',
    icon: Calendar,
  },
  {
    id: 'procedures',
    label: 'Dossier',
    to: '/ma-procedure',
    icon: FileText,
  },
];

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'En attente', label: 'En attente' },
  { value: 'Confirmé', label: 'Confirmé' },
  { value: 'Terminé', label: 'Terminé' },
  { value: 'Annulé', label: 'Annulé' },
];

const statusColors: Record<string, string> = {
  'En attente': 'bg-amber-100 text-amber-800 border-amber-300',
  'Confirmé': 'bg-sky-100 text-sky-800 border-sky-300',
  'Terminé': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Annulé': 'bg-red-100 text-red-800 border-red-300',
};

const avisColors: Record<string, string> = {
  'Favorable': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Défavorable': 'bg-red-100 text-red-800 border-red-300',
};

const MesRendezvous = () => {
  const { 
    user,
    access_token,  
    refreshToken, 
    logout,
    fetchWithAuth,
    isLoading: authLoading,
    updateProfile,
    isAuthenticated
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // === VÉRIFICATION DE SESSION SIMPLIFIÉE ===
  useEffect(() => {
    if (!authLoading && !isAuthenticated && location.pathname !== '/connexion') {
      console.log('🔒 Session non valide, redirection vers /connexion');
      navigate('/connexion', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, location.pathname]);

  if (authLoading) {
    return <LoadingScreen message="Chargement de l'authentification..." />;
  }

  if (!user || !isAuthenticated) {
    return <LoadingScreen message="Redirection vers la connexion..." />;
  }

  // Créer l'objet authFunctions pour passer au service
  const authFunctions: AuthFunctions = useMemo(() => ({
    getAccessToken: () => access_token,
    refreshToken,
    logout,
    fetchWithAuth
  }), [access_token, refreshToken, logout, fetchWithAuth]);

  // Créer le service
  const rendezvousService = useMemo(() => {
    return new UserRendezvousService(authFunctions);
  }, [authFunctions]);

  // Gestion d'AOS
  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  // Mesurer la hauteur du header
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [location.pathname]);

  // Fonction pour charger les rendez-vous
  const fetchRendezvous = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('⚠️ Tentative de fetchRendezvous sans authentification');
      return;
    }

    setLoading(true);
    try {
      const data = await rendezvousService.fetchUserRendezvous({
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus || undefined,
      });
      
      setRendezvous(data.data);
      setPagination((prev: any) => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
      
      if (data.data.length === 0 && selectedStatus) {
        toast.info(`Aucun rendez-vous avec le statut "${selectedStatus}"`);
      }
    } catch (error: any) {
      // La gestion de SESSION_EXPIRED est déjà faite par fetchWithAuth
      // On ne fait rien de spécial ici
      if (error.message !== 'SESSION_EXPIRED' && error.message !== 'SESSION_CHECK_IN_PROGRESS') {
        toast.error('Impossible de charger vos rendez-vous');
      }
    } finally {
      setLoading(false);
    }
  }, [rendezvousService, pagination.page, pagination.limit, selectedStatus, isAuthenticated]);

  // Charger les rendez-vous quand les dépendances changent
  useEffect(() => {
    if (location.pathname === '/mes-rendez-vous' && isAuthenticated) {
      fetchRendezvous();
    }
  }, [location.pathname, isAuthenticated, fetchRendezvous]);

  // Annuler un rendez-vous
  const handleCancelRendezvous = async (rdvId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
      return;
    }

    setCancelling(rdvId);
    try {
      const updatedRdv = await rendezvousService.cancelRendezvous(rdvId);
      
      setRendezvous(prev => 
        prev.map(rdv => 
          rdv._id === rdvId ? { ...rdv, ...updatedRdv } : rdv
        )
      );
      
      toast.success('Rendez-vous annulé avec succès');
    } catch (error: any) {
      // La gestion de SESSION_EXPIRED est déjà faite
      if (error.message !== 'SESSION_EXPIRED' && error.message !== 'SESSION_CHECK_IN_PROGRESS') {
        toast.error('Erreur lors de l\'annulation');
      }
    } finally {
      setCancelling(null);
    }
  };

  const handleRefresh = () => {
    if (location.pathname === '/mes-rendez-vous') {
      fetchRendezvous();
      toast.info('Liste actualisée');
    } else {
      updateProfile();
      toast.info('Profil actualisé');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev: any) => ({ ...prev, page: newPage }));
    }
  };

  const getCurrentPageConfig = () => {
    const currentPath = location.pathname;
    if (pageConfigs[currentPath as keyof typeof pageConfigs]) {
      return pageConfigs[currentPath as keyof typeof pageConfigs];
    }
    
    for (const [path, config] of Object.entries(pageConfigs)) {
      if (currentPath.startsWith(path)) {
        return config;
      }
    }
    
    return pageConfigs['/mes-rendez-vous'];
  };

  const currentPage = getCurrentPageConfig();
  const activeTabId = navTabs.find(tab => location.pathname.startsWith(tab.to))?.id || 'rendezvous';

  // === RENDU DES ÉLÉMENTS UI ===
  const renderStatusBadge = (status: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
      {status === 'En attente' && <FiAlertCircle className="mr-1 h-3 w-3" />}
      {status === 'Confirmé' && <FiCheckCircle className="mr-1 h-3 w-3" />}
      {status === 'Terminé' && <FiCheckCircle className="mr-1 h-3 w-3" />}
      {status === 'Annulé' && <FiXCircle className="mr-1 h-3 w-3" />}
      {status}
    </span>
  );

  const renderAvisBadge = (avis: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${avisColors[avis] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
      <FiStar className="mr-1 h-3 w-3" />
      {avis}
    </span>
  );

  const renderRendezvousItem = (rdv: Rendezvous) => (
    <div 
      key={rdv._id} 
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
      data-aos="fade-up"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {renderStatusBadge(rdv.status)}
            {rdv.status === 'Terminé' && rdv.avisAdmin && renderAvisBadge(rdv.avisAdmin)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700">
              <FiCalendar className="mr-2 h-4 w-4 text-sky-500" />
              <span className="font-medium">{UserRendezvousService.formatDate(rdv.date)}</span>
              <FiClock className="ml-4 mr-2 h-4 w-4 text-sky-500" />
              <span className="font-medium">{UserRendezvousService.formatTime(rdv.time)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <FiMapPin className="mr-2 h-4 w-4 text-sky-500" />
              <span>{UserRendezvousService.getEffectiveDestination(rdv)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <FiBook className="mr-2 h-4 w-4 text-sky-500" />
              <span>{UserRendezvousService.getEffectiveFiliere(rdv)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <FiAward className="mr-2 h-4 w-4 text-sky-500" />
              <span>{rdv.niveauEtude}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          {UserRendezvousService.canCancelRendezvous(rdv) && (
            <button
              onClick={() => handleCancelRendezvous(rdv._id)}
              disabled={cancelling === rdv._id}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling === rdv._id ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                  Annulation...
                </>
              ) : (
                <>
                  <FiTrash2 className="mr-2 h-3 w-3" />
                  Annuler
                </>
              )}
            </button>
          )}

          {rdv.status === 'Terminé' && rdv.avisAdmin && (
            <div className="text-xs text-gray-500">
              <div className="flex items-center">
                <FiInfo className="mr-1 h-3 w-3" />
                Avis administrateur reçu
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Créé le {new Date(rdv.createdAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>

      {rdv.status === 'Annulé' && rdv.cancellationReason && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Raison d'annulation :</span>{' '}
            {rdv.cancellationReason}
          </div>
          {rdv.cancelledAt && (
            <div className="text-xs text-gray-500 mt-1">
              Annulé le {new Date(rdv.cancelledAt).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // === RENDU CONDITIONNEL PAR PAGE ===
  const renderPageContent = () => {
    if (location.pathname !== '/mes-rendez-vous') {
      return (
        <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8" data-aos="fade-up">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                {currentPage.title}
              </h1>
              <p className="text-gray-600">
                {currentPage.subtitle}
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center" data-aos="fade-up">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                {activeTabId === 'profile' ? (
                  <User className="h-8 w-8 text-sky-600" />
                ) : activeTabId === 'procedures' ? (
                  <FileText className="h-8 w-8 text-sky-600" />
                ) : (
                  <Calendar className="h-8 w-8 text-sky-600" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Page {currentPage.title} en cours de développement
              </h3>
              <p className="text-gray-600 mb-6">
                Cette fonctionnalité sera bientôt disponible. Merci de votre patience.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/mes-rendez-vous')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors duration-150"
                >
                  <Calendar className="h-4 w-4" />
                  Voir mes rendez-vous
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                >
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* En-tête de page */}
          <div className="mb-8" data-aos="fade-up">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {currentPage.title}
            </h1>
            <p className="text-gray-600">
              {currentPage.subtitle}
            </p>
          </div>

          {/* Contrôles */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-aos="fade-up">
            <div className="flex items-center gap-3">
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPagination((prev: any) => ({ ...prev, page: 1 }));
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            <button
              onClick={() => navigate('/rendez-vous')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <FiCalendar className="h-4 w-4" />
              Nouveau rendez-vous
            </button>
          </div>

          {/* État de chargement */}
          {loading && (
            <div className="mb-6 text-center py-12" data-aos="fade-up">
              <div className="inline-block">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Chargement de vos rendez-vous...</p>
              </div>
            </div>
          )}

          {/* Liste des rendez-vous */}
          {!loading && rendezvous.length > 0 && (
            <div className="space-y-4 mb-8">
              {rendezvous.map(rdv => renderRendezvousItem(rdv))}
            </div>
          )}

          {/* Aucun rendez-vous */}
          {!loading && rendezvous.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center" data-aos="fade-up">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <FiCalendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Aucun rendez-vous trouvé
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {selectedStatus 
                  ? `Vous n'avez pas de rendez-vous avec le statut "${selectedStatus}"`
                  : "Vous n'avez pas encore pris de rendez-vous"}
              </p>
              <button
                onClick={() => navigate('/rendez-vous')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                <FiCalendar className="h-4 w-4" />
                Prendre un rendez-vous
              </button>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between" data-aos="fade-up">
              <div className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.totalPages} • 
                Total : {pagination.total} rendez-vous{pagination.total > 1 ? 's' : ''}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Précédent
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                          pagination.page === pageNum
                            ? 'bg-sky-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Informations */}
          <div className="mt-8 bg-sky-50 border border-sky-200 rounded-lg p-4" data-aos="fade-up">
            <h3 className="font-medium text-sky-800 mb-2 flex items-center">
              <FiInfo className="mr-2 h-4 w-4" />
              Informations importantes
            </h3>
            <ul className="text-sm text-sky-700 space-y-1">
              <li>• Les rendez-vous annulés apparaissent avec la raison d'annulation</li>
              <li>• Vous ne pouvez annuler qu'un rendez-vous <strong>Confirmé</strong></li>
              <li>• L'annulation n'est plus possible à moins de 2 heures du rendez-vous</li>
              <li>• Pour les rendez-vous <strong>Terminés</strong>, l'avis administrateur est affiché</li>
              <li>• Un rendez-vous <strong>Terminé</strong> avec avis <strong>Favorable</strong> peut déclencher une procédure</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Rendu principal
  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name="description" content={currentPage.description} />
      </Helmet>

      {/* Header fixe */}
      <header 
        ref={headerRef} 
        className='bg-white shadow-lg border-b border-gray-100 fixed top-0 left-0 right-0 z-50'
      >
        <div className='px-4 py-3'>
          {/* Barre supérieure */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => navigate('/')}
                className='p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200'
                title="Retour à l'accueil"
                aria-label="Retour à l'accueil"
              >
                <Home className='w-4 h-4 text-sky-600' />
              </button>
              <div className='flex flex-col'>
                <h1 className='text-base font-bold text-gray-900 leading-tight'>
                  {currentPage.title}
                </h1>
                <p className='text-xs text-gray-500'>
                  {currentPage.subtitle}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className='p-2 bg-sky-50 rounded-xl hover:bg-sky-100 active:scale-95 transition-all duration-200 disabled:opacity-50'
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <div className='overflow-x-auto pb-1 no-scrollbar'>
            <nav className='flex gap-1.5 min-w-max'>
              {navTabs.map(tab => {
                const isActive = activeTabId === tab.id;
                return (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 flex-shrink-0 relative ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-sky-300 hover:bg-sky-50 active:scale-95'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-gray-700'
                    }`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-sky-400 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Indicateur de statut */}
          <div className='mt-2 pt-2 border-t border-gray-100'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <div className='w-1.5 h-1.5 bg-emerald-500 rounded-full'></div>
                <span className='text-xs text-gray-600'>
                  Connecté: {user?.email}
                </span>
              </div>
              <span className='text-xs text-gray-500'>
                {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Effet de séparation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-100 to-transparent"></div>
      </header>

      {/* Contenu principal */}
      <div 
        className="min-h-screen"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        {renderPageContent()}
      </div>
    </>
  );
};

export default MesRendezvous;