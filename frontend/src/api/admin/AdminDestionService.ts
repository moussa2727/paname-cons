import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

export interface Destination {
  _id: string;
  country: string;
  text: string;
  imagePath: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDestinationData {
  country: string;
  text: string;
  imageFile: File;
}

export interface UpdateDestinationData {
  country?: string;
  text?: string;
  imageFile?: File;
}

export interface Statistics {
  total: number;
  countries: number;
  lastUpdated: string | null;
}

// ==================== HOOKS PERSONNALISÉS ====================

/**
 * Hook pour gérer les destinations avec authentification automatique
 */
export const useDestinationService = () => {
  const { fetchWithAuth } = useAuth();

  /**
   * Récupérer toutes les destinations avec pagination (Admin seulement)
   */
  const getAllDestinations = async (page: number = 1, limit: number = 10, search?: string): Promise<{
    data: Destination[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const response = await fetchWithAuth(`${API_URL}/api/destinations?${params}`);
      
      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la récupération des destinations');
      throw error;
    }
  };

  /**
   * Récupérer toutes les destinations sans pagination (Admin seulement)
   */
  const getAllDestinationsWithoutPagination = async (): Promise<Destination[]> => {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/destinations/all`);
      
      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la récupération des destinations');
      throw error;
    }
  };

  /**
   * Récupérer une destination par son ID (Admin seulement)
   */
  const getDestinationById = async (id: string): Promise<Destination> => {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/destinations/${id}`);
      
      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la récupération de la destination');
      throw error;
    }
  };

  /**
   * Créer une nouvelle destination (Admin seulement)
   */
  const createDestination = async (data: CreateDestinationData): Promise<Destination> => {
    try {
      // Validation des données
      if (data.country.trim().length === 0) {
        throw new Error('Le nom du pays ne peut pas être vide');
      }

      if (data.text.length < 10 || data.text.length > 2000) {
        throw new Error('La description doit contenir entre 10 et 2000 caractères');
      }

      // Préparation FormData
      const formData = new FormData();
      formData.append('country', data.country.trim());
      formData.append('text', data.text.trim());
      formData.append('image', data.imageFile);

      const response = await fetchWithAuth(`${API_URL}/api/destinations`, {
        method: 'POST',
        body: formData,
      });

      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      toast.success('Destination créée avec succès');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création de la destination');
      throw error;
    }
  };

  /**
   * Mettre à jour une destination (Admin seulement)
   */
  const updateDestination = async (
    id: string,
    data: UpdateDestinationData
  ): Promise<Destination> => {
    try {
      if (!id) {
        throw new Error('ID de destination requis');
      }

      // Validation des données
      if (data.country && data.country.trim().length === 0) {
        throw new Error('Le nom du pays ne peut pas être vide');
      }

      if (data.text && (data.text.length < 10 || data.text.length > 2000)) {
        throw new Error('La description doit contenir entre 10 et 2000 caractères');
      }

      // Préparation FormData
      const formData = new FormData();

      if (data.country) {
        formData.append('country', data.country.trim());
      }

      if (data.text) {
        formData.append('text', data.text.trim());
      }

      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }

      const response = await fetchWithAuth(`${API_URL}/api/destinations/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      toast.success('Destination mise à jour avec succès');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour de la destination');
      throw error;
    }
  };

  /**
   * Supprimer une destination (Admin seulement)
   */
  const deleteDestination = async (id: string): Promise<void> => {
    try {
      if (!id) {
        throw new Error('ID de destination requis');
      }

      const response = await fetchWithAuth(`${API_URL}/api/destinations/${id}`, {
        method: 'DELETE',
      });

      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      toast.success('Destination supprimée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression de la destination');
      throw error;
    }
  };

  /**
   * Récupérer les statistiques des destinations (Admin seulement)
   */
  const getDestinationStatistics = async (): Promise<Statistics> => {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/destinations/statistics`);
      
      if (!response) {
        throw new Error('Erreur de connexion au serveur');
      }

      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la récupération des statistiques');
      throw error;
    }
  };

  return {
    getAllDestinations,
    getAllDestinationsWithoutPagination,
    getDestinationById,
    createDestination,
    updateDestination,
    deleteDestination,
    getDestinationStatistics,
  };
};

// ==================== INSTANCE POUR RÉTROCOMPATIBILITÉ ====================
// Garder l'export par défaut pour ne pas casser le code existant
class DestinationService {

  constructor() {
  }

  // Ces méthodes sont dépréciées mais gardées pour la rétrocompatibilité
  async getAllDestinations(_page: number = 1, _limit: number = 10) {
    console.warn('DestinationService est déprécié. Utilisez useDestinationService() hook à la place.');
    // Cette méthode ne peut pas fonctionner hors d'un composant React
    throw new Error('DestinationService doit être utilisé dans un composant React avec useDestinationService()');
  }
}

export const destinationService = new DestinationService();
export default DestinationService;
