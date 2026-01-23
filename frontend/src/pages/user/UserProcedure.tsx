import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useUserProcedures,
  useProcedureDetails,
  useCancelProcedure,
  type UserProcedure,
  type Step,
  ProcedureStatus,
  StepStatus,
  getStepDisplayName,
  getStepDisplayStatus,
  getProcedureDisplayStatus,
  getProcedureStatusColor,
  getStepStatusColor,
  getProgressStatus,
  formatProcedureDate,
} from '../../api/user/procedures/ProcedureService';
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  FileText,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserHeader } from '../../components/user/UserHeader';
import { toast } from 'react-toastify';

const LoadingScreen = ({ message = 'Chargement...' }: { message?: string }) => (
  <div className='min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 to-white'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4'></div>
      <p className='text-gray-600'>{message}</p>
    </div>
  </div>
);

const UserProcedureComponent = (): React.JSX.Element => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [headerHeight, setHeaderHeight] = useState(0);

  // === CONFIGURATION ===
  const currentPage = {
    title: 'Ma Procédure',
    subtitle: "Suivez l'avancement de votre dossier",
    pageTitle: 'Ma Procédure - Paname Consulting',
    description: "Suivez l'avancement de votre dossier avec Paname Consulting",
  };

  // === ÉTATS ===
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [selectedProcedure, setSelectedProcedure] = useState<UserProcedure | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ProcedureStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showMobileDetails, setShowMobileDetails] = useState<boolean>(false);

  const limit = 8;

  // === HOOKS ===
  const {
    procedures: paginatedProcedures,
    loading: proceduresLoading,
    error: proceduresError,
    refetch: refetchProcedures,
  } = useUserProcedures(currentPageNum, limit);

  const { procedure: detailedProcedure } = useProcedureDetails(selectedProcedure?._id || null);
  useCancelProcedure();

  // === REDIRECTION SI NON AUTHENTIFIÉ ===
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    }
  }, [isAuthenticated, navigate]);

  // === SYNC DES DÉTAILS ===
  useEffect(() => {
    if (selectedProcedure && detailedProcedure && selectedProcedure._id === detailedProcedure._id) {
      setSelectedProcedure(detailedProcedure);
    }
  }, [detailedProcedure, selectedProcedure]);

  // === FONCTIONS ===
  const getStepStatusIcon = (statut: StepStatus): React.JSX.Element => {
    switch (statut) {
      case StepStatus.COMPLETED: return <CheckCircle className='w-4 h-4 text-green-600' />;
      case StepStatus.IN_PROGRESS: return <Clock className='w-4 h-4 text-blue-600' />;
      case StepStatus.REJECTED: return <XCircle className='w-4 h-4 text-red-600' />;
      case StepStatus.CANCELLED: return <XCircle className='w-4 h-4 text-gray-600' />;
      default: return <Clock className='w-4 h-4 text-yellow-600' />;
    }
  };

  const handleSelectProcedure = (procedure: UserProcedure): void => {
    setSelectedProcedure(procedure);
    setShowMobileDetails(true);
  };


  const refreshUserData = async () => {
    try {
      await refetchProcedures();
      toast.success('Liste actualisée');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    }
  };

  // === FILTRES ===
  const filteredProcedures = (paginatedProcedures?.data || []).filter((procedure: UserProcedure) => {
    const matchesSearch =
      procedure.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.prenom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || procedure.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = paginatedProcedures?.totalPages || 1;

  // === HEADER HEIGHT ===
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      setHeaderHeight(header.offsetHeight);
    }
  }, []);

  if (!isAuthenticated) {
    return <LoadingScreen message='Redirection...' />;
  }

  // === RENDU ===
  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name='description' content={currentPage.description} />
        <meta name='robots' content='noindex,nofollow' />
      </Helmet>

      <UserHeader
        title={currentPage.title}
        subtitle={currentPage.subtitle}
        pageTitle={currentPage.pageTitle}
        description={currentPage.description}
        isLoading={proceduresLoading}
        onRefresh={refreshUserData}
      >
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
              {filteredProcedures.length} résultat{filteredProcedures.length !== 1 ? 's' : ''}
            </span>
          </div>

          {showFilters && (
            <div className='grid grid-cols-2 gap-2'>
              {['ALL', ...Object.values(ProcedureStatus)].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as ProcedureStatus | 'ALL')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-sky-300'
                  }`}
                >
                  {status === 'ALL' ? 'Toutes' : getProcedureDisplayStatus(status as ProcedureStatus)}
                </button>
              ))}
            </div>
          )}
        </div>
      </UserHeader>

      {/* Contenu principal */}
      <div className='min-h-screen bg-linear-to-b from-sky-50 to-white' style={{ paddingTop: `${headerHeight}px` }}>
        <main className='p-4 max-w-6xl mx-auto'>
          {proceduresLoading ? (
            <div className='bg-white rounded-2xl shadow-sm p-8 text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4'></div>
              <p className='text-gray-600'>Chargement de vos procédures...</p>
            </div>
          ) : proceduresError ? (
            <div className='bg-white rounded-2xl shadow-sm p-6 text-center'>
              <div className='w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                <AlertCircle className='w-8 h-8 text-red-500' />
              </div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>Erreur de chargement</h3>
              <p className='text-gray-600 mb-4'>Impossible de charger vos procédures. Veuillez réessayer.</p>
              <button
                onClick={() => refetchProcedures()}
                className='px-6 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium'
              >
                Réessayer
              </button>
            </div>
          ) : filteredProcedures.length > 0 ? (
            <div className='lg:grid lg:grid-cols-3 lg:gap-6'>
              {/* Liste des procédures */}
              <div className={`lg:col-span-2 space-y-4 ${showMobileDetails ? 'hidden lg:block' : 'block'}`}>
                {filteredProcedures.map((procedure: UserProcedure) => {
                  const progress = getProgressStatus(procedure);

                  return (
                    <div
                      key={procedure._id}
                      className='bg-white rounded-2xl shadow-sm border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md'
                      onClick={() => handleSelectProcedure(procedure)}
                    >
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-2'>
                            <h3 className='font-semibold text-gray-800 text-base truncate'>
                              {procedure.destination}
                              {procedure.destinationAutre && ` (${procedure.destinationAutre})`}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${getProcedureStatusColor(
                                procedure.statut
                              )}`}
                            >
                              {getProcedureDisplayStatus(procedure.statut)}
                            </span>
                          </div>

                          <div className='text-gray-600 text-sm space-y-1'>
                            <p className='truncate'>
                              {procedure.prenom} {procedure.nom}
                            </p>
                            <p className='text-xs'>Créée le {formatProcedureDate(procedure.createdAt)}</p>
                          </div>
                        </div>

                        <ChevronRight className='w-5 h-5 text-gray-400 shrink-0 ml-2' />
                      </div>

                      {/* Barre de progression */}
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

                      {/* Étapes */}
                      <div className='space-y-2'>
                        {procedure.steps.slice(0, 3).map((step: Step) => (
                          <div key={step.nom} className='flex items-center gap-2 text-xs'>
                            {getStepStatusIcon(step.statut)}
                            <span className='text-gray-700 flex-1 truncate'>{getStepDisplayName(step.nom)}</span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStepStatusColor(step.statut)}`}
                            >
                              {getStepDisplayStatus(step.statut)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex justify-center items-center gap-3 mt-6'>
                    <button
                      onClick={() => setCurrentPageNum(prev => Math.max(1, prev - 1))}
                      disabled={currentPageNum === 1}
                      className='p-2 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <ChevronLeft className='w-4 h-4' />
                    </button>

                    <span className='text-sm text-gray-600 font-medium'>
                      {currentPageNum} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPageNum(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPageNum === totalPages}
                      className='p-2 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <ChevronRight className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* Détails de la procédure */}
              {selectedProcedure && (
                <div className='hidden lg:block lg:col-span-1'>
                  <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6'>
                    <div className='space-y-6'>
                      {/* En-tête */}
                      <div className='flex items-start justify-between'>
                        <h3 className='text-lg font-semibold text-gray-800'>Détails de la procédure</h3>
                        <button
                          onClick={() => setSelectedProcedure(null)}
                          className='text-gray-400 hover:text-gray-600 transition-colors p-1'
                        >
                          <X className='w-5 h-5' />
                        </button>
                      </div>

                      {/* Titre et statut */}
                      <div>
                        <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                          {selectedProcedure.destination}
                          {selectedProcedure.destinationAutre && ` (${selectedProcedure.destinationAutre})`}
                        </h3>
                        <div className='flex items-center gap-3'>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getProcedureStatusColor(
                              selectedProcedure.statut
                            )}`}
                          >
                            {getProcedureDisplayStatus(selectedProcedure.statut)}
                          </span>
                          <span className='text-gray-500 text-sm'>
                            Créée le {formatProcedureDate(selectedProcedure.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className='bg-linear-to-r from-sky-50 to-blue-50 rounded-2xl p-5 border border-sky-100'>
                        <div className='flex justify-between items-center mb-3'>
                          <span className='text-sm font-medium text-gray-700'>Progression globale</span>
                          <span className='text-sm text-gray-600 font-medium'>
                            {getProgressStatus(selectedProcedure).completed}/{getProgressStatus(selectedProcedure).total}{' '}
                            étapes
                          </span>
                        </div>
                        <div className='w-full bg-sky-200 rounded-full h-2.5 mb-2'>
                          <div
                            className='bg-linear-to-r from-sky-500 to-blue-500 h-2.5 rounded-full transition-all duration-700'
                            style={{ width: `${getProgressStatus(selectedProcedure).percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Étapes détaillées */}
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>
                          ÉTAPES DE LA PROCÉDURE
                        </h4>
                        <div className='space-y-2'>
                          {selectedProcedure.steps.map((step: Step) => (
                            <div key={step.nom} className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50'>
                              <div className='shrink-0'>{getStepStatusIcon(step.statut)}</div>
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center justify-between'>
                                  <h5 className='font-medium text-gray-800 text-sm'>
                                    {getStepDisplayName(step.nom)}
                                  </h5>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getStepStatusColor(step.statut)}`}
                                  >
                                    {getStepDisplayStatus(step.statut)}
                                  </span>
                                </div>
                                <div className='text-xs text-gray-500 mt-1'>
                                  <span>Démarrée le {formatProcedureDate(step.dateCreation)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Informations personnelles */}
                      <div className='bg-gray-50 rounded-xl p-4'>
                        <h4 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                          <User className='w-4 h-4 text-gray-500' />
                          INFORMATIONS PERSONNELLES
                        </h4>
                        <div className='grid grid-cols-1 gap-2 text-sm'>
                          <div className='flex justify-between py-1'>
                            <span className='text-gray-500'>Nom complet</span>
                            <span className='text-gray-800 font-medium'>
                              {selectedProcedure.prenom} {selectedProcedure.nom}
                            </span>
                          </div>
                          <div className='flex justify-between py-1'>
                            <span className='text-gray-500'>Email</span>
                            <span className='text-gray-800 font-medium'>{selectedProcedure.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Aucune procédure trouvée
            <div className='bg-white rounded-2xl shadow-sm p-8 text-center'>
              <div className='w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6'>
                <FileText className='w-10 h-10 text-sky-500' />
              </div>
              <h3 className='text-xl font-semibold text-gray-800 mb-3'>Aucune procédure trouvée</h3>
              <p className='text-gray-600 mb-6'>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Aucune procédure ne correspond à vos critères.'
                  : 'Vous n&apos;avez aucune procédure en cours.'}
              </p>
              <button
                onClick={() => navigate('/rendez-vous')}
                className='px-6 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium shadow-lg'
              >
                Prendre un rendez-vous
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default UserProcedureComponent;