// AdminDestinationService.ts
import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

export interface Destination {
  _id: string;
  country: string;
  text: string;
  imagePath: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse {
  data: Destination[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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

// ===== HOOK PERSONNALISÉ CONFORME =====
export const useDestinationService = () => {
  const { isAuthenticated, user, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction de requête sécurisée AVEC délégation complète
  const secureFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
      requireAdmin = false
    ) => {
      // Vérification des droits administrateur - délégation au AuthContext
      if (requireAdmin) {
        if (!isAuthenticated) {
          throw new Error(
            'Authentification requise pour accéder à cette ressource'
          );
        }
        if (!user) {
          throw new Error('Utilisateur non authentifié');
        }
        // Vérification robuste du rôle admin via le AuthContext
        const isAdmin = user.role === 'admin' || user.isAdmin === true;
        if (!isAdmin) {
          throw new Error('Accès refusé : droits administrateur requis');
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // Construction des headers - le AuthContext gère les cookies automatiquement
        const headers: HeadersInit = {
          ...options.headers,
        };

        // NE PAS inclure Authorization header - les cookies sont gérés automatiquement
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers,
          credentials: 'include', // Les cookies sont gérés automatiquement
        });

        clearTimeout(timeoutId);

        // Gestion des erreurs d'authentification - délégation au AuthContext
        if (response.status === 401) {
          // Tentative de rafraîchissement du token via AuthContext
          const refreshed = await refreshAuth();
          if (!refreshed) {
            throw new Error('Session expirée, veuillez vous reconnecter');
          }
          // Si le rafraîchissement a réussi, on relance la requête
          return await secureFetch(endpoint, options, requireAdmin);
        }

        if (response.status === 403) {
          throw new Error('Accès refusé : droits insuffisants');
        }

        if (response.status === 404) {
          throw new Error('Ressource non trouvée');
        }

        if (response.status === 409) {
          throw new Error('Cette destination existe déjà');
        }

        if (response.status === 429) {
          throw new Error('Trop de requêtes, veuillez patienter');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message ||
              `Erreur ${response.status}: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if ((err as Error).name === 'AbortError') {
          throw new Error('Timeout de la requête');
        }
        throw err;
      }
    },
    [API_URL, isAuthenticated, user, refreshAuth]
  );

  // 📋 Récupérer toutes les destinations avec pagination
  const getAllDestinations = useCallback(
    async (
      page: number = 1,
      limit: number = 10,
      search?: string
    ): Promise<PaginatedResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
        });

        return await secureFetch(
          `/api/destinations?${params}`,
          {
            method: 'GET',
          },
          false // Public - ne requiert PAS les droits admin
        );
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors du chargement des destinations';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 📋 Récupérer toutes les destinations sans pagination
  const getAllDestinationsWithoutPagination = useCallback(async (): Promise<
    Destination[]
  > => {
    setIsLoading(true);
    setError(null);

    try {
      return await secureFetch(
        '/api/destinations/all',
        {
          method: 'GET',
        },
        false // Public
      );
    } catch (err: unknown) {
      const errorMessage =
        (err as Error).message || 'Erreur lors du chargement des destinations';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [secureFetch]);

  // 👁️ Récupérer une destination par ID
  const getDestinationById = useCallback(
    async (id: string): Promise<Destination> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id) {
          throw new Error('ID de destination requis');
        }

        return await secureFetch(
          `/api/destinations/${id}`,
          {
            method: 'GET',
          },
          false // Public
        );
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors de la récupération de la destination';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // ➕ Créer une nouvelle destination (Admin seulement)
  const createDestination = useCallback(
    async (data: CreateDestinationData): Promise<Destination> => {
      setIsLoading(true);
      setError(null);

      try {
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

        // Validation de l'image
        const validation = validateImageFile(data.imageFile);
        if (!validation.isValid) {
          throw new Error(validation.error!);
        }

        // Préparation FormData
        const formData = new FormData();
        formData.append('country', data.country.trim());
        formData.append('text', data.text.trim());
        formData.append('image', data.imageFile);

        const result = await secureFetch(
          '/api/destinations',
          {
            method: 'POST',
            body: formData,
            // NE PAS mettre Content-Type pour FormData - le navigateur le gère
          },
          true // Requiert les droits admin
        );

        toast.success('Destination créée avec succès');
        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors de la création de la destination';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // ✏️ Mettre à jour une destination (Admin seulement)
  const updateDestination = useCallback(
    async (id: string, data: UpdateDestinationData): Promise<Destination> => {
      setIsLoading(true);
      setError(null);

      try {
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

        if (data.imageFile) {
          const validation = validateImageFile(data.imageFile);
          if (!validation.isValid) {
            throw new Error(validation.error!);
          }
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

        const result = await secureFetch(
          `/api/destinations/${id}`,
          {
            method: 'PUT',
            body: formData,
          },
          true // Requiert les droits admin
        );

        toast.success('Destination modifiée avec succès');
        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors de la modification de la destination';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 🗑️ Supprimer une destination (Admin seulement)
  const deleteDestination = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id) {
          throw new Error('ID de destination requis');
        }

        await secureFetch(
          `/api/destinations/${id}`,
          {
            method: 'DELETE',
          },
          true // Requiert les droits admin
        );

        toast.success('Destination supprimée avec succès');
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors de la suppression de la destination';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 📊 Récupérer les statistiques des destinations
  const getStatistics = useCallback(async (): Promise<Statistics> => {
    setIsLoading(true);
    setError(null);

    try {
      // Pour l'instant, on utilise la liste complète pour calculer les stats
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
    } catch (err: unknown) {
      const errorMessage =
        (err as Error).message || 'Erreur lors de la récupération des statistiques';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAllDestinationsWithoutPagination]);

  // 🔍 Rechercher des destinations
  const searchDestinations = useCallback(
    async (query: string): Promise<Destination[]> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!query.trim()) {
          return getAllDestinationsWithoutPagination();
        }

        const response = await getAllDestinations(1, 50, query.trim());
        return response.data;
      } catch (err: unknown) {
        const errorMessage =
          (err as Error).message || 'Erreur lors de la recherche des destinations';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAllDestinations, getAllDestinationsWithoutPagination]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Données
    isLoading,
    error,

    // Fonctions
    getAllDestinations,
    getAllDestinationsWithoutPagination,
    getDestinationById,
    createDestination,
    updateDestination,
    deleteDestination,
    getStatistics,
    searchDestinations,

    // Utilitaires
    clearError,
    validateImageFile,

    // Métadonnées (délégation au AuthContext)
    isAdmin: user?.role === 'admin' || user?.isAdmin === true,
    canAccessAdmin:
      isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true),
  };
};

// ===== FONCTIONS UTILITAIRES =====
export const validateImageFile = (
  file: File
): { isValid: boolean; error?: string } => {
  // Taille max: 5MB
  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "L'image ne doit pas dépasser 5MB",
    };
  }

  // Types MIME autorisés
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Format d'image non supporté. Utilisez JPEG, PNG, WEBP ou SVG",
    };
  }

  return { isValid: true };
};

export const getFullImageUrl = (imagePath: string) => {
  if (!imagePath) return '/paname-consulting.jpg';

  // URLs déjà complètes
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  const baseUrl = API_URL;

  // Images dans public (par défaut) - utiliser le chemin relatif directement
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // Images uploadées - construire l'URL complète avec le préfixe uploads
  let cleanPath = imagePath;

  // Si le chemin ne commence pas par 'uploads/', l'ajouter
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  // Nettoyer les doubles slash
  cleanPath = cleanPath.replace(/\/\//g, '/');

  return `${baseUrl}/${cleanPath}`;
};

// Hook spécialisé pour l'admin
export const AdminDestinationService = () => {
  const destinationService = useDestinationService();

  return {
    isLoading: destinationService.isLoading,
    error: destinationService.error,
    getAllDestinations: destinationService.getAllDestinations,
    getAllDestinationsWithoutPagination:
      destinationService.getAllDestinationsWithoutPagination,
    getDestinationById: destinationService.getDestinationById,
    createDestination: destinationService.createDestination,
    updateDestination: destinationService.updateDestination,
    deleteDestination: destinationService.deleteDestination,
    getStatistics: destinationService.getStatistics,
    searchDestinations: destinationService.searchDestinations,
    clearError: destinationService.clearError,
    validateImageFile,
    getFullImageUrl,
    isAdmin: destinationService.isAdmin,
    canAccessAdmin: destinationService.canAccessAdmin,
  };
};

export default AdminDestinationService;
