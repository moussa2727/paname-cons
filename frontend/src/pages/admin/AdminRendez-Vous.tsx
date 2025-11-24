import React, { useState, useEffect } from 'react';
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
import { useAdminRendezVousService, Rendezvous, CreateRendezVousData } from '../../api/admin/AdminRendezVousService';
import { Helmet } from 'react-helmet-async';

// Interface pour les destinations de l'API
interface Destination {
  _id: string;
  country: string;
  imagePath: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

const AdminRendezVous = () => {
  const { user } = useAuth();
  const {
    fetchRendezvous,
    fetchAvailableDates,
    fetchAvailableSlots,
    updateStatus,
    deleteRendezvous,
    createRendezvous
  } = useAdminRendezVousService();

  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);
  const [selectedRendezVous, setSelectedRendezVous] = useState<Rendezvous | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(8);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showAvisModal, setShowAvisModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: string} | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null);

  // États pour la création d'un rendez-vous
  const [newRendezVous, setNewRendezVous] = useState<CreateRendezVousData>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    date: '',
    time: '',
    destination: '',
    destinationAutre: '',
    niveauEtude: '',
    filiere: '',
    filiereAutre: ''
  });

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
    } catch (error) {
      console.error('Erreur fetchDestinations:', error);
      toast.error('Erreur lors du chargement des destinations');
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  // Vérifier si un rendez-vous peut être supprimé selon la logique backend
  const canDeleteRendezvous = (rdv: Rendezvous): { canDelete: boolean; message?: string } => {
    const isAdmin = user?.role === 'ADMIN';
    
    if (isAdmin) {
      return { canDelete: true };
    }

    const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
    const now = new Date();
    const diffMs = rdvDateTime.getTime() - now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (diffMs <= twoHoursMs) {
      return { 
        canDelete: false, 
        message: "Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l'heure prévue" 
      };
    }

    return { canDelete: true };
  };

  // Récupération des rendez-vous
  const loadRendezvous = async () => {
    setIsLoading(true);
    try {
      const result = await fetchRendezvous(page, limit, searchTerm, selectedStatus);
      setRendezvous(result.data);
      setTotalPages(Math.ceil((result.total || 0) / limit));
    } catch (error) {
      console.error('Erreur fetchRendezvous:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour du statut
  const handleUpdateStatus = async (id: string, status: string, avisAdmin?: string) => {
    try {
      const updatedRdv = await updateStatus(id, status, avisAdmin);
      
      setRendezvous(prev => prev.map(rdv => {
        if (rdv._id === id) {
          const updated = { 
            ...rdv, 
            status: updatedRdv.status,
            ...(updatedRdv.avisAdmin !== undefined && { avisAdmin: updatedRdv.avisAdmin })
          };
          
          if (updatedRdv.status !== 'Terminé' && updated.avisAdmin) {
            updated.avisAdmin = undefined;
          }
          
          return updated;
        }
        return rdv;
      }));
      
      if (selectedRendezVous?._id === id) {
        const updatedSelected = { 
          ...selectedRendezVous, 
          status: updatedRdv.status,
          ...(updatedRdv.avisAdmin !== undefined && { avisAdmin: updatedRdv.avisAdmin })
        };
        
        if (updatedRdv.status !== 'Terminé' && updatedSelected.avisAdmin) {
          updatedSelected.avisAdmin = undefined;
        }
        
        setSelectedRendezVous(updatedSelected);
      }

      setShowAvisModal(false);
      setPendingStatusUpdate(null);
      setShowMobileActions(null);

      let successMessage = `Statut mis à jour: ${status}`;
      if (status === 'Terminé' && avisAdmin) {
        successMessage += ` (Avis: ${avisAdmin})`;
        if (avisAdmin === 'Favorable') {
          successMessage += ' - Une procédure a été créée pour cet utilisateur';
        }
      }
      
      toast.success(successMessage);

    } catch (error) {
      console.error('Erreur updateStatus:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour');
    }
  };

  // Gestion du changement de statut via select
  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'Terminé') {
      setPendingStatusUpdate({ id, status: newStatus });
      setShowAvisModal(true);
    } else {
      handleUpdateStatus(id, newStatus);
    }
  };

  // Gestion de la sélection d'avis
  const handleAvisSelection = (avis: 'Favorable' | 'Défavorable') => {
    if (pendingStatusUpdate) {
      handleUpdateStatus(pendingStatusUpdate.id, pendingStatusUpdate.status, avis);
    }
  };

  // Suppression
  const handleDelete = async (id: string) => {
    const rdvToDelete = rendezvous.find(rdv => rdv._id === id);
    if (rdvToDelete) {
      const { canDelete, message } = canDeleteRendezvous(rdvToDelete);
      if (!canDelete) {
        toast.error(message || 'Suppression non autorisée');
        setShowDeleteModal(null);
        setShowMobileActions(null);
        return;
      }
    }

    try {
      await deleteRendezvous(id);
      setRendezvous(prev => prev.filter(rdv => rdv._id !== id));
      
      if (selectedRendezVous?._id === id) {
        setSelectedRendezVous(null);
      }

      setShowDeleteModal(null);
      setShowMobileActions(null);
      toast.success('Rendez-vous supprimé avec succès');

    } catch (error) {
      console.error('Erreur handleDelete:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Création d'un nouveau rendez-vous
  const handleCreateRendezVous = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const createdRdv = await createRendezvous(newRendezVous);
      
      setRendezvous(prev => [createdRdv, ...prev]);
      
      setNewRendezVous({
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        date: '',
        time: '',
        destination: '',
        destinationAutre: '',
        niveauEtude: '',
        filiere: '',
        filiereAutre: ''
      });

      setShowCreateModal(false);
      toast.success('Rendez-vous créé avec succès');

      fetchAvailableDates();

    } catch (error) {
      console.error('Erreur handleCreateRendezVous:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
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
      fetchAvailableSlots(date).then(setAvailableSlots);
    } else {
      setAvailableSlots([]);
    }
  };

  // Initialisation
  useEffect(() => {
    loadRendezvous();
    fetchAvailableDates().then(setAvailableDates);
    fetchDestinations();
  }, [page, searchTerm, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmé': return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Annulé': return 'bg-red-100 text-red-800 border-red-200';
      case 'Terminé': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvisColor = (avis: string) => {
    switch (avis) {
      case 'Favorable': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Défavorable': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.replace(':', 'h');
  };

  const statuts = ['tous', 'En attente', 'Confirmé', 'Terminé', 'Annulé'];
  const avisOptions = ['Favorable', 'Défavorable'];
  const niveauxEtude = ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'];
  const filieres = ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'];

  // Options de destination depuis l'API + "Autre"
  const destinationOptions = [
    ...destinations.map(dest => dest.country),
    'Autre'
  ];

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
                Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.
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
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-none focus:border-blue-500"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
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
                {avisOptions.map(avis => (
                  <button
                    key={avis}
                    onClick={() => handleAvisSelection(avis as 'Favorable' | 'Défavorable')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 ${
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
                  onClick={() => {
                    setShowAvisModal(false);
                    setPendingStatusUpdate(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-auto">
            <div className="p-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800">Nouveau Rendez-vous</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-none focus:border-blue-500"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRendezVous} className="p-4 space-y-4">
              <div className="space-y-4">
                {/* Prénom et Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={newRendezVous.firstName}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                        placeholder="Entrez le prénom"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={newRendezVous.lastName}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                        placeholder="Entrez le nom"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={newRendezVous.email}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
                
                {/* Téléphone */}
                <div>
                  <label htmlFor="telephone" className="block text-sm font-medium text-slate-700 mb-2">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="telephone"
                      name="telephone"
                      type="tel"
                      required
                      value={newRendezVous.telephone}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>
                
                {/* Destination */}
                <div>
                  <label htmlFor="destination" className="block text-sm font-medium text-slate-700 mb-2">
                    Destination *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="destination"
                      name="destination"
                      required
                      value={newRendezVous.destination}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="">Choisissez une destination</option>
                      {isLoadingDestinations ? (
                        <option value="" disabled>Chargement...</option>
                      ) : (
                        destinationOptions.map(dest => (
                          <option key={dest} value={dest}>{dest}</option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Destination Autre */}
                {newRendezVous.destination === 'Autre' && (
                  <div>
                    <label htmlFor="destinationAutre" className="block text-sm font-medium text-slate-700 mb-2">
                      Précisez la destination *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="destinationAutre"
                        name="destinationAutre"
                        type="text"
                        required
                        value={newRendezVous.destinationAutre}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, destinationAutre: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                        placeholder="Entrez la destination"
                      />
                    </div>
                  </div>
                )}
                
                {/* Niveau d'étude */}
                <div>
                  <label htmlFor="niveauEtude" className="block text-sm font-medium text-slate-700 mb-2">
                    Niveau d'étude *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="niveauEtude"
                      name="niveauEtude"
                      required
                      value={newRendezVous.niveauEtude}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, niveauEtude: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="">Sélectionnez un niveau</option>
                      {niveauxEtude.map(niveau => (
                        <option key={niveau} value={niveau}>{niveau}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Filière */}
                <div>
                  <label htmlFor="filiere" className="block text-sm font-medium text-slate-700 mb-2">
                    Filière *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="filiere"
                      name="filiere"
                      required
                      value={newRendezVous.filiere}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, filiere: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="">Choisissez une filière</option>
                      {filieres.map(filiere => (
                        <option key={filiere} value={filiere}>{filiere}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Filière Autre */}
                {newRendezVous.filiere === 'Autre' && (
                  <div>
                    <label htmlFor="filiereAutre" className="block text-sm font-medium text-slate-700 mb-2">
                      Précisez la filière *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="filiereAutre"
                        name="filiereAutre"
                        type="text"
                        required
                        value={newRendezVous.filiereAutre}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, filiereAutre: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                        placeholder="Entrez la filière"
                      />
                    </div>
                  </div>
                )}
                
                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                    Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="date"
                      name="date"
                      required
                      value={newRendezVous.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="">Sélectionnez une date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Heure */}
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-2">
                    Heure *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="time"
                      name="time"
                      required
                      value={newRendezVous.time}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="">Choisissez un créneau</option>
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot.replace(':', 'h')}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 order-2 sm:order-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 justify-center focus:outline-none focus:ring-none focus:border-blue-500 order-1 sm:order-2"
                >
                  <Plus className="w-4 h-4" />
                  Créer le rendez-vous
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Container principal adapté tablette et mobile */}
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
                      {statuts.map(statut => (
                        <option key={statut} value={statut}>
                          {statut === 'tous' ? 'Tous les statuts' : statut}
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
                  {statuts.map(statut => (
                    <option key={statut} value={statut}>
                      {statut === 'tous' ? 'Tous les statuts' : statut}
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-600 mt-2 text-sm">Chargement...</p>
            </div>
          ) : rendezvous.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">Aucun rendez-vous trouvé</p>
              <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rendezvous.map(rdv => {
                const { canDelete } = canDeleteRendezvous(rdv);
                
                return (
                  <div 
                    key={rdv._id}
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
                                className={`w-full px-3 py-2 text-xs font-medium border-b border-slate-200 focus:outline-none focus:ring-none ${getStatusColor(rdv.status)}`}
                              >
                                <option value="En attente">En attente</option>
                                <option value="Confirmé">Confirmé</option>
                                <option value="Terminé">Terminé</option>
                                <option value="Annulé">Annulé</option>
                              </select>
                              <button
                                onClick={() => {
                                  setShowDeleteModal(rdv._id);
                                  setShowMobileActions(null);
                                }}
                                disabled={!canDelete && user?.role !== 'ADMIN'}
                                className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors focus:outline-none focus:ring-none ${
                                  canDelete || user?.role === 'ADMIN'
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-slate-400 cursor-not-allowed'
                                }`}
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
                            <span className="text-slate-700">{new Date(rdv.date).toLocaleDateString('fr-FR')}</span>
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
                              {rdv.destination === 'Autre' && rdv.destinationAutre 
                                ? rdv.destinationAutre 
                                : rdv.destination
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 truncate">
                              {rdv.filiere === 'Autre' && rdv.filiereAutre ? rdv.filiereAutre : rdv.filiere}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Statut et Avis */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(rdv.status)}`}>
                          {rdv.status}
                        </span>
                        {rdv.status === 'Terminé' && rdv.avisAdmin && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getAvisColor(rdv.avisAdmin)}`}>
                            Avis: {rdv.avisAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Version tablette/desktop - Table */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Contact
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Date & Heure
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Destination
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="text-slate-600">Chargement des rendez-vous...</span>
                      </div>
                    </td>
                  </tr>
                ) : rendezvous.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                      <p className="text-slate-600">Aucun rendez-vous trouvé</p>
                      <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
                    </td>
                  </tr>
                ) : (
                  rendezvous.map(rdv => {
                    const { canDelete } = canDeleteRendezvous(rdv);
                    
                    return (
                      <tr 
                        key={rdv._id}
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
                                {new Date(rdv.date).toLocaleDateString('fr-FR')}
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
                              {rdv.destination === 'Autre' && rdv.destinationAutre 
                                ? rdv.destinationAutre 
                                : rdv.destination
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 max-w-[100px] truncate">
                              {rdv.filiere === 'Autre' && rdv.filiereAutre ? rdv.filiereAutre : rdv.filiere}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <select
                              value={rdv.status}
                              onChange={(e) => handleStatusChange(rdv._id, e.target.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 ${getStatusColor(rdv.status)}`}
                            >
                              <option value="En attente">En attente</option>
                              <option value="Confirmé">Confirmé</option>
                              <option value="Terminé">Terminé</option>
                              <option value="Annulé">Annulé</option>
                            </select>
                            {rdv.status === 'Terminé' && rdv.avisAdmin && (
                              <span className={`block px-2 py-1 rounded-lg text-xs font-medium border ${getAvisColor(rdv.avisAdmin)}`}>
                                {rdv.avisAdmin}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowDeleteModal(rdv._id)}
                              disabled={!canDelete && user?.role !== 'ADMIN'}
                              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 ${
                                canDelete || user?.role === 'ADMIN'
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-slate-400 cursor-not-allowed'
                              }`}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-slate-200 bg-slate-50/50">
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