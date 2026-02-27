// api/admin/AdminDestinationService.ts
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';

// ==================== INTERFACES ====================
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

export interface DeleteResponse {
  message: string;
  deletedDestination: Destination;
}

// ==================== SERVICE ====================
export class AdminDestinationService {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchWithAuth: <T = any>(
      endpoint: string, 
      options?: RequestInit
    ) => Promise<T>
  ) {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
  }

  // ==================== MÉTHODES BACKEND ====================

  /**
   * GET /api/destinations - Récupérer la liste des destinations (public)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search?.trim() && { search: search.trim() })
    });

    return this.fetchWithAuth<PaginatedResponse>(
      `/api/destinations?${params.toString()}`
    );
  }

  /**
   * GET /api/destinations/all - Récupérer toutes les destinations sans pagination (public)
   */
  async findAllWithoutPagination(): Promise<Destination[]> {
    return this.fetchWithAuth<Destination[]>('/api/destinations/all');
  }

  /**
   * GET /api/destinations/:id - Récupérer une destination par ID (public)
   */
  async findOne(id: string): Promise<Destination> {
    return this.fetchWithAuth<Destination>(`/api/destinations/${id}`);
  }

  /**
   * POST /api/destinations - Créer une nouvelle destination (admin)
   */
  async create(data: CreateDestinationData): Promise<Destination> {
    const formData = new FormData();
    formData.append('country', data.country);
    formData.append('text', data.text);
    formData.append('image', data.imageFile);

    // IMPORTANT: Ne pas définir Content-Type pour FormData
    // fetchWithAuth ajoute 'application/json' par défaut, on doit l'override
    return this.fetchWithAuth<Destination>('/api/destinations', {
      method: 'POST',
      body: formData,
      headers: {} // Vider les headers pour que le navigateur définisse le bon Content-Type avec boundary
    });
  }

  /**
   * PUT /api/destinations/:id - Mettre à jour une destination (admin)
   */
  async update(id: string, data: UpdateDestinationData): Promise<Destination> {
    const formData = new FormData();
    if (data.country) formData.append('country', data.country);
    if (data.text) formData.append('text', data.text);
    if (data.imageFile) formData.append('image', data.imageFile);

    // IMPORTANT: Ne pas définir Content-Type pour FormData
    return this.fetchWithAuth<Destination>(`/api/destinations/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {} // Vider les headers
    });
  }

  /**
   * DELETE /api/destinations/:id - Supprimer une destination (admin)
   */
  async remove(id: string): Promise<DeleteResponse> {
    return this.fetchWithAuth<DeleteResponse>(`/api/destinations/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * GET /api/destinations/count - Compter le nombre total de destinations
   */
  async count(filters?: any): Promise<number> {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    return this.fetchWithAuth<number>(`/api/destinations/count${params ? `?${params}` : ''}`);
  }

  /**
   * Vérifie si une destination existe par ID
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.findOne(id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si une destination existe par nom de pays
   */
  async existsByCountry(country: string, excludeId?: string): Promise<boolean> {
    try {
      const destinations = await this.findAllWithoutPagination();
      return destinations.some(dest => 
        dest.country.toLowerCase().trim() === country.toLowerCase().trim() &&
        (!excludeId || dest._id !== excludeId)
      );
    } catch {
      return false;
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Valide un fichier image selon les règles backend
   */
  validateImage(file: File): { isValid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/avif', 
      'image/svg+xml'
    ];

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "L'image ne doit pas dépasser 5MB"
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Format d'image non supporté. Utilisez JPEG, PNG, WEBP, AVIF ou SVG"
      };
    }

    return { isValid: true };
  }

  /**
   * Construit l'URL complète de l'image
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '/images/placeholder.jpg';

    // URLs déjà complètes
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    // Images par défaut dans le dossier public
    if (imagePath.startsWith('/') && !imagePath.startsWith('/uploads')) {
      return imagePath;
    }

    // Images uploadées
    let cleanPath = imagePath;
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    cleanPath = cleanPath.replace(/\/+/g, '/');

    return `${this.baseUrl}/${cleanPath}`;
  }
}

// ==================== HOOK REACT ====================
export const useAdminDestinationService = () => {
  const { fetchWithAuth } = useAuth();

  return useMemo(() => {
    return new AdminDestinationService(fetchWithAuth);
  }, [fetchWithAuth]);
};

export default AdminDestinationService;