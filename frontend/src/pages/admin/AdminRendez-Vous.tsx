import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import RequireAdmin from '../../context/RequireAdmin';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../context/AuthContext';
import { 
  LucideCheckCircle, 
  LucideXCircle, 
  LucideRefreshCw, 
  LucidePlus, 
  LucideEdit, 
  LucideTrash2, 
  LucideEye,
  LucideCalendar,
  LucideClock,
  LucidePhone,
  LucideMail,
  LucideUser,
  LucideMapPin,
  LucideGraduationCap,
  LucideBriefcase,
  LucideChevronLeft,
  LucideChevronRight,
  LucideFilter,
  LucideSearch,
  LucideMoreVertical,
  LucideCalendarCheck,
  LucideFileText,
  LucideAlertCircle
} from 'lucide-react';
import { AdminRendezVousService } from '../../api/admin/AdminRendezVousService';

export type RendezvousStatus = 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
export type AdminOpinion = 'Favorable' | 'Défavorable';

export interface Rendezvous {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
  status: RendezvousStatus;
  avisAdmin?: AdminOpinion;
  cancelledAt?: string;
  cancelledBy?: 'admin' | 'user';
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RendezvousListResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRendezvousData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
}

export interface UpdateRendezvousData {
  firstName?: string;
  lastName?: string;
  telephone?: string;
  destination?: string;
  destinationAutre?: string;
  niveauEtude?: string;
  filiere?: string;
  filiereAutre?: string;
  date?: string;
  time?: string;
  status?: RendezvousStatus;
  avisAdmin?: AdminOpinion;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  status?: RendezvousStatus;
  date?: string;
  search?: string;
}

// Modal Component
function Modal({ open, onClose, title, children, size = 'md' }: { 
  open: boolean; 
  onClose: () => void; 
  title?: string; 
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      aria-modal="true" 
      role="dialog"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className={`relative ${sizeClasses[size]} w-full bg-white rounded-2xl shadow-2xl animate-slideUp max-h-[90vh] flex flex-col`}
        role="document"
        tabIndex={-1}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 z-10 bg-white px-4 py-3 sm:px-6 border-b rounded-t-2xl flex items-center justify-between">
            <h3 
              id="modal-title"
              className="text-lg font-semibold text-sky-700"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Fermer"
            >
              <LucideXCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Popover Component
function Popover({ 
  open, 
  onClose, 
  children,
  position = 'bottom-right'
}: { 
  open: boolean; 
  onClose: () => void;
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', onKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const positionClasses = {
    'bottom-right': 'top-full right-0 mt-1',
    'bottom-left': 'top-full left-0 mt-1',
    'top-right': 'bottom-full right-0 mb-1',
    'top-left': 'bottom-full left-0 mb-1'
  };

  return (
    <div 
      ref={popoverRef}
      className={`absolute z-50 ${positionClasses[position]} bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] animate-fadeIn`}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: RendezvousStatus }) {
  const statusConfig = {
    'En attente': {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      icon: <LucideClock className="w-3 h-3" />,
      label: 'En attente'
    },
    'Confirmé': {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      icon: <LucideCheckCircle className="w-3 h-3" />,
      label: 'Confirmé'
    },
    'Terminé': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: <LucideCalendarCheck className="w-3 h-3" />,
      label: 'Terminé'
    },
    'Annulé': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: <LucideXCircle className="w-3 h-3" />,
      label: 'Annulé'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-8"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// No Results Component
function NoResults({ message = "Aucun rendez-vous trouvé" }: { message?: string }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <LucideCalendar className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      <p className="text-gray-500">Essayez de modifier vos filtres</p>
    </div>
  );
}

export default function AdminRendezVousPage(): JSX.Element {
  const { fetchWithAuth, logout, user: authUser } = useAuth();
  const service = useMemo(() => new AdminRendezVousService(fetchWithAuth), [fetchWithAuth]);

  // State
  const [list, setList] = useState<Rendezvous[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RendezvousStatus | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs pour gérer le debouncing
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchRef = useRef(false);
  const isMountedRef = useRef(true);

  // Modals
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  
  // Selected items
  const [selectedRendezvous, setSelectedRendezvous] = useState<Rendezvous | null>(null);
  
  // Popovers
  const [actionPopoverOpen, setActionPopoverOpen] = useState<string | null>(null);
  const [confirmPopoverOpen, setConfirmPopoverOpen] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreateRendezvousData>>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    destination: '',
    niveauEtude: '',
    filiere: '',
    date: '',
    time: '',
  });

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fonction fetch avec retry et gestion du rate limiting
  const fetchList = useCallback(async (params: Partial<FilterParams> = {}, retryCount = 0) => {
    // Annuler le timeout précédent s'il existe
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Ne pas fetch si le composant n'est plus monté
    if (!isMountedRef.current) return;

    // Délai progressif pour éviter le rate limiting
    const delay = retryCount > 0 ? Math.min(2000 * retryCount, 10000) : 100;
    
    fetchTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      setLoading(true);
      setError(null);
      try {
        const filters: FilterParams = {
          page: params.page !== undefined ? params.page : page,
          limit: params.limit !== undefined ? params.limit : limit,
          status: params.status !== undefined ? params.status : statusFilter,
          date: params.date !== undefined ? params.date : dateFilter,
          search: params.search !== undefined ? params.search : search.trim(),
        };
        
        const data = await service.getAllRendezvous(filters);
        
        if (isMountedRef.current) {
          setList(data.data);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (err: any) {
        console.error('Error fetching rendezvous:', err);
        
        if (!isMountedRef.current) return;

        // Si c'est une erreur de rate limiting, attendre et réessayer
        if ((err.message === 'TOO MANY REQUESTS' || err.message.includes('429')) && retryCount < 3) {
          setError('Trop de requêtes. Réessayez dans quelques secondes...');
          
          // Réessayer avec un délai progressif
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchList(params, retryCount + 1);
            }
          }, 1000 * (retryCount + 1));
        } else if (err.message === 'Unauthorized') {
          setError('Session expirée. Veuillez vous reconnecter.');
          toast.error('Session expirée. Veuillez vous reconnecter.');
          setTimeout(() => logout?.(), 2000);
        } else {
          setError(err.message || 'Erreur lors du chargement');
          toast.error('Erreur lors du chargement des rendez-vous');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, delay);
  }, [page, limit, statusFilter, dateFilter, search, service, logout]);

  // Initial fetch - seulement au montage
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchList();
    }

    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch when filters change avec debouncing
  useEffect(() => {
    if (!initialFetchRef.current) return;

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setPage(1);
        fetchList({ page: 1 });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, statusFilter, dateFilter, limit]);

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch available dates
  const fetchAvailableDates = useCallback(async () => {
    try {
      const dates = await service.getAvailableDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Error fetching available dates:', err);
    }
  }, [service]);

  // Fetch available slots for a date
  const fetchAvailableSlots = useCallback(async (date: string) => {
    if (!date) return;
    setLoadingSlots(true);
    try {
      const slots = await service.getAvailableSlots(date);
      setAvailableSlots(slots);
    } catch (err) {
      setAvailableSlots([]);
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [service]);

  // Handle date change in form
  const handleDateChange = useCallback((date: string) => {
    setFormData(prev => ({ ...prev, date }));
    if (date) {
      fetchAvailableSlots(date);
    }
  }, [fetchAvailableSlots]);

  // Open detail modal
  const openDetail = useCallback((rdv: Rendezvous) => {
    setSelectedRendezvous(rdv);
    setDetailOpen(true);
  }, []);

  // Open edit modal
  const openEdit = useCallback((rdv: Rendezvous) => {
    setSelectedRendezvous(rdv);
    setFormData({
      userId: rdv.userId,
      firstName: rdv.firstName,
      lastName: rdv.lastName,
      email: rdv.email,
      telephone: rdv.telephone,
      destination: rdv.destination,
      destinationAutre: rdv.destinationAutre,
      niveauEtude: rdv.niveauEtude,
      filiere: rdv.filiere,
      filiereAutre: rdv.filiereAutre,
      date: rdv.date,
      time: rdv.time,
    });
    setEditOpen(true);
    fetchAvailableSlots(rdv.date);
  }, [fetchAvailableSlots]);

  // Open create modal
  const openCreate = useCallback(() => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      telephone: '',
      destination: '',
      niveauEtude: '',
      filiere: '',
      date: '',
      time: '',
    });
    setCreateOpen(true);
    setAvailableSlots([]);
  }, []);

  // Submit create or update
  const submitCreateOrUpdate = async () => {
    // Validation
    const requiredFields = ['firstName', 'lastName', 'email', 'date', 'time', 'destination', 'filiere', 'niveauEtude'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast.error(`Champs manquants: ${missingFields.join(', ')}`);
      return;
    }

    if (!formData.telephone) {
      toast.error('Le téléphone est obligatoire');
      return;
    }

    try {
      if (selectedRendezvous) {
        // Update
        const payload: UpdateRendezvousData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          telephone: formData.telephone,
          destination: formData.destination,
          destinationAutre: formData.destinationAutre,
          niveauEtude: formData.niveauEtude,
          filiere: formData.filiere,
          filiereAutre: formData.filiereAutre,
          date: formData.date,
          time: formData.time,
        };
        
        await service.updateRendezvous(selectedRendezvous._id, payload);
        toast.success('Rendez-vous mis à jour avec succès');
        setEditOpen(false);
        setSelectedRendezvous(null);
      } else {
        // Create - need userId from auth context
        if (!authUser?.id) {
          toast.error('Utilisateur non identifié');
          return;
        }

        const payload: CreateRendezvousData = {
          userId: authUser.id,
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          email: formData.email!,
          telephone: formData.telephone!,
          destination: formData.destination!,
          destinationAutre: formData.destinationAutre,
          niveauEtude: formData.niveauEtude!,
          filiere: formData.filiere!,
          filiereAutre: formData.filiereAutre,
          date: formData.date!,
          time: formData.time!,
        };
        
        await service.createRendezvous(payload);
        toast.success('Rendez-vous créé avec succès');
        setCreateOpen(false);
      }
      
      // Attendre un peu avant de rafraîchir la liste pour éviter le rate limiting
      setTimeout(() => {
        fetchList();
      }, 300);
    } catch (err: any) {
      console.error('Error saving rendezvous:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  // Handle confirm rendezvous
  const handleConfirm = useCallback(async (id: string) => {
    try {
      await service.confirmRendezvous(id);
      toast.success('Rendez-vous confirmé');
      setConfirmPopoverOpen(null);
      
      // Attendre un peu avant de rafraîchir
      setTimeout(() => {
        fetchList();
      }, 300);
    } catch (err: any) {
      console.error('Error confirming rendezvous:', err);
      toast.error(err.message || 'Erreur lors de la confirmation');
    }
  }, [service, fetchList]);

  // Handle cancel rendezvous
  const handleCancel = useCallback(async (id: string) => {
    try {
      await service.cancelRendezvous(id);
      toast.success('Rendez-vous annulé');
      setCancelModalOpen(false);
      setSelectedRendezvous(null);
      
      // Attendre un peu avant de rafraîchir
      setTimeout(() => {
        fetchList();
      }, 300);
    } catch (err: any) {
      console.error('Error cancelling rendezvous:', err);
      toast.error(err.message || 'Erreur lors de l\'annulation');
    }
  }, [service, fetchList]);

  // Handle terminate rendezvous
  const handleTerminate = useCallback(async (id: string, avisAdmin: AdminOpinion) => {
    try {
      await service.updateStatus(id, 'Terminé', avisAdmin);
      toast.success('Rendez-vous terminé');
      setTerminateModalOpen(false);
      setSelectedRendezvous(null);
      
      // Attendre un peu avant de rafraîchir
      setTimeout(() => {
        fetchList();
      }, 300);
    } catch (err: any) {
      console.error('Error terminating rendezvous:', err);
      toast.error(err.message || 'Erreur lors de la terminaison');
    }
  }, [service, fetchList]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter(undefined);
    setDateFilter(undefined);
    setPage(1);
    
    // Attendre un peu avant de fetch
    setTimeout(() => {
      fetchList({ search: '', status: undefined, date: undefined, page: 1 });
    }, 300);
  }, [fetchList]);

  // Fonction de rafraîchissement manuel avec délai
  const handleManualRefresh = useCallback(() => {
    if (loading) return;
    
    // Désactiver le bouton pendant 2 secondes
    setLoading(true);
    
    // Attendre 500ms avant de rafraîchir
    setTimeout(() => {
      fetchList();
    }, 500);
  }, [fetchList, loading]);

  // Rendu du composant
  return (
    <RequireAdmin>
      <Helmet>
        <title>Administration des Rendez-vous | Paname Consulting</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-sky-100 px-4 py-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-sky-700 flex items-center gap-2">
                <LucideCalendar className="w-6 h-6 sm:w-7 sm:h-7" />
                Administration des Rendez-vous
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Chargement...' : `${total} rendez-vous au total`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-sky-200 text-sky-700 rounded-xl hover:bg-sky-50 hover:border-sky-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Rafraîchir"
              >
                <LucideRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Rafraîchir</span>
              </button>
              
              <button
                onClick={openCreate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl hover:from-sky-700 hover:to-blue-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LucidePlus className="w-4 h-4" />
                <span className="font-medium">Nouveau</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 sm:px-6">
          {/* Message d'erreur rate limiting */}
          {error?.includes('Trop de requêtes') && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <LucideAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">Limite de requêtes atteinte</p>
                <p className="text-amber-600 text-sm">
                  Le système limite le nombre de requêtes. Réessayez dans quelques secondes.
                </p>
              </div>
              <button
                onClick={handleManualRefresh}
                className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Filters Section */}
          <section className="mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <LucideFilter className="w-5 h-5 text-sky-600" />
                  Filtres
                </h2>
                <button
                  onClick={resetFilters}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Réinitialiser
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher (nom, email, téléphone, destination)"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition disabled:bg-gray-50"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={loading}
                      aria-label="Rechercher"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none appearance-none bg-white disabled:bg-gray-50"
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value as RendezvousStatus || undefined)}
                      disabled={loading}
                      aria-label="Filtrer par statut"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="En attente">En attente</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Terminé">Terminé</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <LucideChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <div className="relative">
                    <LucideCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-gray-50"
                      value={dateFilter || ''}
                      onChange={(e) => setDateFilter(e.target.value || undefined)}
                      disabled={loading}
                      aria-label="Filtrer par date"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section>
            {loading ? (
              <LoadingSkeleton />
            ) : error && !error.includes('Trop de requêtes') ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <LucideAlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={handleManualRefresh}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700"
                >
                  Réessayer
                </button>
              </div>
            ) : list.length === 0 ? (
              <NoResults />
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="sm:hidden space-y-3">
                  {list.map((rdv) => (
                    <article 
                      key={rdv._id} 
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {rdv.firstName} {rdv.lastName}
                            </h3>
                            <StatusBadge status={rdv.status} />
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <LucideCalendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{rdv.date}</span>
                              <span className="text-gray-400">•</span>
                              <LucideClock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{rdv.time}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <LucideMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{rdv.destination}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <LucideMail className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{rdv.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions Menu */}
                        <div className="relative ml-2">
                          <button
                            onClick={() => setActionPopoverOpen(actionPopoverOpen === rdv._id ? null : rdv._id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Actions"
                          >
                            <LucideMoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          
                          <Popover
                            open={actionPopoverOpen === rdv._id}
                            onClose={() => setActionPopoverOpen(null)}
                            position="bottom-right"
                          >
                            <div className="space-y-1">
                              <button
                                onClick={() => {
                                  openDetail(rdv);
                                  setActionPopoverOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-2"
                              >
                                <LucideEye className="w-4 h-4" />
                                Voir détails
                              </button>
                              
                              <button
                                onClick={() => {
                                  openEdit(rdv);
                                  setActionPopoverOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-2"
                              >
                                <LucideEdit className="w-4 h-4" />
                                Modifier
                              </button>
                              
                              {rdv.status === 'En attente' && (
                                <button
                                  onClick={() => {
                                    setConfirmPopoverOpen(confirmPopoverOpen === rdv._id ? null : rdv._id);
                                    setActionPopoverOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-50 text-sky-700 text-sm flex items-center gap-2"
                                >
                                  <LucideCheckCircle className="w-4 h-4" />
                                  Confirmer
                                </button>
                              )}
                              
                              {rdv.status === 'Confirmé' && (
                                <button
                                  onClick={() => {
                                    setTerminateModalOpen(true);
                                    setSelectedRendezvous(rdv);
                                    setActionPopoverOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-green-700 text-sm flex items-center gap-2"
                                >
                                  <LucideCalendarCheck className="w-4 h-4" />
                                  Terminer
                                </button>
                              )}
                              
                              {(rdv.status === 'En attente' || rdv.status === 'Confirmé') && (
                                <button
                                  onClick={() => {
                                    setCancelModalOpen(true);
                                    setSelectedRendezvous(rdv);
                                    setActionPopoverOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-700 text-sm flex items-center gap-2"
                                >
                                  <LucideTrash2 className="w-4 h-4" />
                                  Annuler
                                </button>
                              )}
                            </div>
                          </Popover>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Rendez-vous
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Destination
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {list.map((rdv) => (
                          <tr key={rdv._id} className="hover:bg-gray-50 transition-colors">
                            {/* Client Info */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {rdv.firstName} {rdv.lastName}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                  <LucideGraduationCap className="w-3.5 h-3.5" />
                                  {rdv.niveauEtude}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <LucideBriefcase className="w-3.5 h-3.5" />
                                  {rdv.filiere}
                                </div>
                              </div>
                            </td>

                            {/* Contact Info */}
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <LucideMail className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-700 truncate max-w-[150px]">
                                    {rdv.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <LucidePhone className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {rdv.telephone}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Appointment Info */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <LucideCalendar className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {rdv.date}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <LucideClock className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {rdv.time}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Destination */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <LucideMapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700">
                                  {rdv.destination}
                                  {rdv.destinationAutre && (
                                    <span className="text-gray-500 italic">
                                      {' '}({rdv.destinationAutre})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={rdv.status} />
                              {rdv.avisAdmin && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Avis: {rdv.avisAdmin}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {/* View Button */}
                                <button
                                  onClick={() => openDetail(rdv)}
                                  className="p-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                  aria-label="Voir détails"
                                  title="Voir détails"
                                >
                                  <LucideEye className="w-4 h-4" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => openEdit(rdv)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  aria-label="Modifier"
                                  title="Modifier"
                                >
                                  <LucideEdit className="w-4 h-4" />
                                </button>

                                {/* Action Menu */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActionPopoverOpen(actionPopoverOpen === rdv._id ? null : rdv._id)}
                                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    aria-label="Actions"
                                    title="Plus d'actions"
                                  >
                                    <LucideMoreVertical className="w-4 h-4" />
                                  </button>

                                  <Popover
                                    open={actionPopoverOpen === rdv._id}
                                    onClose={() => setActionPopoverOpen(null)}
                                    position="bottom-right"
                                  >
                                    <div className="space-y-1">
                                      {rdv.status === 'En attente' && (
                                        <button
                                          onClick={() => handleConfirm(rdv._id)}
                                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-50 text-sky-700 text-sm flex items-center gap-2"
                                        >
                                          <LucideCheckCircle className="w-4 h-4" />
                                          Confirmer le rendez-vous
                                        </button>
                                      )}
                                      
                                      {rdv.status === 'Confirmé' && (
                                        <button
                                          onClick={() => {
                                            setTerminateModalOpen(true);
                                            setSelectedRendezvous(rdv);
                                            setActionPopoverOpen(null);
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-green-700 text-sm flex items-center gap-2"
                                        >
                                          <LucideCalendarCheck className="w-4 h-4" />
                                          Terminer le rendez-vous
                                        </button>
                                      )}
                                      
                                      {(rdv.status === 'En attente' || rdv.status === 'Confirmé') && (
                                        <button
                                          onClick={() => {
                                            setCancelModalOpen(true);
                                            setSelectedRendezvous(rdv);
                                            setActionPopoverOpen(null);
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-700 text-sm flex items-center gap-2"
                                        >
                                          <LucideTrash2 className="w-4 h-4" />
                                          Annuler le rendez-vous
                                        </button>
                                      )}
                                    </div>
                                  </Popover>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Affichage de {(page - 1) * limit + 1} à {Math.min(page * limit, total)} sur {total} rendez-vous
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Items per page */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Afficher :</span>
                      <select
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none disabled:bg-gray-50"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        disabled={loading}
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                    
                    {/* Page navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Page précédente"
                      >
                        <LucideChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              disabled={loading}
                              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${page === pageNum 
                                ? 'bg-sky-600 text-white' 
                                : 'text-gray-700 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Page suivante"
                      >
                        <LucideChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>

        {/* Detail Modal */}
        <Modal 
          open={detailOpen} 
          onClose={() => setDetailOpen(false)}
          title={selectedRendezvous ? `${selectedRendezvous.firstName} ${selectedRendezvous.lastName}` : 'Détails'}
          size="lg"
        >
          {selectedRendezvous ? (
            <div className="space-y-6">
              {/* Status & Info */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedRendezvous.status} />
                <div className="text-sm text-gray-500">
                  Créé le {new Date(selectedRendezvous.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <LucideUser className="w-4 h-4" />
                    Informations personnelles
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Email :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Téléphone :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.telephone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Niveau :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.niveauEtude}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Filière :</span>
                      <span className="text-sm text-gray-800">
                        {selectedRendezvous.filiere}
                        {selectedRendezvous.filiereAutre && ` (${selectedRendezvous.filiereAutre})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appointment Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <LucideCalendar className="w-4 h-4" />
                    Rendez-vous
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Date :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Heure :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.time}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">Destination :</span>
                      <span className="text-sm text-gray-800">
                        {selectedRendezvous.destination}
                        {selectedRendezvous.destinationAutre && ` (${selectedRendezvous.destinationAutre})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedRendezvous.avisAdmin || selectedRendezvous.cancellationReason) && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-gray-700 mb-3">Informations complémentaires</h4>
                  {selectedRendezvous.avisAdmin && (
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-500 w-32">Avis admin :</span>
                      <span className={`text-sm font-medium ${selectedRendezvous.avisAdmin === 'Favorable' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedRendezvous.avisAdmin}
                      </span>
                    </div>
                  )}
                  {selectedRendezvous.cancellationReason && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-gray-500 w-32">Raison annulation :</span>
                      <span className="text-sm text-gray-800">{selectedRendezvous.cancellationReason}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    openEdit(selectedRendezvous);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <LucideEdit className="w-4 h-4" />
                  Modifier
                </button>
                
                {selectedRendezvous.status === 'Confirmé' && (
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      setTerminateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <LucideCalendarCheck className="w-4 h-4" />
                    Terminer
                  </button>
                )}
                
                {(selectedRendezvous.status === 'En attente' || selectedRendezvous.status === 'Confirmé') && (
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      setCancelModalOpen(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <LucideTrash2 className="w-4 h-4" />
                    Annuler
                  </button>
                )}
                
                <button
                  onClick={() => setDetailOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          )}
        </Modal>

        {/* Create/Edit Modal */}
        <Modal
          open={createOpen || editOpen}
          onClose={() => {
            setCreateOpen(false);
            setEditOpen(false);
            setSelectedRendezvous(null);
          }}
          title={selectedRendezvous ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.telephone || ''}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <div className="relative">
                  <LucideCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                    value={formData.date || ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Time Slot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Créneau horaire *
                </label>
                <div className="relative">
                  <LucideClock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none appearance-none"
                    value={formData.time || ''}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    disabled={!formData.date || loadingSlots}
                    required
                  >
                    <option value="">Sélectionnez un créneau</option>
                    {loadingSlots ? (
                      <option value="">Chargement des créneaux...</option>
                    ) : availableSlots.length > 0 ? (
                      availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))
                    ) : formData.date ? (
                      <option value="">Aucun créneau disponible</option>
                    ) : null}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <LucideChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                  </div>
                </div>
                {formData.date && availableSlots.length === 0 && !loadingSlots && (
                  <p className="mt-1 text-sm text-red-600">
                    Aucun créneau disponible pour cette date
                  </p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.destination || ''}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </div>

              {/* Niveau d'étude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niveau d'étude *
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none appearance-none"
                  value={formData.niveauEtude || ''}
                  onChange={(e) => setFormData({ ...formData, niveauEtude: e.target.value })}
                  required
                >
                  <option value="">Sélectionnez un niveau</option>
                  <option value="Bac">Bac</option>
                  <option value="Bac+1">Bac+1</option>
                  <option value="Bac+2">Bac+2</option>
                  <option value="Licence">Licence</option>
                  <option value="Master I">Master I</option>
                  <option value="Master II">Master II</option>
                  <option value="Doctorat">Doctorat</option>
                </select>
              </div>

              {/* Filière */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filière *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
                  value={formData.filiere || ''}
                  onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t">
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setEditOpen(false);
                  setSelectedRendezvous(null);
                }}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitCreateOrUpdate}
                disabled={!formData.date || !formData.time || loadingSlots}
                className="px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedRendezvous ? 'Mettre à jour' : 'Créer le rendez-vous'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Cancel Modal */}
        <Modal
          open={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false);
            setSelectedRendezvous(null);
          }}
          title="Annuler le rendez-vous"
          size="md"
        >
          {selectedRendezvous ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <LucideAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Attention</p>
                    <p className="text-sm text-red-600 mt-1">
                      Vous êtes sur le point d'annuler le rendez-vous de{' '}
                      <span className="font-semibold">{selectedRendezvous.firstName} {selectedRendezvous.lastName}</span>{' '}
                      prévu le {selectedRendezvous.date} à {selectedRendezvous.time}.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de l'annulation (optionnel)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition"
                  rows={3}
                  placeholder="Ex: Client a reporté, créneau indisponible, etc."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setSelectedRendezvous(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => selectedRendezvous && handleCancel(selectedRendezvous._id)}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <LucideTrash2 className="w-4 h-4" />
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          )}
        </Modal>

        {/* Terminate Modal */}
        <Modal
          open={terminateModalOpen}
          onClose={() => {
            setTerminateModalOpen(false);
            setSelectedRendezvous(null);
          }}
          title="Terminer le rendez-vous"
          size="md"
        >
          {selectedRendezvous ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <LucideCalendarCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Clôturer le rendez-vous</p>
                    <p className="text-sm text-green-600 mt-1">
                      Marquez ce rendez-vous comme terminé et donnez votre avis administratif.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Avis administratif *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="avisAdmin"
                      value="Favorable"
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                      onChange={() => {}}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Favorable</div>
                      <div className="text-sm text-gray-500">Le rendez-vous s'est bien passé</div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <LucideCheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="avisAdmin"
                      value="Défavorable"
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                      onChange={() => {}}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Défavorable</div>
                      <div className="text-sm text-gray-500">Le rendez-vous n'a pas abouti</div>
                    </div>
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <LucideXCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <button
                  onClick={() => {
                    setTerminateModalOpen(false);
                    setSelectedRendezvous(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const avisInput = document.querySelector('input[name="avisAdmin"]:checked') as HTMLInputElement;
                    if (avisInput && selectedRendezvous) {
                      handleTerminate(selectedRendezvous._id, avisInput.value as AdminOpinion);
                    } else {
                      toast.error('Veuillez sélectionner un avis');
                    }
                  }}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <LucideCalendarCheck className="w-4 h-4" />
                  Terminer le rendez-vous
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          )}
        </Modal>
      </div>
    </RequireAdmin>
  );
}