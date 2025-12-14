import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Trash2, 
  Plus,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  MoreVertical
} from 'lucide-react';
import { useAdminRendezVousService } from '../../api/admin/AdminRendezVousService';
import { Helmet } from 'react-helmet-async';
import { 
  RendezVous, 
  RendezvousStatus, 
  AdminOpinion,
  RENDEZVOUS_STATUS,
  ADMIN_OPINION,
  EducationLevel
} from '../../api/admin/AdminRendezVousService';

// Interface pour les destinations de l'API
interface Destination {
  _id: string;
  country: string;
  imagePath: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

// Interface pour la création de rendez-vous
interface CreateRendezVousData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: EducationLevel;
  filiere: string;
  filiereAutre?: string;
}

// Fonction utilitaire pour log sécurisé
const secureLog = {
  // Log d'information générale (sans données sensibles)
  info: (message: string, data?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },
  
  // Log de succès
  success: (message: string, data?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${message}`, data || '');
    }
  },
  
  // Log d'erreur
  error: (message: string, error?: any, context?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.error(`❌ ${message}`, { 
        error: error instanceof Error ? error.message : String(error),
        context: context || {},
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Log de débogage avec ID tronqué
  debug: (message: string, rendezvousId?: string, data?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      const safeId = rendezvousId ? `${rendezvousId.substring(0, 8)}...` : 'ID_NON_DEFINI';
      console.debug(`🔍 ${message}`, { 
        rendezvousId: safeId,
        ...data 
      });
    }
  },
  
  // Log d'opération CRUD sécurisé
  operation: (operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS', 
               rendezvousId?: string, 
               additionalData?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      const safeId = rendezvousId ? `${rendezvousId.substring(0, 8)}...` : 'ID_NON_DEFINI';
      console.log(`🔄 ${operation}`, { 
        operation,
        rendezvousId: safeId,
        timestamp: new Date().toISOString(),
        ...additionalData 
      });
    }
  }
};

const AdminRendezVous = () => {
  const { user } = useAuth();
  const adminRendezVousService = useAdminRendezVousService();

  const [rendezvous, setRendezvous] = useState<RendezVous[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(8);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showAvisModal, setShowAvisModal] = useState<{
    id: string;
    status: RendezvousStatus;
  } | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Références pour éviter les boucles infinies
  const isInitialMount = useRef(true);
  const prevFilters = useRef({ page: 1, searchTerm: '', selectedStatus: '' });

  // États pour la création d'un rendez-vous
  const [newRendezVous, setNewRendezVous] = useState<CreateRendezVousData>({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    date: '',
    time: '',
    destination: '',
    destinationAutre: '',
    niveauEtude: '' as EducationLevel,
    filiere: '',
    filiereAutre: ''
  });

  // Fonction pour valider un ID MongoDB
  const isValidMongoId = useCallback((id: string | undefined): boolean => {
    if (!id || id.trim() === '') {
      secureLog.error('ID invalide: ID vide ou null', undefined, { 
        id: id || 'UNDEFINED',
        type: typeof id
      });
      return false;
    }
    
    // Validation basique d'ObjectId MongoDB (24 caractères hexadécimaux)
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const isValid = mongoIdRegex.test(id);
    
    if (!isValid) {
      secureLog.error('ID invalide: format MongoDB incorrect', undefined, { 
        id: `${id.substring(0, 8)}...`,
        length: id.length,
        regexMatch: mongoIdRegex.test(id)
      });
    }
    
    return isValid;
  }, []);

  // Récupérer les destinations depuis l'API
  const fetchDestinations = async () => {
    try {
      setIsLoadingDestinations(true);
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/destinations/all`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des destinations');
      }
      
      const data = await response.json();
      setDestinations(data);
      
      secureLog.success('Destinations chargées', { count: data.length });
    } catch (error) {
      secureLog.error('Erreur lors du chargement des destinations', error);
      toast.error('Erreur lors du chargement des destinations');
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  // Récupération des rendez-vous avec vérification des changements
  const loadRendezvous = useCallback(async () => {
    // Vérifier si les filtres ont changé
    const currentFilters = { page, searchTerm, selectedStatus };
    const filtersChanged = 
      prevFilters.current.page !== page ||
      prevFilters.current.searchTerm !== searchTerm ||
      prevFilters.current.selectedStatus !== selectedStatus;

    if (!filtersChanged && !isInitialMount.current) {
      secureLog.debug('Filtres identiques, chargement ignoré');
      return;
    }

    // Mettre à jour les filtres précédents
    prevFilters.current = currentFilters;

    setIsLoading(true);
    try {
      secureLog.debug('Chargement rendez-vous', undefined, {
        page,
        limit,
        status: selectedStatus,
        searchTermLength: searchTerm.length
      });

      const result = await adminRendezVousService.findAll({
        page,
        limit,
        status: selectedStatus ? (selectedStatus as RendezvousStatus) : undefined,
        search: searchTerm || undefined,
      });
      
      const typedData = result.data.map(item => ({
        ...item,
        status: item.status as RendezvousStatus,
        avisAdmin: item.avisAdmin as AdminOpinion | undefined,
        niveauEtude: item.niveauEtude as EducationLevel,
        cancelledBy: item.cancelledBy as 'admin' | 'user' | undefined,
        cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : undefined,
        createdAt: new Date(item.createdAt),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
      })) as RendezVous[];
      
      setRendezvous(typedData);
      setTotalPages(result.totalPages);
      
      secureLog.success('Rendez-vous chargés', { 
        count: typedData.length,
        total: result.total,
        totalPages: result.totalPages
      });
      
    } catch (error) {
      secureLog.error('Erreur lors du chargement des rendez-vous', error, {
        page,
        selectedStatus,
        searchTermLength: searchTerm.length
      });
    } finally {
      setIsLoading(false);
      isInitialMount.current = false;
    }
  }, [page, searchTerm, selectedStatus, adminRendezVousService, limit]);

  // Charger les dates disponibles (une seule fois)
  const loadAvailableDates = useCallback(async () => {
    try {
      secureLog.info('Chargement dates disponibles');
      const dates = await adminRendezVousService.getAvailableDates();
      setAvailableDates(dates);
      secureLog.success('Dates disponibles chargées', { count: dates.length });
    } catch (error) {
      secureLog.error('Erreur lors du chargement des dates disponibles', error);
    }
  }, [adminRendezVousService]);

  // Charger les créneaux disponibles
  const loadAvailableSlots = useCallback(async (date: string) => {
    try {
      if (!date) {
        setAvailableSlots([]);
        return;
      }

      secureLog.debug('Chargement créneaux', undefined, { date });
      const slots = await adminRendezVousService.getAvailableSlots(date);
      setAvailableSlots(slots);
      secureLog.success('Créneaux disponibles chargés', { 
        date, 
        count: slots.length 
      });
    } catch (error) {
      secureLog.error('Erreur lors du chargement des créneaux', error, { date });
      toast.error('Erreur lors du chargement des créneaux disponibles');
    }
  }, [adminRendezVousService]);

  // Mise à jour du statut avec gestion de file d'attente
  const handleUpdateStatus = async (id: string, status: RendezvousStatus, avisAdmin?: AdminOpinion) => {
    if (isProcessing) {
      secureLog.debug('Une opération est déjà en cours, nouvelle opération ignorée', id);
      return;
    }

    setIsProcessing(true);

    try {
      // Validation de l'ID
      if (!isValidMongoId(id)) {
        toast.error('ID du rendez-vous invalide');
        setIsProcessing(false);
        return;
      }

      secureLog.operation('STATUS', id, {
        targetStatus: status,
        hasAvisAdmin: !!avisAdmin,
        avisAdminType: avisAdmin
      });

      const updatedRdv = await adminRendezVousService.updateStatus(id, status, avisAdmin);
      
      // Mise à jour de l'état local
      setRendezvous(prev => prev.map(rdv => {
        if (rdv._id === id) {
          const updated = { 
            ...rdv, 
            status: updatedRdv.status,
            ...(updatedRdv.avisAdmin !== undefined && { avisAdmin: updatedRdv.avisAdmin })
          };
          
          // CORRECTION : Utiliser la valeur littérale
          if (updatedRdv.status !== 'Terminé' && updated.avisAdmin) {
            updated.avisAdmin = undefined;
          }
          
          return updated;
        }
        return rdv;
      }));

      // Fermer les modals
      setShowAvisModal(null);
      setShowMobileActions(null);

      secureLog.success('Statut mis à jour avec succès', {
        rendezvousId: `${id.substring(0, 8)}...`,
        newStatus: status,
        avisAdmin: avisAdmin || 'Aucun'
      });

    } catch (error: any) {
      secureLog.error('Échec mise à jour statut', error, {
        rendezvousId: `${id.substring(0, 8)}...`,
        targetStatus: status,
        errorMessage: error.message,
        errorType: error.constructor.name
      });

      // Gestion des erreurs spécifiques
      if (error.message.includes('ID du rendez-vous requis')) {
        toast.error('ID du rendez-vous manquant. Veuillez réessayer.');
      } else if (error.message.includes('Statut invalide')) {
        toast.error('Statut invalide pour ce rendez-vous.');
      } else if (error.message.includes('avis admin est obligatoire')) {
        toast.error('L\'avis admin est obligatoire pour terminer un rendez-vous.');
      } else {
        toast.error('Erreur lors de la mise à jour du statut');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Gestion du changement de statut via select
  const handleStatusChange = (id: string, newStatus: string) => {
    // Validation de l'ID avant de continuer
    if (!isValidMongoId(id)) {
      toast.error('ID du rendez-vous invalide');
      setShowMobileActions(null);
      return;
    }

    const status = newStatus as RendezvousStatus;
    
    if (status === 'Terminé') {
      setShowAvisModal({ id, status });
    } else {
      handleUpdateStatus(id, status);
    }
  };

  // Gestion de la sélection d'avis
  const handleAvisSelection = (avis: AdminOpinion) => {
    if (!showAvisModal || !showAvisModal.id) {
      secureLog.error('Avis modal invalide', undefined, {
        showAvisModal: showAvisModal,
        hasId: !!showAvisModal?.id
      });
      toast.error('Données du rendez-vous invalides');
      setShowAvisModal(null);
      return;
    }

    // Validation de l'ID
    if (!isValidMongoId(showAvisModal.id)) {
      toast.error('ID du rendez-vous invalide');
      setShowAvisModal(null);
      return;
    }

    handleUpdateStatus(showAvisModal.id, showAvisModal.status, avis);
  };

  // Suppression avec gestion de file d'attente
  const handleDelete = async () => {
    if (!showDeleteModal) return;

    if (isProcessing) {
      secureLog.debug('Une opération est déjà en cours, suppression ignorée', showDeleteModal.id);
      return;
    }

    setIsProcessing(true);

    try {
      // Validation de l'ID
      if (!isValidMongoId(showDeleteModal.id)) {
        toast.error('ID du rendez-vous invalide');
        setIsProcessing(false);
        return;
      }

      secureLog.operation('DELETE', showDeleteModal.id, {
        userFirstName: showDeleteModal.firstName,
        userLastName: showDeleteModal.lastName
      });

      await adminRendezVousService.delete(showDeleteModal.id);
      
      // Mise à jour de l'état local
      setRendezvous(prev => prev.filter(rdv => rdv._id !== showDeleteModal.id));

      setShowDeleteModal(null);
      setShowMobileActions(null);

      secureLog.success('Rendez-vous supprimé avec succès', {
        rendezvousId: `${showDeleteModal.id.substring(0, 8)}...`
      });

    } catch (error: any) {
      secureLog.error('Échec suppression rendez-vous', error, {
        rendezvousId: `${showDeleteModal?.id.substring(0, 8)}...`,
        errorMessage: error.message,
        errorType: error.constructor.name
      });

      // Gestion des erreurs spécifiques
      if (error.message.includes('ID du rendez-vous requis')) {
        toast.error('ID du rendez-vous manquant pour la suppression.');
      } else if (error.message.includes('Impossible d\'annuler')) {
        toast.error('Impossible d\'annuler ce rendez-vous.');
      } else {
        toast.error('Erreur lors de la suppression du rendez-vous');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Création d'un nouveau rendez-vous
  const handleCreateRendezVous = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);

      // Validation des champs requis
      if (!newRendezVous.userId || !newRendezVous.email) {
        toast.error('ID utilisateur et email sont requis');
        secureLog.error('Création échouée: champs requis manquants', undefined, {
          hasUserId: !!newRendezVous.userId,
          hasEmail: !!newRendezVous.email
        });
        setIsCreating(false);
        return;
      }

      // Validation ID utilisateur
      if (!isValidMongoId(newRendezVous.userId)) {
        toast.error('ID utilisateur invalide');
        setIsCreating(false);
        return;
      }

      // Validation destination "Autre"
      if (newRendezVous.destination === 'Autre' && !newRendezVous.destinationAutre?.trim()) {
        toast.error('La destination "Autre" nécessite une précision');
        setIsCreating(false);
        return;
      }

      // Validation filière "Autre"
      if (newRendezVous.filiere === 'Autre' && !newRendezVous.filiereAutre?.trim()) {
        toast.error('La filière "Autre" nécessite une précision');
        setIsCreating(false);
        return;
      }

      // Préparer les données pour l'envoi
      const createData = {
        userId: newRendezVous.userId.trim(),
        firstName: newRendezVous.firstName.trim(),
        lastName: newRendezVous.lastName.trim(),
        email: newRendezVous.email.toLowerCase().trim(),
        telephone: newRendezVous.telephone.trim(),
        destination: newRendezVous.destination,
        destinationAutre: newRendezVous.destinationAutre?.trim(),
        niveauEtude: newRendezVous.niveauEtude,
        filiere: newRendezVous.filiere,
        filiereAutre: newRendezVous.filiereAutre?.trim(),
        date: newRendezVous.date,
        time: newRendezVous.time
      };

      secureLog.operation('CREATE', undefined, {
        userId: `${createData.userId.substring(0, 8)}...`,
        destination: createData.destination,
        date: createData.date,
        time: createData.time,
        destinationType: createData.destination === 'Autre' ? 'Autre' : 'Prédéfini',
        filiereType: createData.filiere === 'Autre' ? 'Autre' : 'Prédéfini'
      });

      // Création via fetch direct avec authentification admin
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_URL}/api/rendezvous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création du rendez-vous');
      }

      const createdRdv = await response.json();
      
      // Mise à jour de l'état local
      setRendezvous(prev => [{
        ...createdRdv,
        status: createdRdv.status as RendezvousStatus,
        avisAdmin: createdRdv.avisAdmin as AdminOpinion | undefined,
        niveauEtude: createdRdv.niveauEtude as EducationLevel,
        cancelledBy: createdRdv.cancelledBy as 'admin' | 'user' | undefined,
        cancelledAt: createdRdv.cancelledAt ? new Date(createdRdv.cancelledAt) : undefined,
        createdAt: new Date(createdRdv.createdAt),
        updatedAt: createdRdv.updatedAt ? new Date(createdRdv.updatedAt) : undefined
      }, ...prev]);
      
      // Réinitialiser le formulaire
      setNewRendezVous({
        userId: '',
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        date: '',
        time: '',
        destination: '',
        destinationAutre: '',
        niveauEtude: '' as EducationLevel,
        filiere: '',
        filiereAutre: ''
      });

      // Fermer le modal
      setShowCreateModal(false);

      // Recharger les dates disponibles
      loadAvailableDates();

      secureLog.success('Rendez-vous créé avec succès', {
        rendezvousId: `${createdRdv._id?.substring(0, 8)}...`,
        destination: createdRdv.destination,
        status: createdRdv.status,
        date: createdRdv.date,
        time: createdRdv.time
      });

      toast.success('Rendez-vous créé avec succès');

    } catch (error: any) {
      secureLog.error('Échec création rendez-vous', error, {
        userId: `${newRendezVous.userId.substring(0, 8)}...`,
        destination: newRendezVous.destination,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error.message
      });
      
      toast.error(error.message || 'Erreur lors de la création du rendez-vous');
    } finally {
      setIsCreating(false);
    }
  };

  // Gestion du changement de date pour charger les créneaux disponibles
  const handleDateChange = (date: string) => {
    setNewRendezVous(prev => ({ 
      ...prev, 
      date,
      time: ''
    }));
    if (date) {
      loadAvailableSlots(date);
    } else {
      setAvailableSlots([]);
    }
  };

  // CORRECTION CRITIQUE : Initialisation avec useEffect
  useEffect(() => {
    // Chargement initial
    const initializeData = async () => {
      await Promise.all([
        loadRendezvous(),
        loadAvailableDates(),
        fetchDestinations()
      ]);
    };

    initializeData();
  }, []); // Tableau de dépendances vide = exécuté une seule fois au montage

  // Effet pour recharger les rendez-vous quand les filtres changent
  useEffect(() => {
    // Utiliser un debounce pour éviter trop de requêtes
    const debounceTimer = setTimeout(() => {
      if (!isInitialMount.current) {
        loadRendezvous();
      }
    }, 300); // 300ms de délai

    return () => clearTimeout(debounceTimer);
  }, [page, searchTerm, selectedStatus, loadRendezvous]);

  // Fonctions utilitaires
  const getStatusColor = (status: RendezvousStatus): string => {
    switch (status) {
      case 'Confirmé': return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Annulé': return 'bg-red-100 text-red-800 border-red-200';
      case 'Terminé': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvisColor = (avis: AdminOpinion): string => {
    switch (avis) {
      case 'Favorable': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Défavorable': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string): string => {
    return timeString.replace(':', 'h');
  };

  // Fonction pour obtenir la destination effective
  const getEffectiveDestination = (rdv: RendezVous): string => {
    return rdv.destination === 'Autre' && rdv.destinationAutre
      ? rdv.destinationAutre
      : rdv.destination;
  };

  // Fonction pour obtenir la filière effective
  const getEffectiveFiliere = (rdv: RendezVous): string => {
    return rdv.filiere === 'Autre' && rdv.filiereAutre
      ? rdv.filiereAutre
      : rdv.filiere;
  };

  // Options de statut alignées avec le backend
  const statusOptions = ['', ...Object.values(RENDEZVOUS_STATUS)];
  
  // Options de destination depuis l'API + "Autre"
  const destinationOptions = [
    ...destinations.map(dest => dest.country),
    'Autre'
  ];

  // Options de filières (doivent correspondre au backend)
  const filieres = ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'];

  return (
    <>
      <Helmet>
        <title>Gestion des Rendez-vous - Paname Consulting</title>
        <meta
          name="description"  
          content="Interface d'administration pour gérer les rendez-vous des utilisateurs sur Paname Consulting. Accès réservé aux administrateurs."
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <meta name="yandexbot" content="noindex, nofollow" />
        <meta name="duckduckbot" content="noindex, nofollow" />
        <meta name="baidu" content="noindex, nofollow" />
        <meta name="naver" content="noindex, nofollow" />
        <meta name="seznam" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-auto">
              <div className="p-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h2 className="text-lg font-bold text-slate-800">Confirmer la suppression</h2>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Êtes-vous sûr de vouloir supprimer le rendez-vous de{" "}
                  <span className="font-semibold">
                    {showDeleteModal.firstName} {showDeleteModal.lastName}
                  </span> ?
                  <br />
                  Cette action est irréversible.
                </p>
              </div>
              
              <div className="p-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2.5 text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de sélection d'avis pour le statut "Terminé" */}
        {showAvisModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-auto">
              <div className="p-5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  <h2 className="text-base font-bold text-slate-800">Avis Administratif</h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Sélectionnez un avis pour terminer le rendez-vous
                </p>
              </div>
              
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(ADMIN_OPINION).map((avis, index) => (
                    <button
                      key={`avis-${index}-${avis}`}
                      onClick={() => handleAvisSelection(avis as AdminOpinion)}
                      disabled={isProcessing}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        avis === 'Favorable'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <div className="font-semibold text-sm">{avis}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {avis === 'Favorable' 
                          ? 'Procédure créée' 
                          : 'Critères non remplis'
                        }
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAvisModal(null)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Container principal */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 w-full">
          {/* En-tête avec recherche et filtres */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-4">
            <div className="flex flex-col gap-4 mb-5">
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  Gestion des Rendez-vous
                </h1>
                <p className="text-slate-600 mt-1 text-sm">Consultez et gérez tous les rendez-vous du système</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 focus:outline-none focus:ring-none focus:border-blue-500 w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Nouveau RDV
              </button>
            </div>

            {/* Barre de recherche et filtres */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Rechercher un rendez-vous..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 text-sm"
                />
              </div>

              {/* Filtres pour mobile et tablette */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl flex items-center justify-between focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm">Filtres</span>
                  </div>
                  {showMobileFilters ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                
                {showMobileFilters && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="relative">
                      <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none text-sm"
                      >
                        {statusOptions.map((statut, index) => (
                          <option key={`status-${index}-${statut}`} value={statut}>
                            {statut === '' ? 'Tous les statuts' : statut}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Filtres pour tablette et desktop */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-4">
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none text-sm"
                  >
                    {statusOptions.map((statut, index) => (
                      <option key={`status-desktop-${index}-${statut}`} value={statut}>
                        {statut === '' ? 'Tous les statuts' : statut}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                  <Calendar className="w-4 h-4" />
                  <span>Total: {rendezvous.length} rendez-vous</span>
                </div>
              </div>
            </div>
          </div>

          {/* Version mobile - Cards */}
          <div className="lg:hidden">
            {isLoading ? (
              <div key="loading-mobile" className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-slate-600 mt-2 text-sm">Chargement...</p>
              </div>
            ) : rendezvous.length === 0 ? (
              <div key="no-data-mobile" className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Aucun rendez-vous trouvé</p>
                <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rendezvous.map((rdv, index) => (
                  <div 
                    key={`mobile-rdv-${index}-${rdv._id}`}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4"
                  >
                    <div className="space-y-3">
                      {/* En-tête */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <h3 className="font-semibold text-slate-800 text-sm">{rdv.firstName} {rdv.lastName}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{rdv.email}</span>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowMobileActions(showMobileActions === rdv._id ? null : rdv._id)}
                            className="p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-none focus:border-blue-500"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {showMobileActions === rdv._id && (
                            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                              <select
                                value={rdv.status}
                                onChange={(e) => handleStatusChange(rdv._id, e.target.value)}
                                className={`w-full px-3 py-2 text-xs font-medium border-b border-slate-200 focus:outline-none focus:ring-none ${getStatusColor(rdv.status as RendezvousStatus)}`}
                              >
                                {Object.values(RENDEZVOUS_STATUS).map((status, statusIndex) => (
                                  <option key={`mobile-status-${statusIndex}-${status}`} value={status}>{status}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  setShowDeleteModal({
                                    id: rdv._id,
                                    firstName: rdv.firstName,
                                    lastName: rdv.lastName
                                  });
                                  setShowMobileActions(null);
                                }}
                                className="w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors focus:outline-none focus:ring-none text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informations */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{formatDate(rdv.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{formatTime(rdv.time)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 truncate">
                              {getEffectiveDestination(rdv)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 truncate">
                              {getEffectiveFiliere(rdv)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Statut et Avis */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(rdv.status as RendezvousStatus)}`}>
                          {rdv.status}
                        </span>
                        {rdv.status === 'Terminé' && rdv.avisAdmin && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getAvisColor(rdv.avisAdmin as AdminOpinion)}`}>
                            Avis: {rdv.avisAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version tablette/desktop - Table */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th key="header-contact" className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Contact
                      </div>
                    </th>
                    <th key="header-date" className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Date & Heure
                      </div>
                    </th>
                    <th key="header-destination" className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Destination
                      </div>
                    </th>
                    <th key="header-status" className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th key="header-actions" className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr key="loading-row">
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="text-slate-600">Chargement des rendez-vous...</span>
                        </div>
                      </td>
                    </tr>
                  ) : rendezvous.length === 0 ? (
                    <tr key="empty-row">
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-600">Aucun rendez-vous trouvé</p>
                        <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
                      </td>
                    </tr>
                  ) : (
                    rendezvous.map((rdv, index) => (
                      <tr 
                        key={`desktop-rdv-${index}-${rdv._id}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-800">{rdv.firstName} {rdv.lastName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-700 truncate max-w-[120px]">{rdv.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-700">{rdv.telephone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-700">
                                {formatDate(rdv.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-700">{formatTime(rdv.time)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-700 max-w-[100px] truncate">
                              {getEffectiveDestination(rdv)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 max-w-[100px] truncate">
                              {getEffectiveFiliere(rdv)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <select
                              value={rdv.status}
                              onChange={(e) => handleStatusChange(rdv._id, e.target.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 ${getStatusColor(rdv.status as RendezvousStatus)}`}
                            >
                              {Object.values(RENDEZVOUS_STATUS).map((status, statusIndex) => (
                                <option key={`desktop-status-${statusIndex}-${status}`} value={status}>{status}</option>
                              ))}
                            </select>
                            {rdv.status === 'Terminé' && rdv.avisAdmin && (
                              <span className={`block px-2 py-1 rounded-lg text-xs font-medium border ${getAvisColor(rdv.avisAdmin as AdminOpinion)}`}>
                                {rdv.avisAdmin}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowDeleteModal({
                                id: rdv._id,
                                firstName: rdv.firstName,
                                lastName: rdv.lastName
                              })}
                              className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div key="pagination" className="px-4 py-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 flex items-center gap-2"
                  >
                    <ChevronUp className="w-4 h-4 rotate-90" />
                    Précédent
                  </button>
                  
                  <span className="text-sm text-slate-600">
                    Page {page} sur {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 flex items-center gap-2"
                  >
                    Suivant
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminRendezVous;