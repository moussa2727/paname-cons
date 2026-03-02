import { toast } from 'react-toastify';

const API_URL = (import.meta as any).env.VITE_API_URL;

/**
 * Génère l'URL complète pour une image
 * - Images par défaut (/images/*) : servies par le frontend
 * - Images uploadées (uploads/*) : servies par l'API backend
 */
export const getFullImageUrl = (imagePath: string): string => {
  if (!imagePath) return '/images/paname-consulting.jpg';

  // URLs déjà complètes
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Images par défaut dans /images/ (servies par le frontend)
  if (imagePath.startsWith('/images/')) {
    return imagePath;
  }

  // Images uploadées (servies par l'API backend)
  const baseUrl = API_URL;
  
  // Si le chemin commence déjà par uploads/, l'utiliser directement
  // Sinon, ajouter uploads/ devant
  let cleanPath = imagePath;
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  cleanPath = cleanPath.replace(/\/\//g, '/');

  return `${baseUrl}/api/destinations/${cleanPath}`;
};

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

class DestinationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_URL}/api/destinations`;
  }

  /**
   * Headers communs pour les requêtes authentifiées
   */
  private getAuthHeaders() {
    return {
      // Utiliser les cookies pour l'authentification (pas de header Authorization)
      'Content-Type': 'application/json',
    };
  }

  /**
   * Headers pour les requêtes avec FormData (pas de Content-Type)
   */
  private getFormDataHeaders() {
    return {}; // FormData gère automatiquement le Content-Type
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any, defaultMessage: string): never {
    // Gestion d'erreur silencieuse en développement uniquement
    if (import.meta.env.DEV) {
      globalThis.console.error('❌ Erreur DestinationService:', error);
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
  }

  /**
   * Récupérer une destination par ID
   */
  async getDestinationById(id: string): Promise<Destination> {
    try {
      const response = await globalThis.fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        credentials: 'include', // Important pour inclure les cookies
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
      this.handleError(
        error,
        'Erreur lors de la récupération de la destination'
      );
    }
  }

  /**
   * Récupérer toutes les destinations avec pagination
   */
  async getAllDestinations(
    page = 1,
    limit = 10,
    search?: string
  ): Promise<PaginatedResponse> {
    try {
      const response = await globalThis.fetch(
        `${this.baseUrl}?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        {
          method: 'GET',
          credentials: 'include', // Important pour inclure les cookies
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      this.handleError(error, 'Erreur lors du chargement des destinations');
    }
  }

  /**
   * Récupérer toutes les destinations sans pagination
   */
  async getAllDestinationsWithoutPagination(): Promise<Destination[]> {
    try {
      const response = await globalThis.fetch(`${this.baseUrl}/all`, {
        method: 'GET',
        credentials: 'include', // Important pour inclure les cookies
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
      this.handleError(error, 'Erreur lors du chargement des destinations');
    }
  }

  /**
   * Créer une nouvelle destination (Admin seulement)
   */
  async createDestination(
    data: CreateDestinationData
  ): Promise<Destination> {
    try {
      // Validation des données
      if (!data.country?.trim()) {
        throw new Error('Le nom du pays est obligatoire');
      }

      if (!data.text?.trim()) {
        throw new Error('La description est obligatoire');
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

      const response = await globalThis.fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getFormDataHeaders(),
        credentials: 'include', // Important pour inclure les cookies
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
      this.handleError(error, 'Erreur lors de la création de la destination');
    }
  }

  /**
   * Mettre à jour une destination (Admin seulement)
   */
  async updateDestination(
    id: string,
    data: UpdateDestinationData
  ): Promise<Destination> {
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

      const response = await globalThis.fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getFormDataHeaders(),
        credentials: 'include', // Important pour inclure les cookies
        body: formData,
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

        if (response.status === 409) {
          throw new Error('Cette destination existe déjà');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      toast.success('Destination mise à jour avec succès');
      return result;
    } catch (error: any) {
      toast.error(error.message);
      this.handleError(
        error,
        'Erreur lors de la modification de la destination'
      );
    }
  }

  /**
   * Supprimer une destination (Admin seulement)
   */
  async deleteDestination(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('ID de destination requis');
      }

      const response = await globalThis.fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important pour inclure les cookies
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
      this.handleError(error, 'Erreur lors de la suppression de la destination');
    }
  }

  /**
   * Récupérer les statistiques des destinations (Admin seulement)
   */
  async getDestinationStats(): Promise<{
    total: number;
    uniqueCountries: number;
    recentUpdates: number;
  }> {
    try {
      const response = await globalThis.fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        credentials: 'include', // Important pour inclure les cookies
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
      this.handleError(
        error,
        'Erreur lors de la récupération des statistiques'
      );
    }
  }

  /**
   * Rechercher des destinations
   */
  async searchDestinations(query: string): Promise<Destination[]> {
    try {
      if (!query.trim()) {
        return this.getAllDestinationsWithoutPagination();
      }

      const response = await this.getAllDestinations(1, 50, query.trim());
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de la recherche des destinations');
    }
  }

  /**
   * Valider une image avant upload
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
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
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      'image/avif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Format d\'image non autorisé (JPEG, PNG, WEBP, SVG, GIF, AVIF)',
      };
    }

    return { isValid: true };
  }
}

// Export singleton
export const destinationService = new DestinationService();
export default DestinationService;
