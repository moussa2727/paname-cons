import React, { useState, useEffect } from 'react';
import {
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  adminProcedureApi,
  Procedure,
  ProcedureStatus,
  StepStatus,
  StepName,
} from '../../api/admin/AdminProcedureService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';

const AdminProcedures: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // États de gestion
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    email: '',
    destination: '',
    statut: '' as ProcedureStatus | '',
  });
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    procedureId: string | null;
    procedureName: string;
  }>({
    isOpen: false,
    procedureId: null,
    procedureName: '',
  });

  // ✅ VÉRIFICATION D'ACCÈS ADMIN
  const isAdmin = isAuthenticated && user?.role === 'admin';

  // ✅ GESTION DES ERREURS D'AUTH
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn('Session expirée détectée dans AdminProcedures');
      toast.error('Session expirée - Veuillez vous reconnecter');
    };

    window.addEventListener('auth-token-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-token-expired', handleAuthExpired);
    };
  }, []);

  // Chargement initial des données
  useEffect(() => {
    if (isAdmin) {
      loadProcedures();
      loadStats();
    }
  }, [pagination.page, pagination.limit, isAdmin]);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (isAdmin) {
      loadProcedures();
    }
  }, [filters, isAdmin]);

  // Chargement des procédures
  const loadProcedures = async () => {
    if (!isAdmin) {
      setError('Accès non autorisé');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminProcedureApi.getProcedures(
        pagination.page,
        pagination.limit,
        {
          email: filters.email || undefined,
          destination: filters.destination || undefined,
          statut: filters.statut || undefined,
        }
      );

      setProcedures(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
    } catch (err: any) {
      console.error('❌ Erreur chargement procédures:', err);
      handleApiError(err, 'le chargement des procédures');
    } finally {
      setLoading(false);
    }
  };

  // Chargement des statistiques
  const loadStats = async () => {
    if (!isAdmin) return;

    try {
      const overview = await adminProcedureApi.getProceduresOverview();
      setStats(overview);
    } catch (err: any) {
      console.error('Erreur chargement stats:', err);
      // Ne pas bloquer l'interface pour les stats
    }
  };

  // Gestion centralisée des erreurs
  const handleApiError = (error: any, context: string) => {
    const safeContext = context.replace(/[a-f0-9-]{24,}/gi, 'id_****');
    
    if (error.message.includes('Session expirée') || error.message.includes('SESSION_EXPIRED')) {
      setError('Session expirée - Veuillez vous reconnecter');
      toast.error('Session expirée - Veuillez vous reconnecter');
    } else if (error.message.includes('Accès refusé') || error.message.includes('ACCESS_DENIED')) {
      setError('Accès refusé - Droits insuffisants');
      toast.error('Accès refusé - Droits insuffisants');
    } else {
      const safeMessage = error.message.replace(/[a-f0-9-]{24,}/gi, 'id_****');
      setError(safeMessage || `Erreur lors de ${safeContext}`);
      toast.error(`Erreur lors de ${safeContext}`);
    }
  };

  // Mise à jour du statut d'une étape
  const handleUpdateStep = async (
    procedureId: string,
    stepName: StepName,
    newStatus: StepStatus,
    reason?: string
  ) => {
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    if (newStatus === StepStatus.REJECTED && (!reason || reason.trim() === '')) {
      toast.error('La raison du rejet est obligatoire');
      return;
    }

    try {
      setActionLoading(`${procedureId}-${stepName}`);

      const updatedProcedure = await adminProcedureApi.updateStepStatus(
        procedureId,
        stepName,
        newStatus,
        reason
      );

      setProcedures(prev =>
        prev.map(p => (p._id === procedureId ? updatedProcedure : p))
      );

      toast.success(`Étape ${stepName} mise à jour avec succès`);
      loadStats(); // Recharger les stats
    } catch (err: any) {
      console.error('❌ Erreur mise à jour étape:', err);
      handleApiError(err, 'la mise à jour de l\'étape');
    } finally {
      setActionLoading(null);
    }
  };

  // Gestion de la suppression
  const handleDeleteClick = (procedure: Procedure) => {
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    setDeleteModal({
      isOpen: true,
      procedureId: procedure._id,
      procedureName: `${procedure.prenom} ${procedure.nom}`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.procedureId || !isAdmin) {
      toast.error('Action non autorisée');
      setDeleteModal({ isOpen: false, procedureId: null, procedureName: '' });
      return;
    }

    try {
      setActionLoading(`delete-${deleteModal.procedureId}`);
      await adminProcedureApi.deleteProcedure(
        deleteModal.procedureId,
        'Supprimé par administrateur'
      );

      setProcedures(prev =>
        prev.filter(p => p._id !== deleteModal.procedureId)
      );
      toast.success('Procédure supprimée avec succès');
      loadStats();
    } catch (err: any) {
      console.error('❌ Erreur suppression:', err);
      handleApiError(err, 'la suppression');
    } finally {
      setActionLoading(null);
      setDeleteModal({ isOpen: false, procedureId: null, procedureName: '' });
    }
  };

  // Rejet d'une procédure
  const handleRejectProcedure = async () => {
    if (!selectedProcedure || !rejectReason.trim() || !isAdmin) {
      toast.error('Données manquantes pour le rejet');
      return;
    }

    try {
      setActionLoading(`reject-${selectedProcedure._id}`);
      await adminProcedureApi.rejectProcedure(selectedProcedure._id, rejectReason);

      setProcedures(prev =>
        prev.map(p =>
          p._id === selectedProcedure._id
            ? { ...p, statut: ProcedureStatus.REJECTED }
            : p
        )
      );

      toast.success('Procédure rejetée avec succès');
      setShowRejectModal(false);
      setRejectReason('');
      loadStats();
    } catch (err: any) {
      console.error('❌ Erreur rejet procédure:', err);
      handleApiError(err, 'le rejet de la procédure');
    } finally {
      setActionLoading(null);
    }
  };

  // Gestion des filtres
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Rendu du statut avec badge coloré
  const renderStatusBadge = (status: ProcedureStatus) => {
    const statusConfig = {
      [ProcedureStatus.IN_PROGRESS]: {
        color: 'bg-blue-100 text-blue-800',
        label: 'En cours',
      },
      [ProcedureStatus.COMPLETED]: {
        color: 'bg-green-100 text-green-800',
        label: 'Terminée',
      },
      [ProcedureStatus.REJECTED]: {
        color: 'bg-red-100 text-red-800',
        label: 'Refusée',
      },
      [ProcedureStatus.CANCELLED]: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Annulée',
      },
    };

    const config = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  // Rendu du statut d'étape
  const renderStepStatus = (status: StepStatus) => {
    const statusConfig = {
      [StepStatus.PENDING]: {
        color: 'bg-gray-100 text-gray-800',
        icon: ClockIcon,
      },
      [StepStatus.IN_PROGRESS]: {
        color: 'bg-blue-100 text-blue-800',
        icon: ClockIcon,
      },
      [StepStatus.COMPLETED]: {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon,
      },
      [StepStatus.REJECTED]: {
        color: 'bg-red-100 text-red-800',
        icon: XCircleIcon,
      },
      [StepStatus.CANCELLED]: {
        color: 'bg-gray-100 text-gray-800',
        icon: XCircleIcon,
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs ${config.color}`}
      >
        <Icon className='w-3 h-3 mr-1' />
        {status}
      </span>
    );
  };

  // Masquage des emails pour la sécurité
  const maskEmail = (email: string): string => {
    if (!email) return '***';
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    return `${name.substring(0, 2)}***@${domain}`;
  };

  // ✅ AFFICHAGE SI NON ADMIN
  if (!isAdmin && !authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-gray-600">
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  // ✅ CHARGEMENT
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestion des Procédures | Paname Consulting</title>
        <meta
          name='description'
          content="Interface d'administration pour gérer les procédures des étudiants"
        />
      </Helmet>

      <div className='min-h-screen bg-slate-50 p-4'>
        {/* En-tête */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>
            Gestion des Procédures
          </h1>
          <p className='text-gray-600'>
            Consultez et gérez toutes les procédures des étudiants
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Connecté en tant que: <strong>{user?.email ? maskEmail(user.email) : 'Administrateur'}</strong>
          </div>
        </div>

        {/* Filtres */}
        <div className='bg-white rounded-lg shadow p-4 mb-6'>
          <div className='flex flex-col lg:flex-row gap-4'>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email
              </label>
              <input
                type='email'
                value={filters.email}
                onChange={e => handleFilterChange('email', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                placeholder='Filtrer par email...'
              />
            </div>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Destination
              </label>
              <input
                type='text'
                value={filters.destination}
                onChange={e => handleFilterChange('destination', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                placeholder='Filtrer par destination...'
              />
            </div>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Statut
              </label>
              <select
                value={filters.statut}
                onChange={e => handleFilterChange('statut', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value=''>Tous les statuts</option>
                {Object.values(ProcedureStatus).map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            <div className='bg-white rounded-lg shadow p-4 border-l-4 border-blue-500'>
              <div className='text-sm text-gray-600'>Total</div>
              <div className='text-2xl font-bold text-blue-600'>
                {stats.total}
              </div>
            </div>
            <div className='bg-white rounded-lg shadow p-4 border-l-4 border-blue-400'>
              <div className='text-sm text-gray-600'>En cours</div>
              <div className='text-2xl font-bold text-blue-500'>
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.IN_PROGRESS)?.count || 0}
              </div>
            </div>
            <div className='bg-white rounded-lg shadow p-4 border-l-4 border-green-500'>
              <div className='text-sm text-gray-600'>Terminées</div>
              <div className='text-2xl font-bold text-green-600'>
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.COMPLETED)?.count || 0}
              </div>
            </div>
            <div className='bg-white rounded-lg shadow p-4 border-l-4 border-red-500'>
              <div className='text-sm text-gray-600'>Rejetées</div>
              <div className='text-2xl font-bold text-red-600'>
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.REJECTED)?.count || 0}
              </div>
            </div>
          </div>
        )}

        {/* Liste des procédures */}
        <div className='bg-white rounded-lg shadow'>
          {error && (
            <div className='bg-red-50 border-l-4 border-red-400 p-4'>
              <div className='flex'>
                <ExclamationTriangleIcon className='h-5 w-5 text-red-400 mr-3' />
                <p className='text-red-700'>{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des procédures...</p>
            </div>
          ) : (
            <>
              <div className='divide-y divide-gray-200'>
                {procedures.map(procedure => (
                  <div
                    key={procedure._id}
                    className='p-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <div className='font-semibold text-gray-900'>
                          {procedure.prenom} {procedure.nom}
                        </div>
                        <div className='text-sm text-gray-500'>
                          {procedure.email}
                        </div>
                        {procedure.telephone && (
                          <div className='text-sm text-gray-500'>
                            {procedure.telephone}
                          </div>
                        )}
                      </div>
                      <div className='ml-4'>
                        {renderStatusBadge(procedure.statut)}
                      </div>
                    </div>

                    <div className='mb-3'>
                      <div className='font-medium text-gray-900'>
                        {procedure.destination}
                      </div>
                      {procedure.filiere && (
                        <div className='text-sm text-gray-500'>
                          {procedure.filiere}
                        </div>
                      )}
                    </div>

                    <div className='flex justify-between items-center'>
                      <div className='text-sm text-gray-500'>
                        Créé le {new Date(procedure.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className='flex space-x-2'>
                        <button
                          onClick={() => {
                            setSelectedProcedure(procedure);
                            setShowDetailModal(true);
                          }}
                          className='text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors'
                          title='Voir les détails'
                        >
                          <EyeIcon className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(procedure)}
                          disabled={actionLoading === `delete-${procedure._id}`}
                          className='text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50'
                          title='Supprimer'
                        >
                          <TrashIcon className='w-5 h-5' />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className='px-4 py-4 flex items-center justify-between border-t border-gray-200'>
                  <div className='flex-1 flex justify-between items-center'>
                    <div>
                      <p className='text-sm text-gray-700'>
                        Page {pagination.page} sur {pagination.totalPages} • {pagination.total} résultats
                      </p>
                    </div>
                    <div className='flex space-x-2'>
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className='px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Précédent
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className='px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {procedures.length === 0 && !loading && (
                <div className='text-center py-12'>
                  <ExclamationTriangleIcon className='mx-auto h-12 w-12 text-gray-400' />
                  <h3 className='mt-4 text-lg font-medium text-gray-900'>
                    Aucune procédure
                  </h3>
                  <p className='mt-2 text-gray-500'>
                    Aucune procédure ne correspond à vos critères de recherche.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal de détail */}
        {showDetailModal && selectedProcedure && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
            <div className='bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
              <div className='px-6 py-4 border-b border-gray-200'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Détails de la procédure
                </h3>
              </div>
              <div className='px-6 py-4 space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Étudiant
                    </label>
                    <p className='text-gray-900'>
                      {selectedProcedure.prenom} {selectedProcedure.nom}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Email
                    </label>
                    <p className='text-gray-900'>
                      {selectedProcedure.email}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Téléphone
                    </label>
                    <p className='text-gray-900'>
                      {selectedProcedure.telephone || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Destination
                    </label>
                    <p className='text-gray-900'>
                      {selectedProcedure.destination}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Filière
                    </label>
                    <p className='text-gray-900'>
                      {selectedProcedure.filiere || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Statut global
                    </label>
                    <div className='mt-1'>
                      {renderStatusBadge(selectedProcedure.statut)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className='text-sm font-medium text-gray-700 mb-3 block'>
                    Étapes de la procédure
                  </label>
                  <div className='space-y-3'>
                    {selectedProcedure.steps.map(step => (
                      <div
                        key={step.nom}
                        className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                      >
                        <div className='flex-1'>
                          <div className='font-medium text-gray-900'>
                            {step.nom}
                          </div>
                          <div className='text-sm text-gray-600'>
                            Dernière mise à jour: {new Date(step.dateMaj).toLocaleDateString('fr-FR')}
                          </div>
                          {step.raisonRefus && (
                            <div className='text-sm text-red-600 mt-1'>
                              Raison: {step.raisonRefus}
                            </div>
                          )}
                        </div>
                        <div className='flex items-center space-x-3 ml-4'>
                          {renderStepStatus(step.statut)}
                          <div className='flex space-x-1'>
                            {step.statut === StepStatus.IN_PROGRESS && (
                              <button
                                onClick={() => {
                                  handleUpdateStep(
                                    selectedProcedure._id,
                                    step.nom,
                                    StepStatus.COMPLETED
                                  );
                                  setShowDetailModal(false);
                                }}
                                className='text-green-600 hover:text-green-800 p-1'
                                title='Marquer comme terminé'
                              >
                                <CheckCircleIcon className='w-5 h-5' />
                              </button>
                            )}
                            {[StepStatus.PENDING, StepStatus.IN_PROGRESS].includes(step.statut) && (
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  setSelectedProcedure(selectedProcedure);
                                  setShowRejectModal(true);
                                }}
                                className='text-red-600 hover:text-red-800 p-1'
                                title='Rejeter'
                              >
                                <XCircleIcon className='w-5 h-5' />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className='px-6 py-4 border-t border-gray-200 flex justify-end'>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rejet */}
        {showRejectModal && selectedProcedure && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
            <div className='bg-white rounded-lg w-full max-w-md'>
              <div className='px-6 py-4 border-b border-gray-200'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Rejeter la procédure
                </h3>
              </div>
              <div className='px-6 py-4'>
                <p className='text-gray-600 mb-4'>
                  Raison du rejet pour {selectedProcedure.prenom} {selectedProcedure.nom}:
                </p>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder='Saisissez la raison du rejet...'
                  rows={4}
                  className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </div>
              <div className='px-6 py-4 border-t border-gray-200 flex flex-col space-y-2'>
                <button
                  onClick={handleRejectProcedure}
                  disabled={!rejectReason.trim() || actionLoading === `reject-${selectedProcedure._id}`}
                  className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {actionLoading === `reject-${selectedProcedure._id}`
                    ? 'Rejet en cours...'
                    : 'Confirmer le rejet'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className='px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors'
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de suppression */}
        {deleteModal.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
            <div className='bg-white rounded-lg w-full max-w-md'>
              <div className='px-6 py-4 border-b border-gray-200'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Confirmer la suppression
                </h3>
              </div>
              <div className='px-6 py-4'>
                <p className='text-gray-600'>
                  Êtes-vous sûr de vouloir supprimer la procédure de{' '}
                  <strong>{deleteModal.procedureName}</strong> ? Cette action est irréversible.
                </p>
              </div>
              <div className='px-6 py-4 border-t border-gray-200 flex flex-col space-y-2'>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading === `delete-${deleteModal.procedureId}`}
                  className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors'
                >
                  {actionLoading
                    ? 'Suppression...'
                    : 'Confirmer la suppression'}
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, procedureId: null, procedureName: '' })}
                  className='px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors'
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminProcedures;