import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const API_URL = (import.meta as any).env.VITE_API_URL;

export interface Destination {
  _id: string;
  country: string;
  text: string;
  imagePath: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PaginatedResponse {
  data: Destination[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

/**
 * Hook personnalisé pour les services admin des destinations
 * Utilise l'AuthContext pour l'authentification et les permissions
 */
export const useDestinationService = () => {
  const auth = useAuth();
  const baseUrl = `${API_URL}/api/destinations`;

  /**
   * Vérifier que l'utilisateur est bien admin
   */
  const checkAdminPermissions = (): void => {
    if (!auth.user || !auth.access_token) {
      throw new Error('Utilisateur non authentifié');
    }

    if (auth.user.role !== 'admin' && !auth.user.isAdmin) {
      throw new Error('Droits administrateur requis');
    }
  };

  /**
   * Gestion centralisée des erreurs avec AuthContext
   */
  const handleError = (error: any, defaultMessage: string): never => {
    // Laisser l'AuthContext gérer les erreurs d'authentification
    if (error.message === 'SESSION_EXPIRED') {
      throw error; // L'AuthContext gère déjà la redirection
    }

    if (import.meta.env.DEV) {
      globalThis.console.error('Erreur DestinationService:', error);
    }

    if (error.name === 'AbortError') {
      throw new Error('Timeout de la requête');
    }

    if (error.message?.includes('429')) {
      throw new Error('Trop de requêtes. Veuillez patienter.');
    }

    if (error.message?.includes('401')) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (error.message?.includes('403')) {
      throw new Error('Droits administrateur requis.');
    }

    if (error.message) {
      throw new Error(error.message);
    }

    throw new Error(defaultMessage);
  };

  /**
   * Récupérer toutes les destinations avec pagination
   */
  const getAllDestinations = async (
    page = 1,
    limit = 10,
    search?: string
  ): Promise<PaginatedResponse> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const response = await globalThis.fetch(`${baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw handleError(error, 'Erreur lors du chargement des destinations');
    }
  };

  /**
   * Récupérer toutes les destinations sans pagination
   */
  const getAllDestinationsWithoutPagination = async (): Promise<Destination[]> => {
    try {
      const response = await globalThis.fetch(`${baseUrl}/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw handleError(error, 'Erreur lors du chargement des destinations');
    }
  };

  /**
   * Récupérer une destination par ID
   */
  const getDestinationById = async (id: string): Promise<Destination> => {
    try {
      if (!id) {
        throw new Error('ID de destination requis');
      }

      const response = await globalThis.fetch(`${baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Destination non trouvée');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw handleError(
        error,
        'Erreur lors de la récupération de la destination'
      );
    }
  };

  /**
   * Créer une nouvelle destination (Admin seulement)
   */
  const createDestination = async (
    data: CreateDestinationData
  ): Promise<Destination> => {
    try {
      // Vérification permissions admin
      checkAdminPermissions();

      // Validation des données
      if (!data.country?.trim()) {
        throw new Error('Le nom du pays est obligatoire');
      }

      if (!data.text?.trim()) {
        throw new Error('La description est obligatoire');
      }

      if (!data.imageFile) {
        throw new Error("L'image est obligatoire");
      }

      if (data.text.length < 10 || data.text.length > 2000) {
        throw new Error(
          'La description doit contenir entre 10 et 2000 caractères'
        );
      }

      // Préparation FormData
      const formData = new FormData();
      formData.append('country', data.country.trim());
      formData.append('text', data.text.trim());
      formData.append('image', data.imageFile);

      const response = await auth.fetchWithAuth(baseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 409) {
          throw new Error('Cette destination existe déjà');
        }

        if (response.status === 401) {
          throw new Error('Token invalide ou expiré');
        }

        if (response.status === 403) {
          throw new Error('Droits administrateur requis');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      toast.success('Destination créée avec succès');
      return result;
    } catch (error: any) {
      toast.error(error.message);
      throw handleError(error, 'Erreur lors de la création de la destination');
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
      // Vérification permissions admin
      checkAdminPermissions();

      if (!id) {
        throw new Error('ID de destination requis');
      }

      // Validation des données
      if (data.country && data.country.trim().length === 0) {
        throw new Error('Le nom du pays ne peut pas être vide');
      }

      if (data.text && (data.text.length < 10 || data.text.length > 2000)) {
        throw new Error(
          'La description doit contenir entre 10 et 2000 caractères'
        );
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

      const response = await auth.fetchWithAuth(`${baseUrl}/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error('Destination non trouvée');
        }

        if (response.status === 409) {
          throw new Error('Une destination avec ce nom existe déjà');
        }

        if (response.status === 401) {
          throw new Error('Token invalide ou expiré');
        }

        if (response.status === 403) {
          throw new Error('Droits administrateur requis');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      toast.success('Destination modifiée avec succès');
      return result;
    } catch (error: any) {
      toast.error(error.message);
      throw handleError(
        error,
        'Erreur lors de la modification de la destination'
      );
    }
  };

  /**
   * Supprimer une destination (Admin seulement)
   */
  const deleteDestination = async (id: string): Promise<void> => {
    try {
      // Vérification permissions admin
      checkAdminPermissions();

      if (!id) {
        throw new Error('ID de destination requis');
      }

      const response = await auth.fetchWithAuth(`${baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error('Destination non trouvée');
        }

        if (response.status === 401) {
          throw new Error('Token invalide ou expiré');
        }

        if (response.status === 403) {
          throw new Error('Droits administrateur requis');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      toast.success('Destination supprimée avec succès');
    } catch (error: any) {
      toast.error(error.message);
      throw handleError(
        error,
        'Erreur lors de la suppression de la destination'
      );
    }
  };

  /**
   * Récupérer les statistiques des destinations
   */
  const getStatistics = async (): Promise<Statistics> => {
    try {
      const destinations = await getAllDestinationsWithoutPagination();

      const uniqueCountries = new Set(
        destinations.map(dest => dest.country.toLowerCase().trim())
      );

      let lastUpdated: string | null = null;
      if (destinations.length > 0) {
        const dates = destinations
          .filter(dest => dest.updatedAt)
          .map(dest => new Date(dest.updatedAt!).getTime());

        if (dates.length > 0) {
          lastUpdated = new Date(Math.max(...dates)).toLocaleDateString(
            'fr-FR'
          );
        }
      }

      return {
        total: destinations.length,
        countries: uniqueCountries.size,
        lastUpdated,
      };
    } catch (error: any) {
      throw handleError(
        error,
        'Erreur lors de la récupération des statistiques'
      );
    }
  };

  /**
   * Rechercher des destinations
   */
  const searchDestinations = async (query: string): Promise<Destination[]> => {
    try {
      if (!query.trim()) {
        return getAllDestinationsWithoutPagination();
      }

      const response = await getAllDestinations(1, 50, query.trim());
      return response.data;
    } catch (error: any) {
      throw handleError(error, 'Erreur lors de la recherche des destinations');
    }
  };

  /**
   * Valider une image avant upload
   */
  const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "L'image ne doit pas dépasser 5MB",
      };
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/avif',
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Format d'image non supporté. Utilisez JPEG, PNG, WEBP, AVIF ou SVG",
      };
    }

    return { isValid: true };
  };

  /**
   * Générer l'URL complète d'une image
   */
  const getFullImageUrl = (imagePath: string): string => {
    if (!imagePath) return '/paname-consulting.jpg';

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    if (imagePath.startsWith('/')) {
      return imagePath;
    }

    let cleanPath = imagePath;
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    cleanPath = cleanPath.replace(/\/\//g, '/');

    return `${API_URL}/${cleanPath}`;
  };

  return {
    getAllDestinations,
    getAllDestinationsWithoutPagination,
    getDestinationById,
    createDestination,
    updateDestination,
    deleteDestination,
    getStatistics,
    searchDestinations,
    validateImageFile,
    getFullImageUrl,
  };
};

// Exporter le hook par défaut
export default useDestinationService;
