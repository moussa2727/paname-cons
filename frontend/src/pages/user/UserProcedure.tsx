import React, { useState, useEffect, useCallback } from 'react';
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
  formatShortDate,
  getDisplayDestination,
  getDisplayFiliere,
  getUserFullName,
  getStepDescription,
  canCancelProcedure,
  hasRendezvousInfo,
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
  MapPin,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserHeader } from '../../components/user/UserHeader';
import { toast } from 'react-toastify';

// ==================== COMPOSANT MODAL DE CONFIRMATION ====================
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmText: string;
  confirmColor?: 'red' | 'blue' | 'green' | 'gray';
  cancelText?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  confirmColor = 'red',
  cancelText = 'Annuler',
  isLoading = false,
  children,
}) => {
  if (!isOpen) return null;

  const getColorClasses = () => {
    switch (confirmColor) {
      case 'red':
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-300';
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300';
      case 'green':
        return 'bg-green-500 hover:bg-green-600 focus:ring-green-300';
      case 'gray':
        return 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-300';
      default:
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-300';
    }
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0'>
        {/* Overlay */}
        <div
          className='fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75'
          onClick={onClose}
        />

        <span
          className='hidden sm:inline-block sm:align-middle sm:h-screen'
          aria-hidden='true'
        >
          &#8203;
        </span>

        {/* Modal content */}
        <div className='inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
          <div className='bg-white px-6 pt-6 pb-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold text-gray-900'>{title}</h3>
              <button
                onClick={onClose}
                className='text-gray-400 hover:text-gray-500 transition-colors p-1'
                disabled={isLoading}
              >
                <X className='w-6 h-6' />
              </button>
            </div>

            {children}
          </div>

          <div className='bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3'>
            <button
              type='button'
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full sm:w-auto px-6 py-3 ${getColorClasses()} text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
              {confirmText}
            </button>

            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50'
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANTS RÉUTILISABLES ====================

const LoadingScreen = ({ message = 'Chargement...' }: { message?: string }) => (
  <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4'></div>
      <p className='text-gray-600'>{message}</p>
    </div>
  </div>
);

interface ProcedureModalProps {
  procedure: UserProcedure;
  onClose: () => void;
  onCancel: (procedureId: string) => void;
  onViewRendezvous: () => void;
  isLoading?: boolean;
}

const ProcedureModal: React.FC<ProcedureModalProps> = ({
  procedure,
  onClose,
  onCancel,
  onViewRendezvous,
  isLoading = false,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(
    {}
  );
  const progress = getProgressStatus(procedure);
  const canCancelProc = canCancelProcedure(procedure);

  const getStepStatusIcon = (statut: StepStatus): React.JSX.Element => {
    switch (statut) {
      case StepStatus.COMPLETED:
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case StepStatus.IN_PROGRESS:
        return <Clock className='w-4 h-4 text-blue-600' />;
      case StepStatus.REJECTED:
        return <XCircle className='w-4 h-4 text-red-600' />;
      case StepStatus.CANCELLED:
        return <XCircle className='w-4 h-4 text-gray-600' />;
      default:
        return <Clock className='w-4 h-4 text-yellow-600' />;
    }
  };

  const toggleStepExpansion = (stepName: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepName]: !prev[stepName],
    }));
  };

  const toggleAllSteps = () => {
    const allExpanded = Object.values(expandedSteps).every(Boolean);
    const newState: Record<string, boolean> = {};
    procedure.steps.forEach(step => {
      newState[step.nom] = !allExpanded;
    });
    setExpandedSteps(newState);
  };

  if (isLoading) {
    return (
      <div className='text-center py-12'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-4'></div>
        <p className='text-gray-600'>Chargement des détails...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* En-tête avec actions - Mobile First */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200'>
        <div className='flex-1'>
          <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
            Détails de la procédure
          </h2>
          <p className='text-sm text-gray-500 mt-1 flex items-center gap-2'>
            <Info className='w-3 h-3 flex-shrink-0' />
            <span className='truncate'>ID: {procedure._id.slice(-8)}</span>
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={onClose}
            className='p-2.5 text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 rounded-lg touch-manipulation'
            title='Fermer'
            aria-label='Fermer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Carte principale - Mobile First */}
      <div className='bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-4 sm:p-5 border border-sky-100'>
        <div className='flex flex-col lg:flex-row lg:items-start justify-between gap-4'>
          <div className='flex-1'>
            <div className='flex items-start gap-3 mb-3'>
              <div className='p-2.5 bg-white rounded-xl shadow-sm border border-sky-200 flex-shrink-0'>
                <MapPin className='w-6 h-6 text-sky-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='text-xl sm:text-2xl font-bold text-gray-900 break-words'>
                  {getDisplayDestination(procedure)}
                </h3>
                <p className='text-gray-600 flex items-center gap-2 mt-1 text-sm sm:text-base'>
                  <GraduationCap className='w-4 h-4 flex-shrink-0' />
                  <span className='truncate'>{getDisplayFiliere(procedure)} • {procedure.niveauEtude}</span>
                </p>
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold border whitespace-nowrap ${getProcedureStatusColor(procedure.statut).bg} ${getProcedureStatusColor(procedure.statut).text} ${getProcedureStatusColor(procedure.statut).border}`}
          >
            {getProcedureDisplayStatus(procedure.statut)}
          </span>
        </div>

        <div className='mt-4 pt-4 border-t border-sky-200'>
          <div className='flex items-center justify-between text-sm text-gray-600 mb-1'>
            <span className='font-medium'>Date de création</span>
            <span className='font-semibold'>
              {formatProcedureDate(procedure.createdAt)}
            </span>
          </div>
          {procedure.dateCompletion && (
            <div className='flex items-center justify-between text-sm text-gray-600'>
              <span className='font-medium'>Date de complétion</span>
              <span className='font-semibold'>
                {formatProcedureDate(procedure.dateCompletion)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div className='bg-white rounded-2xl p-5 shadow-sm border border-gray-200'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h4 className='font-semibold text-gray-800'>Progression globale</h4>
            <p className='text-sm text-gray-500'>
              Suivi de l'avancement de votre dossier
            </p>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden'>
            <div
              className='bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-700'
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          {progress.currentStep && (
            <div className='flex flex-col sm:flex-row sm:items-center justify-between text-sm mt-3 gap-1'>
              <span className='text-gray-600'>Étape actuelle :</span>
              <span className='font-medium text-sky-600 text-right break-words'>
                {getStepDisplayName(progress.currentStep.nom)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Étapes détaillées - Mobile First */}
      <div className='bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4'>
          <div>
            <h4 className='font-semibold text-gray-800 text-lg'>
              Étapes de la procédure
            </h4>
            <p className='text-sm text-gray-500'>
              Suivi détaillé de chaque phase
            </p>
          </div>
          <button
            onClick={toggleAllSteps}
            className='text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 self-start sm:self-auto touch-manipulation'
            aria-label={Object.values(expandedSteps).every(Boolean) ? 'Réduire toutes les étapes' : 'Développer toutes les étapes'}
          >
            {Object.values(expandedSteps).every(Boolean)
              ? 'Tout réduire'
              : 'Tout développer'}
            {Object.values(expandedSteps).every(Boolean) ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </button>
        </div>

        <div className='space-y-3'>
          {procedure.steps.map((step: Step, index: number) => (
            <div
              key={step.nom}
              className={`rounded-xl border transition-all duration-200 ${
                step.statut === StepStatus.COMPLETED
                  ? 'border-green-200 bg-green-50'
                  : step.statut === StepStatus.IN_PROGRESS
                    ? 'border-blue-200 bg-blue-50'
                    : step.statut === StepStatus.REJECTED
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white'
              } ${expandedSteps[step.nom] ? 'shadow-sm' : ''}`}
            >
              <div
                className='flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-white/50 transition-colors touch-manipulation'
                onClick={() => toggleStepExpansion(step.nom)}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleStepExpansion(step.nom)}
              >
                <div className='flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white border shadow-sm flex-shrink-0'>
                  {getStepStatusIcon(step.statut)}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
                    <div>
                      <h5 className='font-semibold text-gray-800 text-sm sm:text-base break-words'>
                        Étape {index + 1} • {getStepDisplayName(step.nom)}
                      </h5>
                      <div className='text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2 sm:gap-3'>
                        <span className='flex items-center gap-1'>
                          <Calendar className='w-3 h-3' />
                          Début: {formatShortDate(step.dateCreation)}
                        </span>
                        {step.dateCompletion && (
                          <span className='flex items-center gap-1'>
                            <CheckCircle className='w-3 h-3' />
                            Fin: {formatShortDate(step.dateCompletion)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStepStatusColor(step.statut).bg} ${getStepStatusColor(step.statut).text} ${getStepStatusColor(step.statut).border}`}
                      >
                        {getStepDisplayStatus(step.statut)}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedSteps[step.nom] ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {expandedSteps[step.nom] && (
                <div className='px-4 pb-4 pt-2 border-t border-gray-200/50'>
                  <div className='bg-white rounded-lg p-4 border border-gray-100'>
                    <div className='space-y-3'>
                      <div>
                        <h6 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>
                          Description
                        </h6>
                        <p className='text-sm text-gray-700'>
                          {getStepDescription(step.nom)}
                        </p>
                      </div>

                      {step.raisonRefus && (
                        <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                          <div className='flex items-start gap-2'>
                            <AlertTriangle className='w-5 h-5 text-red-500 shrink-0 mt-0.5' />
                            <div className='flex-1'>
                              <h6 className='text-sm font-bold text-red-700 mb-1'>
                                Raison du refus
                              </h6>
                              <p className='text-sm text-red-600'>
                                {step.raisonRefus}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className='grid grid-cols-2 gap-3 pt-2'>
                        <div className='bg-gray-50 rounded-lg p-3'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Statut initial
                          </p>
                          <p className='text-sm font-medium text-gray-800'>
                            En attente
                          </p>
                        </div>
                        <div className='bg-gray-50 rounded-lg p-3'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Dernière mise à jour
                          </p>
                          <p className='text-sm font-medium text-gray-800'>
                            {formatShortDate(step.dateMaj)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Informations personnelles - Mobile First */}
      <div className='bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-300'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2.5 bg-white rounded-xl shadow-sm border border-gray-300 flex-shrink-0'>
            <User className='w-6 h-6 text-gray-600' />
          </div>
          <div className='flex-1 min-w-0'>
            <h4 className='font-semibold text-gray-800 text-lg'>
              Informations personnelles
            </h4>
            <p className='text-sm text-gray-500'>
              Données associées à votre dossier
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='bg-white rounded-xl p-4 border border-gray-200'>
            <div className='flex items-center gap-2 mb-3'>
              <User className='w-4 h-4 text-gray-500' />
              <h5 className='text-sm font-semibold text-gray-700'>Identité</h5>
            </div>
            <div className='space-y-2'>
              <div>
                <p className='text-xs text-gray-500'>Nom complet</p>
                <p className='text-sm font-bold text-gray-900'>
                  {getUserFullName(procedure)}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Email</p>
                <p className='text-sm font-medium text-gray-800 flex items-center gap-1'>
                  <Mail className='w-3 h-3' />
                  {procedure.email}
                </p>
              </div>
            </div>
          </div>

          {procedure.telephone && (
            <div className='bg-white rounded-xl p-4 border border-gray-200'>
              <div className='flex items-center gap-2 mb-3'>
                <Phone className='w-4 h-4 text-gray-500' />
                <h5 className='text-sm font-semibold text-gray-700'>Contact</h5>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Téléphone</p>
                <p className='text-sm font-medium text-gray-800 flex items-center gap-1'>
                  <Phone className='w-3 h-3' />
                  {procedure.telephone}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informations rendez-vous associé */}
      {hasRendezvousInfo(procedure) && (
        <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-200'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2.5 bg-white rounded-xl shadow-sm border border-blue-200 flex-shrink-0'>
              <Calendar className='w-6 h-6 text-blue-500' />
            </div>
            <div className='flex-1 min-w-0'>
              <h4 className='font-semibold text-gray-800 text-lg'>
                Rendez-vous associé
              </h4>
              <p className='text-sm text-gray-500'>
                Cette procédure découle d'un rendez-vous préalable
              </p>
            </div>
          </div>

          <div className='bg-white/80 rounded-xl p-4 border border-blue-200'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-700 truncate'>
                  Rendez-vous initial
                </p>
                <p className='text-xs text-gray-500'>
                  Tous les détails sont disponibles
                </p>
              </div>
              <ExternalLink className='w-5 h-5 text-blue-500 flex-shrink-0' />
            </div>
            <button
              onClick={onViewRendezvous}
              className='w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all font-medium shadow-sm flex items-center justify-center gap-2 touch-manipulation'
              aria-label='Consulter le rendez-vous associé'
            >
              <Eye className='w-4 h-4' />
              Consulter le rendez-vous
            </button>
          </div>
        </div>
      )}

      {/* Raison du rejet */}
      {procedure.raisonRejet && (
        <div className='bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 shadow-sm border border-orange-200'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2.5 bg-white rounded-xl shadow-sm border border-orange-200'>
              <AlertTriangle className='w-6 h-6 text-orange-500' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-800'>
                Information importante
              </h4>
              <p className='text-sm text-gray-500'>
                Cette procédure a été rejetée
              </p>
            </div>
          </div>

          <div className='bg-white/80 rounded-xl p-4 border border-orange-200'>
            <h5 className='text-sm font-bold text-orange-700 mb-2'>
              Raison du rejet :
            </h5>
            <p className='text-sm text-orange-600'>{procedure.raisonRejet}</p>
            <p className='text-xs text-orange-500 mt-3'>
              Pour plus d'informations, contactez notre service client.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className='space-y-4'>
        {canCancelProc && (
          <div className='bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 sm:p-5 shadow-sm border border-red-200'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2.5 bg-white rounded-xl shadow-sm border border-red-200 flex-shrink-0'>
                <Trash2 className='w-6 h-6 text-red-500' />
              </div>
              <div>
                <h4 className='font-semibold text-gray-800'>
                  Annulation de procédure
                </h4>
                <p className='text-sm text-gray-500'>
                  Action définitive et irréversible
                </p>
              </div>
            </div>

            <div className='space-y-3'>
              <button
                onClick={() => onCancel(procedure._id)}
                className='w-full px-4 py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all font-bold shadow-sm flex items-center justify-center gap-2'
              >
                <Trash2 className='w-5 h-5' />
                Annuler cette procédure
              </button>
              <div className='bg-white/80 rounded-lg p-3 border border-red-200'>
                <p className='text-xs text-gray-600 text-center'>
                  Attention : L'annulation est définitive. Vous pourrez toujours
                  consulter les détails de la procédure annulée.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nouveau rendez-vous */}
        <div className='bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-5 shadow-sm border border-emerald-200'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2.5 bg-white rounded-xl shadow-sm border border-emerald-200'>
              <Calendar className='w-6 h-6 text-emerald-500' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-800'>Nouveau projet</h4>
              <p className='text-sm text-gray-500'>
                Démarrez une nouvelle procédure
              </p>
            </div>
          </div>

          <button className='w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all font-bold shadow-sm'>
            Prendre un nouveau rendez-vous
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

const UserProcedureComponent = (): React.JSX.Element => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [headerHeight, setHeaderHeight] = useState(0);

  // === CONFIGURATION ===
  const currentPage = {
    title: 'Mes Procédures',
    subtitle: "Suivez et gérez vos dossiers d'étude à l'étranger",
    pageTitle: 'Mes Procédures - Paname Consulting',
    description:
      "Suivez l'avancement de vos dossiers d'étude à l'étranger avec Paname Consulting",
  };

  // === ÉTATS ===
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [selectedProcedure, setSelectedProcedure] =
    useState<UserProcedure | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ProcedureStatus | 'ALL'>(
    'ALL'
  );
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showMobileDetails, setShowMobileDetails] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [procedureToCancel, setProcedureToCancel] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'destination'>(
    'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const limit = 8;

  // === HOOKS ===
  const {
    procedures: paginatedProcedures,
    loading: proceduresLoading,
    error: proceduresError,
    refetch: refetchProcedures,
    total: totalProcedures,
    totalPages,
  } = useUserProcedures(currentPageNum, limit);

  const {
    procedure: detailedProcedure,
    loading: detailsLoading,
    refetch: refetchDetails,
  } = useProcedureDetails(selectedProcedure?._id || null);

  const { cancelProcedure, loading: cancelLoading } = useCancelProcedure();

  // États pour l'animation et la confirmation améliorée
  const [showImpactSummary, setShowImpactSummary] = useState(false);
  const [impactedSteps, setImpactedSteps] = useState<Step[]>([]);

  // === REDIRECTION SI NON AUTHENTIFIÉ ===
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    }
  }, [isAuthenticated, navigate]);

  // === SYNC DES DÉTAILS ===
  useEffect(() => {
    if (
      selectedProcedure &&
      detailedProcedure &&
      selectedProcedure._id === detailedProcedure._id
    ) {
      setSelectedProcedure(detailedProcedure);
    }
  }, [detailedProcedure, selectedProcedure]);

  // === FONCTIONS ===
  const getStepStatusIcon = (statut: StepStatus): React.JSX.Element => {
    switch (statut) {
      case StepStatus.COMPLETED:
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case StepStatus.IN_PROGRESS:
        return <Clock className='w-4 h-4 text-blue-600' />;
      case StepStatus.REJECTED:
        return <XCircle className='w-4 h-4 text-red-600' />;
      case StepStatus.CANCELLED:
        return <XCircle className='w-4 h-4 text-gray-600' />;
      default:
        return <Clock className='w-4 h-4 text-yellow-600' />;
    }
  };

  const handleSelectProcedure = useCallback(
    (procedure: UserProcedure): void => {
      setSelectedProcedure(procedure);
      if (window.innerWidth < 1024) {
        setShowMobileDetails(true);
        document.body.style.overflow = 'hidden';
      }
    },
    []
  );

  const handleCloseDetails = useCallback((): void => {
    setSelectedProcedure(null);
    setShowMobileDetails(false);
    document.body.style.overflow = 'unset';
  }, []);

  const handleRefresh = async () => {
    try {
      await refetchProcedures();
      if (selectedProcedure) {
        await refetchDetails();
      }
      toast.success('Données actualisées avec succès');
    } catch (error: unknown) {
      toast.error((error as Error).message || "Erreur lors de l'actualisation");
    }
  };

  const handleInitiateCancel = (procedureId: string) => {
    const procedure =
      paginatedProcedures?.data?.find(p => p._id === procedureId) ||
      selectedProcedure;

    if (procedure) {
      // Calculer les étapes impactées
      const impacted = procedure.steps.filter(s =>
        [StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(s.statut)
      );
      setImpactedSteps(impacted);
      setProcedureToCancel(procedureId);
      setCancelReason('');
      setShowImpactSummary(true);
    }
  };

  const handleProceedToCancel = () => {
    setShowImpactSummary(false);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!procedureToCancel) return;

    try {
      // Animation de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await cancelProcedure(
        procedureToCancel,
        cancelReason || undefined
      );

      if (result.success) {
        toast.success(
          `${impactedSteps.length} étape(s) annulée(s) avec succès`
        );
        setShowCancelModal(false);
        setProcedureToCancel(null);
        setCancelReason('');
        setImpactedSteps([]);

        // Rafraîchir les données
        await refetchProcedures();
        if (selectedProcedure) {
          await refetchDetails();
        }
      } else {
        toast.error(result.error || "Erreur lors de l'annulation");
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "Erreur lors de l'annulation");
    }
  };


  const handleViewRendezvous = () => {
    if (selectedProcedure?.rendezVousId) {
      const rendezvousId =
        typeof selectedProcedure.rendezVousId === 'string'
          ? selectedProcedure.rendezVousId
          : selectedProcedure.rendezVousId._id;
      navigate(`/rendez-vous/${rendezvousId}`);
    }
  };

  const handleNewRendezvous = () => {
    navigate('/rendez-vous');
  };

  // === FILTRES ET TRI ===
  const filteredProcedures = (paginatedProcedures?.data || []).filter(
    (procedure: UserProcedure) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        procedure.destination.toLowerCase().includes(searchLower) ||
        procedure.nom.toLowerCase().includes(searchLower) ||
        procedure.prenom.toLowerCase().includes(searchLower) ||
        procedure.email.toLowerCase().includes(searchLower) ||
        (procedure.destinationAutre?.toLowerCase() || '').includes(
          searchLower
        ) ||
        (procedure.filiere?.toLowerCase() || '').includes(searchLower);

      const matchesStatus =
        statusFilter === 'ALL' || procedure.statut === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  const sortedProcedures = [...filteredProcedures].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'status': {
        const statusOrder = {
          [ProcedureStatus.IN_PROGRESS]: 1,
          [ProcedureStatus.COMPLETED]: 2,
          [ProcedureStatus.REJECTED]: 3,
          [ProcedureStatus.CANCELLED]: 4,
        };
        comparison =
          (statusOrder[a.statut] || 5) - (statusOrder[b.statut] || 5);
        break;
      }
      case 'destination':
        comparison = a.destination.localeCompare(b.destination);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // === HEADER HEIGHT ===
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      setHeaderHeight(header.offsetHeight);
    }
  }, []);

  // === GESTION DU SCROLL MOBILE ===
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!isAuthenticated) {
    return <LoadingScreen message='Redirection vers la connexion...' />;
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
        onRefresh={handleRefresh}
      >
        <div className='mt-3 space-y-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Rechercher par destination, nom, email...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm'
            />
          </div>

          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className='flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400'
              >
                <Filter className='w-4 h-4' />
                <span className='font-medium'>Filtrer et Trier</span>
              </button>

              <div className='flex items-center gap-2'>
                <span className='text-sm text-gray-500 font-medium'>
                  {totalProcedures} procédure{totalProcedures !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {showFilters && (
              <div className='space-y-3 bg-white p-4 rounded-xl border border-gray-300 shadow-sm'>
                <div>
                  <label className='block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide'>
                    Filtrer par statut
                  </label>
                  <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
                    {['ALL', ...Object.values(ProcedureStatus)].map(status => (
                      <button
                        key={status}
                        onClick={() =>
                          setStatusFilter(status as ProcedureStatus | 'ALL')
                        }
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === status
                            ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {status === 'ALL'
                          ? 'Toutes'
                          : getProcedureDisplayStatus(
                              status as ProcedureStatus
                            )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide'>
                      Trier par
                    </label>
                    <select
                      value={sortBy}
                      onChange={e =>
                        setSortBy(
                          e.target.value as 'date' | 'status' | 'destination'
                        )
                      }
                      className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white'
                    >
                      <option value='date'>Date de création</option>
                      <option value='status'>Statut</option>
                      <option value='destination'>Destination</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide'>
                      Ordre
                    </label>
                    <select
                      value={sortOrder}
                      onChange={e =>
                        setSortOrder(e.target.value as 'asc' | 'desc')
                      }
                      className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white'
                    >
                      <option value='desc'>Décroissant</option>
                      <option value='asc'>Croissant</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </UserHeader>

      {/* Contenu principal */}
      <div
        className='min-h-screen bg-gradient-to-b from-sky-50 to-white'
        style={{ paddingTop: `${headerHeight + 20}px` }}
      >
        <main className='p-4 max-w-7xl mx-auto'>
          {proceduresLoading && currentPageNum === 1 ? (
            <div className='bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200'>
              <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-sky-500 mx-auto mb-6'></div>
              <p className='text-gray-600 text-lg font-medium'>
                Chargement de vos procédures...
              </p>
              <p className='text-gray-500 text-sm mt-2'>
                Veuillez patienter quelques instants
              </p>
            </div>
          ) : proceduresError ? (
            <div className='bg-white rounded-2xl shadow-lg p-8 text-center border border-red-200'>
              <div className='w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6'>
                <AlertCircle className='w-10 h-10 text-red-500' />
              </div>
              <h3 className='text-2xl font-bold text-gray-800 mb-3'>
                Erreur de chargement
              </h3>
              <p className='text-gray-600 mb-6 max-w-md mx-auto'>
                {proceduresError}
              </p>
              <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                <button
                  onClick={() => refetchProcedures()}
                  className='px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl hover:from-sky-600 hover:to-blue-600 transition-colors font-bold shadow-md'
                >
                  Réessayer le chargement
                </button>
                <button
                  onClick={() => navigate('/support')}
                  className='px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium'
                >
                  Contacter le support
                </button>
              </div>
            </div>
          ) : sortedProcedures.length > 0 ? (
            <div className='lg:grid lg:grid-cols-3 lg:gap-8'>
              {/* Liste des procédures */}
              <div
                className={`lg:col-span-2 space-y-6 ${showMobileDetails ? 'hidden lg:block' : 'block'}`}
              >
                <div className='flex items-center justify-between mb-2'>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    Vos procédures
                    <span className='text-gray-500 text-lg font-normal ml-2'>
                      ({filteredProcedures.length} sur {totalProcedures})
                    </span>
                  </h2>
                  <div className='flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-300'>
                    <Calendar className='w-4 h-4' />
                    <span>
                      Page {currentPageNum} sur {totalPages}
                    </span>
                  </div>
                </div>

                {sortedProcedures.map((procedure: UserProcedure) => {
                  const progress = getProgressStatus(procedure);
                  const canCancelProc = canCancelProcedure(procedure);

                  return (
                    <div
                      key={procedure._id}
                      className='group bg-white rounded-2xl shadow-lg border border-gray-300 p-5 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-sky-300 hover:-translate-y-0.5'
                      onClick={() => handleSelectProcedure(procedure)}
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-3 mb-3'>
                            <div className='p-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-xl'>
                              <MapPin className='w-5 h-5 text-sky-600' />
                            </div>
                            <div>
                              <h3 className='font-bold text-gray-900 text-lg group-hover:text-sky-700 transition-colors'>
                                {getDisplayDestination(procedure)}
                              </h3>
                              <div className='flex items-center gap-2 mt-1'>
                                <GraduationCap className='w-4 h-4 text-gray-500' />
                                <span className='text-gray-600 text-sm'>
                                  {getDisplayFiliere(procedure)}
                                </span>
                                <span className='text-gray-400 text-sm'>•</span>
                                <span className='text-gray-600 text-sm'>
                                  {procedure.niveauEtude}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center gap-4 text-sm text-gray-600'>
                            <div className='flex items-center gap-1'>
                              <User className='w-4 h-4' />
                              <span>{getUserFullName(procedure)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Calendar className='w-4 h-4' />
                              <span>
                                {formatShortDate(procedure.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className='flex flex-col items-end gap-2 shrink-0 ml-4'>
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getProcedureStatusColor(procedure.statut).bg} ${getProcedureStatusColor(procedure.statut).text} ${getProcedureStatusColor(procedure.statut).border}`}
                          >
                            {getProcedureDisplayStatus(procedure.statut)}
                          </span>
                          <ChevronRight className='w-5 h-5 text-gray-400 group-hover:text-sky-500 transition-colors' />
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className='mb-4'>
                        <div className='flex justify-between text-sm font-medium text-gray-700 mb-2'>
                          <span>Avancement</span>
                          <span className='text-sky-600 font-bold'>
                            {progress.completed}/{progress.total} étapes •{' '}
                            {progress.percentage}%
                          </span>
                        </div>
                        <div className='w-full bg-gray-200 rounded-full h-2.5'>
                          <div
                            className='bg-gradient-to-r from-sky-500 to-blue-500 h-2.5 rounded-full transition-all duration-500 group-hover:from-sky-600 group-hover:to-blue-600'
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Étapes et actions */}
                      <div className='flex items-center justify-between pt-4 border-t border-gray-200'>
                        <div className='space-y-2 flex-1'>
                          {procedure.steps.slice(0, 2).map((step: Step) => (
                            <div
                              key={step.nom}
                              className='flex items-center gap-3'
                            >
                              <div className='shrink-0'>
                                {getStepStatusIcon(step.statut)}
                              </div>
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-sm font-medium text-gray-800 truncate'>
                                    {getStepDisplayName(step.nom)}
                                  </span>
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ml-2 ${getStepStatusColor(step.statut).bg} ${getStepStatusColor(step.statut).text} ${getStepStatusColor(step.statut).border}`}
                                  >
                                    {getStepDisplayStatus(step.statut)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {canCancelProc && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleInitiateCancel(procedure._id);
                            }}
                            className='ml-4 px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-300 rounded-xl transition-colors flex items-center gap-2 font-medium shadow-sm'
                          >
                            <Trash2 className='w-4 h-4' />
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-300'>
                    <div className='text-sm text-gray-600'>
                      Affichage de{' '}
                      <span className='font-bold'>
                        {sortedProcedures.length}
                      </span>{' '}
                      procédure{sortedProcedures.length !== 1 ? 's' : ''} sur{' '}
                      <span className='font-bold'>{totalProcedures}</span>
                    </div>

                    <div className='flex items-center gap-3'>
                      <button
                        onClick={() =>
                          setCurrentPageNum(prev => Math.max(1, prev - 1))
                        }
                        disabled={currentPageNum === 1}
                        className='px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-sm'
                      >
                        <ChevronLeft className='w-5 h-5' />
                        Précédent
                      </button>

                      <div className='flex items-center gap-1'>
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPageNum <= 3) {
                              pageNum = i + 1;
                            } else if (currentPageNum >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPageNum - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPageNum(pageNum)}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                                  currentPageNum === pageNum
                                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPageNum(prev =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPageNum === totalPages}
                        className='px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-sm'
                      >
                        Suivant
                        <ChevronRight className='w-5 h-5' />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Détails de la procédure (Desktop) */}
              {selectedProcedure && (
                <div className='hidden lg:block lg:col-span-1'>
                  <div className='bg-white rounded-2xl shadow-xl border border-gray-300 p-6 sticky top-6 max-h-[calc(100vh-140px)] overflow-y-auto'>
                    <ProcedureModal
                      procedure={selectedProcedure}
                      onClose={handleCloseDetails}
                      onCancel={handleInitiateCancel}
                      onViewRendezvous={handleViewRendezvous}
                      isLoading={detailsLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Aucune procédure trouvée
            <div className='bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-300'>
              <div className='w-24 h-24 bg-gradient-to-r from-sky-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg'>
                <FileText className='w-12 h-12 text-sky-500' />
              </div>
              <h3 className='text-3xl font-bold text-gray-900 mb-4'>
                Aucune procédure trouvée
              </h3>
              <p className='text-gray-600 mb-8 max-w-md mx-auto text-lg'>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Aucune procédure ne correspond à vos critères de recherche ou de filtre.'
                  : "Vous n'avez aucune procédure en cours. Commencez par prendre un rendez-vous pour démarrer votre projet d'étude à l'étranger."}
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                {(searchTerm || statusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setShowFilters(false);
                    }}
                    className='px-8 py-3.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors font-bold shadow-md'
                  >
                    Réinitialiser les filtres
                  </button>
                )}
                <button
                  onClick={handleNewRendezvous}
                  className='px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl hover:from-sky-600 hover:to-blue-600 transition-all font-bold shadow-lg'
                >
                  Prendre un rendez-vous
                </button>
              </div>
              <p className='text-gray-500 text-sm mt-8'>
                Besoin d'aide ?{' '}
                <button
                  onClick={() => navigate('/support')}
                  className='text-sky-600 hover:text-sky-700 font-medium'
                >
                  Contactez notre équipe
                </button>
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Version mobile pour les détails */}
      {showMobileDetails && selectedProcedure && (
        <div className='lg:hidden fixed inset-0 bg-white z-50 overflow-y-auto'>
          <div className='sticky top-0 bg-white border-b border-gray-300 p-4 flex items-center justify-between shadow-sm z-10'>
            <button
              onClick={handleCloseDetails}
              className='p-2 text-gray-500 hover:text-gray-700 transition-colors'
            >
              <ChevronLeft className='w-6 h-6' />
            </button>
            <h3 className='text-lg font-bold text-gray-900'>
              Détails de la procédure
            </h3>
            <div className='w-10'></div>
          </div>
          <div className='p-4 pb-8'>
            <ProcedureModal
              procedure={selectedProcedure}
              onClose={handleCloseDetails}
              onCancel={handleInitiateCancel}
              onViewRendezvous={handleViewRendezvous}
              isLoading={detailsLoading}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmation d'annulation */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setProcedureToCancel(null);
          setCancelReason('');
        }}
        onConfirm={handleConfirmCancel}
        title='Annuler la procédure'
        confirmText={
          cancelLoading ? 'Annulation en cours...' : "Confirmer l'annulation"
        }
        confirmColor='red'
        cancelText='Retour'
        isLoading={cancelLoading}
      >
        <div className='space-y-6'>
          <div className='flex items-start gap-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-300 rounded-2xl'>
            <div className='p-3 bg-white rounded-xl border border-red-300'>
              <AlertTriangle className='w-8 h-8 text-red-500' />
            </div>
            <div>
              <h4 className='font-bold text-red-700 text-lg mb-2'>
                Attention : action irréversible
              </h4>
              <p className='text-red-600'>
                L'annulation de cette procédure est définitive. Une fois
                annulée, vous ne pourrez plus :
              </p>
              <ul className='list-disc list-inside text-red-600 text-sm mt-2 space-y-1'>
                <li>Reprendre les étapes en cours</li>
                <li>Modifier les informations de la procédure</li>
                <li>Recevoir de nouvelles notifications</li>
              </ul>
            </div>
          </div>

          <div className='bg-white border border-gray-300 rounded-2xl p-5'>
            <h5 className='font-bold text-gray-800 mb-4 text-lg'>
              Raison de l'annulation (optionnelle)
            </h5>
            <div className='space-y-3'>
              <div className='bg-gray-50 p-4 rounded-xl border border-gray-300'>
                <p className='text-sm text-gray-600 mb-2'>
                  Votre feedback nous aide à améliorer nos services.
                  Partagez-nous pourquoi vous annulez cette procédure :
                </p>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder='Exemples : Changement de projet, Problèmes de financement, Difficultés administratives...'
                  className='w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none bg-white'
                  rows={4}
                  maxLength={500}
                />
                <div className='flex justify-between items-center mt-2'>
                  <p className='text-xs text-gray-500'>
                    Minimum 5 caractères recommandé
                  </p>
                  <span
                    className={`text-sm font-medium ${cancelReason.length > 500 ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {cancelReason.length}/500
                  </span>
                </div>
              </div>

              <div className='bg-blue-50 p-4 rounded-xl border border-blue-300'>
                <div className='flex items-start gap-2'>
                  <Info className='w-5 h-5 text-blue-500 shrink-0 mt-0.5' />
                  <div>
                    <p className='text-sm font-medium text-blue-700 mb-1'>
                      Information importante
                    </p>
                    <p className='text-sm text-blue-600'>
                      Vous pourrez toujours consulter les détails de la
                      procédure annulée dans votre historique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConfirmationModal>

      {/* Modal de résumé d'impact */}
      <ConfirmationModal
        isOpen={showImpactSummary}
        onClose={() => {
          setShowImpactSummary(false);
          setProcedureToCancel(null);
          setImpactedSteps([]);
        }}
        onConfirm={handleProceedToCancel}
        title="Résumé de l'annulation"
        confirmText="Continuer vers l'annulation"
        confirmColor='red'
        cancelText='Retour'
      >
        <div className='space-y-4'>
          <div className='bg-amber-50 border border-amber-200 rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <AlertTriangle className='w-5 h-5 text-amber-600' />
              <h4 className='font-semibold text-amber-800'>
                Impact de l'annulation
              </h4>
            </div>

            <div className='space-y-2'>
              <p className='text-amber-700'>
                <span className='font-bold'>{impactedSteps.length}</span>{' '}
                étape(s) sera/seront annulée(s) :
              </p>

              {impactedSteps.length > 0 && (
                <ul className='bg-white rounded-lg p-3 space-y-1 border border-amber-300'>
                  {impactedSteps.map((step: Step, index: number) => (
                    <li
                      key={index}
                      className='text-sm text-gray-700 flex items-center gap-2'
                    >
                      <XCircle className='w-3 h-3 text-red-500' />
                      {getStepDisplayName(step.nom)}
                      <span className='text-xs text-gray-500'>
                        ({getStepDisplayStatus(step.statut)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {impactedSteps.length === 0 && (
                <p className='text-sm text-green-600 bg-green-50 rounded-lg p-2'>
                  Aucune étape en cours ne sera affectée
                </p>
              )}
            </div>
          </div>

          <div className='bg-gray-50 border border-gray-300 rounded-xl p-4'>
            <p className='text-sm text-gray-600'>
              Cette action est{' '}
              <span className='font-bold text-red-600'>irréversible</span>. Les
              étapes terminées resteront dans votre historique.
            </p>
          </div>
        </div>
      </ConfirmationModal>
    </>
  );
};

export default UserProcedureComponent;
