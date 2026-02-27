import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  Star,
  Filter,
  AlertTriangle,
  Plus,
  Loader2,
  OctagonAlert,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { UserHeader } from '../../../components/user/UserHeader';
import {
  UserRendezvousService,
  Rendezvous,
  PaginationState,
  AuthFunctions,
} from '../../../api/user/Rendezvous/UserRendezvousService';

const { STATUS, ADMIN_OPINION } = UserRendezvousService;

const pageConfigs = {
  '/mon-profil': {
    title: 'Mon Profil',
    subtitle: 'Gérez vos informations personnelles',
    pageTitle: 'Mon Profil - Paname Consulting',
    description: 'Gérez vos informations personnelles avec Paname Consulting',
  },
  '/mes-rendez-vous': {
    title: 'Mes Rendez-vous',
    subtitle: 'Consultez et gérez vos rendez-vous',
    pageTitle: 'Mes Rendez-vous - Paname Consulting',
    description: 'Consultez et gérez vos rendez-vous avec Paname Consulting',
  },
  '/ma-procedure': {
    title: 'Ma Procédure',
    subtitle: "Suivez l'avancement de votre dossier",
    pageTitle: 'Ma Procédure - Paname Consulting',
    description: "Suivez l'avancement de votre dossier avec Paname Consulting",
  },
};

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: STATUS.PENDING, label: 'En attente' },
  { value: STATUS.CONFIRMED, label: 'Confirmé' },
  { value: STATUS.COMPLETED, label: 'Terminé' },
  { value: STATUS.CANCELLED, label: 'Annulé' },
];

const statusColors: Record<string, string> = {
  [STATUS.PENDING]: 'bg-amber-100 text-amber-800 border-amber-300',
  [STATUS.CONFIRMED]: 'bg-sky-100 text-sky-800 border-sky-300',
  [STATUS.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [STATUS.CANCELLED]: 'bg-red-100 text-red-800 border-red-300',
};

const avisColors: Record<string, string> = {
  [ADMIN_OPINION.FAVORABLE]:
    'bg-emerald-100 text-emerald-800 border-emerald-300',
  [ADMIN_OPINION.UNFAVORABLE]: 'bg-red-100 text-red-800 border-red-300',
};

// Composant Modal de confirmation
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rdv: Rendezvous | null;
  isCancelling: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rdv,
  isCancelling,
}) => {
  const [cancellationReason, setCancellationReason] = useState('');

  if (!isOpen || !rdv) return null;

  const timeLeft = UserRendezvousService.getRemainingCancellationTime(rdv);

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      {/* Overlay avec flou */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='flex min-h-full items-center justify-center p-4'>
        <div
          className='relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all'
          onClick={e => e.stopPropagation()}
        >
          {/* En-tête avec icône d'avertissement */}
          <div className='bg-red-600 px-6 py-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-full bg-white/20 p-2'>
                <AlertTriangle className='h-6 w-6 text-white' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-white'>
                  Confirmer l'annulation
                </h3>
                <p className='text-sm text-red-100'>
                  Cette action est irréversible
                </p>
              </div>
            </div>
          </div>

          {/* Corps du modal */}
          <div className='p-6'>
            {/* Détails du rendez-vous */}
            <div className='mb-6 rounded-lg bg-gray-50 p-4'>
              <h4 className='mb-3 text-sm font-medium text-gray-700'>
                Détails du rendez-vous à annuler :
              </h4>
              <div className='space-y-2 text-sm'>
                <div className='flex items-start gap-2'>
                  <Calendar className='mt-0.5 h-4 w-4 text-gray-500' />
                  <span className='text-gray-700'>
                    <span className='font-medium'>Date :</span>{' '}
                    {UserRendezvousService.formatDate(rdv.date)}
                  </span>
                </div>
                <div className='flex items-start gap-2'>
                  <Clock className='mt-0.5 h-4 w-4 text-gray-500' />
                  <span className='text-gray-700'>
                    <span className='font-medium'>Heure :</span>{' '}
                    {UserRendezvousService.formatTime(rdv.time)}
                  </span>
                </div>
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 h-4 w-4 text-gray-500' />
                  <span className='text-gray-700'>
                    <span className='font-medium'>Destination :</span>{' '}
                    {UserRendezvousService.getEffectiveDestination(rdv)}
                  </span>
                </div>
                <div className='flex items-start gap-2'>
                  <BookOpen className='mt-0.5 h-4 w-4 text-gray-500' />
                  <span className='text-gray-700'>
                    <span className='font-medium'>Filière :</span>{' '}
                    {UserRendezvousService.getEffectiveFiliere(rdv)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timer si applicable */}
            {timeLeft && (
              <div className='mb-4 rounded-lg bg-amber-50 p-3'>
                <div className='flex items-start gap-2'>
                  <AlertCircle className='mt-0.5 h-4 w-4 text-amber-600' />
                  <div>
                    <p className='text-xs font-medium text-amber-800'>
                      Délai d'annulation
                    </p>
                    <p className='text-xs text-amber-700'>
                      Il vous reste {timeLeft} pour annuler ce rendez-vous
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Champ raison d'annulation (optionnel) */}
            <div className='mb-4'>
              <label
                htmlFor='cancellationReason'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Raison de l'annulation (optionnelle)
              </label>
              <textarea
                id='cancellationReason'
                rows={3}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent'
                placeholder='Indiquez la raison de votre annulation...'
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
              />
            </div>

            {/* Avertissement important */}
            <div className='mb-6 rounded-lg bg-red-50 p-3'>
              <div className='flex items-start gap-2'>
                <AlertTriangle className='mt-0.5 h-4 w-4 text-red-600' />
                <div>
                  <p className='text-xs font-medium text-red-800'>
                    Attention : Cette action est irréversible
                  </p>
                  <ul className='mt-1 list-inside list-disc text-xs text-red-700'>
                    <li>Le rendez-vous sera définitivement annulé</li>
                    <li>Un email de confirmation vous sera envoyé</li>
                    <li>
                      Vous devrez reprendre un nouveau rendez-vous si nécessaire
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className='flex gap-3'>
              <button
                onClick={onClose}
                disabled={isCancelling}
                className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
              >
                Retour
              </button>
              <button
                onClick={() => onConfirm()}
                disabled={isCancelling}
                className='flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2'
              >
                {isCancelling ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Annulation...
                  </>
                ) : (
                  <>
                    <Trash2 className='h-4 w-4' />
                    Confirmer l'annulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MesRendezvous = () => {
  const {
    user,
    fetchWithAuth,
    isLoading: authLoading,
    updateProfile,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(0);

  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // État pour le modal de confirmation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRdvForCancel, setSelectedRdvForCancel] =
    useState<Rendezvous | null>(null);

  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      setHeaderHeight(header.offsetHeight);
    }
  }, []);

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

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 to-white'>
        <div className='text-center'>
          <div className='animate-pulse rounded-full h-16 w-16 bg-linear-to-r from-sky-400 to-blue-500 mx-auto mb-4 flex items-center justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent'></div>
          </div>
          <p className='text-gray-600 animate-pulse'>
            Chargement de l'authentification...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    navigate('/connexion');
    return null;
  }

  const authFunctions: AuthFunctions = useMemo(
    () => ({
      fetchWithAuth,
      getAccessToken: () => null,
      refreshToken: async () => true,
      logout: () => {},
    }),
    [fetchWithAuth]
  );

  const rendezvousService = useMemo(() => {
    return new UserRendezvousService(authFunctions);
  }, [authFunctions]);

  const fetchRendezvous = useCallback(async () => {
    setLoading(true);

    try {
      const data = await rendezvousService.fetchUserRendezvous({
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus || undefined,
      });

      setRendezvous(data.data);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      });
    } catch (error: any) {
      if (
        error.message !== 'SESSION_EXPIRED' &&
        error.message !== 'SESSION_CHECK_IN_PROGRESS'
      ) {
        toast.error('Impossible de charger les rendez-vous');
      }
    } finally {
      setLoading(false);
    }
  }, [rendezvousService, selectedStatus, pagination.page, pagination.limit]);

  useEffect(() => {
    if (location.pathname === '/mes-rendez-vous') {
      fetchRendezvous();
    }
  }, [location.pathname, selectedStatus, pagination.page, fetchRendezvous]);

  // Ouvrir le modal de confirmation d'annulation
  const openCancelModal = (rdv: Rendezvous) => {
    setSelectedRdvForCancel(rdv);
    setShowCancelModal(true);
  };

  // Fermer le modal
  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedRdvForCancel(null);
  };

  // Gérer l'annulation
  const handleCancelRendezvous = async () => {
    if (!selectedRdvForCancel) return;

    setCancelling(true);

    try {
      const updatedRdv = await rendezvousService.cancelRendezvous(
        selectedRdvForCancel._id
      );

      setRendezvous(prev =>
        prev.map(rdv =>
          rdv._id === selectedRdvForCancel._id
            ? { ...rdv, ...updatedRdv }
            : rdv
        )
      );

      toast.success('Rendez-vous annulé avec succès', {
        position: 'top-right',
        autoClose: 5000,
      });

      closeCancelModal();
    } catch (error: any) {
      if (
        error.message !== 'SESSION_EXPIRED' &&
        error.message !== 'SESSION_CHECK_IN_PROGRESS'
      ) {
        let errorMessage = error.message;

        if (error.message.includes('2 heures')) {
          errorMessage =
            "Impossible d'annuler : moins de 2 heures avant le rendez-vous";
        } else if (error.message.includes('terminé')) {
          errorMessage = "Impossible d'annuler un rendez-vous terminé";
        }

        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 7000,
        });
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleRefresh = () => {
    if (location.pathname === '/mes-rendez-vous') {
      fetchRendezvous();
    } else {
      updateProfile();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const renderStatusBadge = (status: string) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
      }`}
    >
      {status === 'En attente' && <AlertCircle className='mr-1 h-3 w-3' />}
      {status === 'Confirmé' && <CheckCircle className='mr-1 h-3 w-3' />}
      {status === 'Terminé' && <CheckCircle className='mr-1 h-3 w-3' />}
      {status === 'Annulé' && <XCircle className='mr-1 h-3 w-3' />}
      {status}
    </span>
  );

  const renderAvisBadge = (avis: string) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        avisColors[avis] || 'bg-gray-100 text-gray-800 border-gray-300'
      }`}
    >
      <Star className='mr-1 h-3 w-3' />
      {avis}
    </span>
  );

  return (
    <>
      <Helmet>
        <title>{currentPage.pageTitle}</title>
        <meta name='description' content={currentPage.description} />
        <meta name='robots' content='noindex, nofollow' />
      </Helmet>

      <UserHeader
        title={currentPage.title}
        subtitle={currentPage.subtitle}
        pageTitle={currentPage.pageTitle}
        description={currentPage.description}
        isLoading={loading}
        onRefresh={handleRefresh}
      >
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
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </UserHeader>

      <div
        className='min-h-screen bg-linear-to-b from-sky-50 to-white'
        style={{ paddingTop: `${headerHeight}px` }}
      >
        <div className='max-w-4xl mx-auto px-4 py-8'>
          <div className='mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='relative'>
                <Filter className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <select
                  value={selectedStatus}
                  onChange={e => {
                    setSelectedStatus(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white transition-all duration-200 hover:border-sky-400'
                  disabled={loading}
                >
                  {statusOptions.map(option => (
                    <option key={`status-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchRendezvous}
                disabled={loading}
                className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Actualiser
              </button>
            </div>

            <button
              onClick={() => navigate('/rendez-vous')}
              className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
            >
              <Calendar className='h-4 w-4' />
              Nouveau rendez-vous
            </button>
          </div>

          {loading && (
            <div className='mb-6 text-center py-12'>
              <div className='inline-block'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent'></div>
                <p className='mt-3 text-sm text-gray-600'>
                  Chargement de vos rendez-vous...
                </p>
              </div>
            </div>
          )}

          {!loading && rendezvous.length > 0 && (
            <div className='space-y-4 mb-8'>
              {rendezvous.map((rdv, index) => {
                const uniqueKey = `rdv-${rdv._id}-${index}-${rdv.date}-${rdv.time}`;
                const canCancel = UserRendezvousService.canCancelRendezvous(rdv);

                return (
                  <div
                    key={uniqueKey}
                    className='bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300 relative'
                  >
                    <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                      <div className='flex-1'>
                        <div className='flex flex-wrap items-center gap-2 mb-3'>
                          {renderStatusBadge(rdv.status)}
                          {rdv.status === 'Terminé' &&
                            rdv.avisAdmin &&
                            renderAvisBadge(rdv.avisAdmin)}
                        </div>

                        <div className='space-y-2'>
                          <div className='flex items-center text-sm text-gray-700'>
                            <Calendar className='mr-2 h-4 w-4 text-sky-500' />
                            <span className='font-medium'>
                              {UserRendezvousService.formatDate(rdv.date)}
                            </span>
                            <Clock className='ml-4 mr-2 h-4 w-4 text-sky-500' />
                            <span className='font-medium'>
                              {UserRendezvousService.formatTime(rdv.time)}
                            </span>
                          </div>

                          <div className='flex items-center text-sm text-gray-600'>
                            <MapPin className='mr-2 h-4 w-4 text-sky-500' />
                            <span>
                              {UserRendezvousService.getEffectiveDestination(
                                rdv
                              )}
                            </span>
                          </div>

                          <div className='flex items-center text-sm text-gray-600'>
                            <BookOpen className='mr-2 h-4 w-4 text-sky-500' />
                            <span>
                              {UserRendezvousService.getEffectiveFiliere(rdv)}
                            </span>
                          </div>

                          <div className='flex items-center text-sm text-gray-600'>
                            <Award className='mr-2 h-4 w-4 text-sky-500' />
                            <span>{rdv.niveauEtude}</span>
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-col sm:items-end gap-2'>
                        {canCancel && (
                          <button
                            onClick={() => openCancelModal(rdv)}
                            disabled={cancelling}
                            className='inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <Trash2 className='mr-2 h-3 w-3' />
                            Annuler
                          </button>
                        )}

                        {rdv.status === 'Terminé' && rdv.avisAdmin && (
                          <div className='text-xs text-gray-500'>
                            <div className='flex items-center'>
                              <Info className='mr-1 h-3 w-3' />
                              Avis administrateur reçu
                            </div>
                          </div>
                        )}

                        <div className='text-xs text-gray-400'>
                          Créé le{' '}
                          {new Date(rdv.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    {rdv.status === 'Annulé' && rdv.cancellationReason && (
                      <div className='mt-3 pt-3 border-t border-gray-100'>
                        <div className='text-sm text-gray-600'>
                          <span className='font-medium'>
                            Raison d'annulation :
                          </span>{' '}
                          {rdv.cancellationReason}
                        </div>
                        {rdv.cancelledAt && (
                          <div className='text-xs text-gray-500 mt-1'>
                            Annulé le{' '}
                            {new Date(rdv.cancelledAt).toLocaleDateString(
                              'fr-FR'
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && rendezvous.length === 0 && (
            <div className='bg-white rounded-lg border border-gray-200 p-12 text-center'>
              <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <Calendar className='h-8 w-8 text-gray-400' />
              </div>
              <h3 className='text-lg font-medium text-gray-800 mb-2'>
                Aucun rendez-vous trouvé
              </h3>
              <p className='text-gray-600 mb-6 max-w-md mx-auto'>
                {selectedStatus
                  ? `Vous n'avez pas de rendez-vous avec le statut "${selectedStatus}"`
                  : "Vous n'avez pas encore pris de rendez-vous"}
              </p>
              <button
                onClick={() => navigate('/rendez-vous')}
                className='inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
              >
                <Plus className='h-4 w-4' />
                Prendre un rendez-vous
              </button>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className='flex items-center justify-between'>
              <div className='text-sm text-gray-600'>
                Page {pagination.page} sur {pagination.totalPages} • Total :{' '}
                {pagination.total} rendez-vous
                {pagination.total > 1 ? 's' : ''}
              </div>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className='inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='h-4 w-4' />
                  Précédent
                </button>

                <div className='flex items-center gap-1'>
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
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
                          key={`page-${pageNum}-${i}`}
                          onClick={() => handlePageChange(pageNum)}
                          className={`min-w-10 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            pagination.page === pageNum
                              ? 'bg-sky-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className='inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Suivant
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}

          <div className='mt-8 bg-sky-50 border border-sky-200 rounded-lg p-4'>
            <h3 className='font-medium text-sky-800 mb-2 flex items-center'>
              <Info className='mr-2 h-4 w-4' />
              Informations importantes
            </h3>
            <ul className='text-sm text-sky-700 space-y-1'>
              <li>✓ Les rendez-vous annulés apparaissent avec la raison d'annulation</li>
              <li>✓ Vous ne pouvez annuler qu'un rendez-vous Confirmé</li>
              <OctagonAlert className="w-2 h-2 text-red-600" /> Annulation n'est plus possible à moins de 2 heures du rendez-vous
              <li>✓ Pour les rendez-vous Terminés, l'avis administrateur est affiché</li>
              <li>✓ Un rendez-vous Terminé avec avis Favorable peut déclencher une procédure</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={closeCancelModal}
        onConfirm={handleCancelRendezvous}
        rdv={selectedRdvForCancel}
        isCancelling={cancelling}
      />

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
};

export default MesRendezvous;