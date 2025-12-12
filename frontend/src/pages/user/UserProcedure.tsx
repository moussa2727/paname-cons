// UserProcedure.tsx - VERSION SIMPLIFIÉE (même logique que RendezVous)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  User,
  Calendar,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

// Composant de chargement
const LoadingScreen = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Types
interface ProcedureStep {
  nom: string;
  statut: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  dateCreation: string;
  dateMaj?: string;
  raisonRefus?: string;
}

interface UserProcedure {
  _id: string;
  destination: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  steps: ProcedureStep[];
  createdAt: string;
  dateCompletion?: string;
  dateDerniereModification?: string;
  niveauEtude?: string;
  filiere?: string;
  raisonRejet?: string;
  rendezVousId?: any;
}

const UserProcedureComponent = (): React.JSX.Element => {
  const { user, isAuthenticated, access_token, refreshToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Configuration des pages
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

  // Onglets de navigation
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

  // Obtenir la configuration de la page actuelle
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
    
    return pageConfigs['/ma-procedure'];
  };

  const currentPage = getCurrentPageConfig();
  const activeTabId = navTabs.find(tab => location.pathname.startsWith(tab.to))?.id || 'procedures';

  // === VÉRIFICATION D'AUTHENTIFICATION ===
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour accéder à vos procédures');
      navigate('/connexion', {
        state: {
          redirectTo: '/ma-procedure',
          message: 'Connectez-vous pour voir vos procédures',
        },
      });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen message="Vérification de l'authentification..." />;
  }

  // États
  const [procedures, setProcedures] = useState<UserProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcedure, setSelectedProcedure] = useState<UserProcedure | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [procedureToCancel, setProcedureToCancel] = useState<UserProcedure | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  // ==================== FONCTIONS D'AIDE ====================
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!access_token) {
      throw new Error('Session expirée');
    }

    const makeRequest = async (token: string): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    };

    let response = await makeRequest(access_token);

    // Gestion du token expiré
    if (response.status === 401) {
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          const currentToken = localStorage.getItem('access_token');
          if (currentToken) {
            response = await makeRequest(currentToken);
          } else {
            throw new Error('Session expirée');
          }
        } else {
          throw new Error('Session expirée');
        }
      } catch (error) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        logout();
        navigate('/connexion');
        throw new Error('SESSION_EXPIRED');
      }
    }

    return response;
  }, [access_token, refreshToken, logout, navigate]);

  // ==================== CHARGEMENT DES PROCÉDURES ====================
  const fetchProcedures = useCallback(async () => {
    if (!isAuthenticated || !access_token) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPageNum.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== 'ALL') {
        queryParams.append('status', statusFilter);
      }

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await fetchWithAuth(
        `${API_URL}/api/user/procedures?${queryParams}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setProcedures(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      console.error('Erreur chargement procédures:', error);
      
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error('Impossible de charger vos procédures');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, access_token, currentPageNum, statusFilter, searchTerm, fetchWithAuth]);

  // ==================== ANNULATION DE PROCÉDURE ====================
  const handleCancelProcedure = async (): Promise<void> => {
    if (!procedureToCancel || !cancelReason.trim()) return;

    setCancelLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/user/procedures/${procedureToCancel._id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      // Mettre à jour la liste
      setProcedures(prev => 
        prev.map(proc => 
          proc._id === procedureToCancel._id 
            ? { ...proc, statut: 'cancelled', raisonRejet: cancelReason }
            : proc
        )
      );
      
      if (selectedProcedure?._id === procedureToCancel._id) {
        setSelectedProcedure(prev => 
          prev ? { ...prev, statut: 'cancelled', raisonRejet: cancelReason } : null
        );
      }

      toast.success('Procédure annulée avec succès');
      setShowCancelModal(false);
      setProcedureToCancel(null);
      setCancelReason('');
    } catch (error: any) {
      console.error('Erreur annulation procédure:', error);
      
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error('Erreur lors de l\'annulation de la procédure');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  // ==================== FONCTIONS UTILITAIRES ====================
  const getProcedureDisplayStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'En attente',
      'in_progress': 'En cours',
      'completed': 'Terminée',
      'rejected': 'Rejetée',
      'cancelled': 'Annulée',
    };
    return statusMap[status] || status;
  };

  const getProcedureStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-800 border-amber-300',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStepDisplayName = (stepName: string): string => {
    const stepMap: Record<string, string> = {
      'initial_review': 'Examen initial',
      'document_submission': 'Soumission documents',
      'interview': 'Entretien',
      'decision': 'Décision',
      'completion': 'Finalisation',
    };
    return stepMap[stepName] || stepName;
  };

  const getStepDisplayStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'En attente',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'rejected': 'Rejeté',
      'cancelled': 'Annulé',
    };
    return statusMap[status] || status;
  };

  const getStepStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStepStatusIcon = (status: string): React.JSX.Element => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case 'in_progress':
        return <Clock className='w-4 h-4 text-blue-600' />;
      case 'rejected':
        return <XCircle className='w-4 h-4 text-orange-600' />;
      case 'cancelled':
        return <XCircle className='w-4 h-4 text-red-600' />;
      default:
        return <Clock className='w-4 h-4 text-yellow-600' />;
    }
  };

  const getProgressStatus = (procedure: UserProcedure) => {
    const totalSteps = procedure.steps.length;
    const completedSteps = procedure.steps.filter(step => step.statut === 'completed').length;
    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return {
      total: totalSteps,
      completed: completedSteps,
      percentage,
    };
  };

  const formatProcedureDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const canCancelProcedure = (procedure: UserProcedure): boolean => {
    return procedure.statut === 'pending' || procedure.statut === 'in_progress';
  };

  // ==================== EFFETS ====================
  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [location.pathname]);

  // ==================== RECHARGEMENT ====================
  const refreshProcedures = async () => {
    await fetchProcedures();
    toast.info('Liste actualisée');
  };

  // ==================== FILTRAGE ====================
  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch =
      procedure.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'ALL' || procedure.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // ... (le reste du rendu JSX reste identique au composant original UserProcedure.tsx)
  // Gardez le même JSX que dans votre composant UserProcedure.tsx original

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
              onClick={refreshProcedures}
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

          {/* Barre de recherche et filtres */}
          <div className='mt-3 space-y-3'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Rechercher une procédure...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm'
              />
            </div>

            <div className='flex items-center justify-between'>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className='flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm'
              >
                <Filter className='w-4 h-4' />
                <span className='font-medium'>Filtrer</span>
              </button>

              <span className='text-sm text-gray-500'>
                {filteredProcedures.length} résultat
                {filteredProcedures.length > 1 ? 's' : ''}
              </span>
            </div>

            {showFilters && (
              <div className='grid grid-cols-2 gap-2'>
                {['ALL', 'pending', 'in_progress', 'completed', 'rejected', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-sky-300'
                    }`}
                  >
                    {status === 'ALL' ? 'Toutes' : getProcedureDisplayStatus(status)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Effet de séparation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-100 to-transparent"></div>
      </header>

      {/* Contenu principal avec padding pour compenser le header fixe */}
      <div 
        className="min-h-screen bg-gradient-to-b from-sky-50 to-white"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        <main className='p-4 max-w-6xl mx-auto'>
          {loading ? (
            <div className='bg-white rounded-2xl shadow-sm p-8 text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4'></div>
              <p className='text-gray-600'>Chargement de vos procédures...</p>
            </div>
          ) : filteredProcedures.length > 0 ? (
            <div className='lg:grid lg:grid-cols-3 lg:gap-6'>
              <div
                className={`lg:col-span-2 space-y-4 ${showMobileDetails ? 'hidden lg:block' : 'block'}`}
              >
                {filteredProcedures.map((procedure: UserProcedure) => {
                  const progress = getProgressStatus(procedure);
                  const canCancel = canCancelProcedure(procedure);

                  return (
                    <div
                      key={procedure._id}
                      className='bg-white rounded-2xl shadow-sm border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]'
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setShowMobileDetails(true);
                      }}
                    >
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-2'>
                            <h3 className='font-semibold text-gray-800 text-base truncate'>
                              {procedure.destination}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getProcedureStatusColor(procedure.statut)}`}
                            >
                              {getProcedureDisplayStatus(procedure.statut)}
                            </span>
                          </div>

                          <div className='text-gray-600 text-sm space-y-1'>
                            <p className='truncate'>
                              {procedure.prenom} {procedure.nom}
                            </p>
                            <p className='text-xs'>
                              Créée le{' '}
                              {formatProcedureDate(procedure.createdAt)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0 ml-2' />
                      </div>

                      <div className='mb-3'>
                        <div className='flex justify-between text-xs text-gray-600 mb-1'>
                          <span>Avancement</span>
                          <span>
                            {progress.completed}/{progress.total} étapes
                          </span>
                        </div>
                        <div className='w-full bg-gray-200 rounded-full h-2'>
                          <div
                            className='bg-sky-500 h-2 rounded-full transition-all duration-300'
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {procedure.steps
                          .slice(0, 3)
                          .map((step: ProcedureStep) => (
                            <div
                              key={step.nom}
                              className='flex items-center gap-2 text-xs'
                            >
                              {getStepStatusIcon(step.statut)}
                              <span className='text-gray-700 flex-1 truncate'>
                                {getStepDisplayName(step.nom)}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getStepStatusColor(step.statut)}`}
                              >
                                {getStepDisplayStatus(step.statut)}
                              </span>
                            </div>
                          ))}
                        {procedure.steps.length > 3 && (
                          <div className='text-center text-xs text-gray-500 pt-1'>
                            + {procedure.steps.length - 3} autre(s) étape(s)
                          </div>
                        )}
                      </div>

                      {procedure.raisonRejet && (
                        <div className='mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg'>
                          <p className='text-orange-700 text-xs'>
                            <strong>Raison du rejet :</strong>{' '}
                            {procedure.raisonRejet}
                          </p>
                        </div>
                      )}

                      {canCancel && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setProcedureToCancel(procedure);
                            setShowCancelModal(true);
                          }}
                          className='w-full mt-3 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          <XCircle className='w-4 h-4' />
                          Annuler la procédure
                        </button>
                      )}
                    </div>
                  );
                })}

                {totalPages > 1 && (
                  <div className='flex justify-center items-center gap-3 mt-6'>
                    <button
                      onClick={() =>
                        setCurrentPageNum(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPageNum === 1}
                      className='p-2 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <ChevronRight className='w-4 h-4 rotate-180' />
                    </button>

                    <span className='text-sm text-gray-600 font-medium'>
                      {currentPageNum} / {totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPageNum(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPageNum === totalPages}
                      className='p-2 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <ChevronRight className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* Détails desktop */}
              <div
                className={`hidden lg:block lg:col-span-1 ${!selectedProcedure && 'lg:hidden'}`}
              >
                {selectedProcedure && (
                  <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6'>
                    {/* ... (gardez le même contenu détaillé que dans votre composant original) */}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='bg-white rounded-2xl shadow-sm p-8 text-center'>
              <div className='w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6'>
                <FileText className='w-10 h-10 text-sky-500' />
              </div>
              <h3 className='text-xl font-semibold text-gray-800 mb-3'>
                Aucune procédure trouvée
              </h3>
              <p className='text-gray-600 mb-6'>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Aucune procédure ne correspond à vos critères.'
                  : "Vous n'avez aucune procédure en cours."}
              </p>
              <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                <button
                  onClick={() => navigate('/rendez-vous')}
                  className='px-6 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium shadow-lg'
                >
                  Prendre un rendez-vous
                </button>
                {(searchTerm || statusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                    }}
                    className='px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium'
                  >
                    Voir toutes les procédures
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Modal d'annulation */}
        {showCancelModal && procedureToCancel && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-4 z-50 sm:items-center sm:p-6'>
            <div className='bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Confirmer l'annulation
              </h3>
              <p className='text-gray-600 mb-4'>
                Êtes-vous sûr de vouloir annuler votre procédure pour{' '}
                {procedureToCancel.destination} ?
              </p>

              <div className='mb-4'>
                <label
                  htmlFor='cancelReason'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Raison de l'annulation
                </label>
                <textarea
                  id='cancelReason'
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder='Veuillez nous dire pourquoi vous souhaitez annuler cette procédure ?'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none text-sm'
                  rows={3}
                />
              </div>

              <div className='flex gap-3'>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setProcedureToCancel(null);
                    setCancelReason('');
                  }}
                  disabled={cancelLoading}
                  className='flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-xl border border-gray-300 hover:border-gray-400'
                >
                  Retour
                </button>
                <button
                  onClick={handleCancelProcedure}
                  disabled={cancelLoading || !cancelReason.trim()}
                  className='flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50'
                >
                  {cancelLoading ? (
                    <>
                      <RefreshCw className='w-4 h-4 animate-spin' />
                      Annulation...
                    </>
                  ) : (
                    <>
                      <XCircle className='w-4 h-4' />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserProcedureComponent;