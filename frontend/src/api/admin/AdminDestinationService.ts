import { toast } from 'react-toastify';
import { io, Socket } from 'socket.io-client';

const API_URL = (import.meta as any).env.VITE_API_URL;
const WS_URL = API_URL?.replace('http', 'ws')?.replace('https://paname-consulting.vercel.app', 'https://panameconsulting.vercel.app') || 'ws://localhost:10000';

/**
 * Génère l'URL complète pour une image
 * Utilise /uploads/ qui est le chemin fonctionnel
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

  // Images uploadées - ne garder que le nom du fichier
  const baseUrl = API_URL;
  const filename = imagePath.split('/').pop() || imagePath;
  
  // Utiliser /uploads/ qui est fonctionnel
  return `${baseUrl}/uploads/${filename}`;
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

export interface WebSocketEvent {
  event: 'destination-created' | 'destination-updated' | 'destination-deleted' | 'notification';
  data?: any;
  message?: string;
  type?: 'success' | 'error' | 'info';
}

type WebSocketCallback = (event: WebSocketEvent) => void;

class DestinationService {
  private baseUrl: string;
  private socket: Socket | null = null;
  private wsCallbacks: Set<WebSocketCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  constructor() {
    this.baseUrl = `${API_URL}/api/destinations`;
    this.initWebSocket();
  }

  /**
   * Initialise la connexion WebSocket
   */
  private initWebSocket(): void {
    if (this.socket?.connected) return;

    try {
      this.socket = io(`${WS_URL}/destinations`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log(' WebSocket connecté pour les destinations');
        this.reconnectAttempts = 0;
        
        // Notifier tous les callbacks de la connexion
        this.notifyCallbacks({ 
          event: 'notification', 
          message: 'Connecté en temps réel', 
          type: 'success' 
        });
      });

      this.socket.on('destination-created', (destination: Destination) => {
        console.log('Destination créée via WebSocket:', destination.country);
        this.notifyCallbacks({ event: 'destination-created', data: destination });
        
        // Pas de toast ici, géré par le composant
      });

      this.socket.on('destination-updated', (destination: Destination) => {
        console.log('Destination mise à jour via WebSocket:', destination.country);
        this.notifyCallbacks({ event: 'destination-updated', data: destination });
        
        // Pas de toast ici, géré par le composant
      });

      this.socket.on('destination-deleted', (data: { id: string, country?: string }) => {
        const destinationId = typeof data === 'string' ? data : data.id;
        
        console.log('Destination supprimée via WebSocket:', destinationId);
        this.notifyCallbacks({ event: 'destination-deleted', data: destinationId });
        
        // Pas de toast ici, géré par le composant
      });

      this.socket.on('notification', (data: { message: string; type: string }) => {
        this.notifyCallbacks({ 
          event: 'notification', 
          message: data.message, 
          type: data.type as any 
        });

        // Afficher la notification appropriée
        switch (data.type) {
          case 'success':
            toast.success(data.message, { toastId: `ws-notif-${Date.now()}` });
            break;
          case 'error':
            toast.error(data.message, { toastId: `ws-notif-${Date.now()}` });
            break;
          default:
            toast.info(data.message, { toastId: `ws-notif-${Date.now()}` });
        }
      });

      this.socket.on('clients-count', (count: number) => {
        console.log(`👥 ${count} client(s) connecté(s) aux destinations`);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(' WebSocket déconnecté:', reason);
        
        if (reason === 'io server disconnect') {
          // Réconnexion manuelle si déconnecté par le serveur
          setTimeout(() => this.initWebSocket(), 1000);
        }
      });

      this.socket.on('connect_error', (error: { message: any; }) => {
        console.error(' Erreur de connexion WebSocket:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log(' Arrêt des tentatives de reconnexion WebSocket');
          this.socket?.disconnect();
        }
      });

    } catch (error) {
      console.error(' Erreur lors de l\'initialisation WebSocket:', error);
    }
  }

  /**
   * S'abonner aux événements WebSocket
   */
  public subscribe(callback: WebSocketCallback): () => void {
    this.wsCallbacks.add(callback);
    
    // Si le socket n'est pas connecté, essayer de se reconnecter
    if (!this.socket?.connected) {
      this.initWebSocket();
    }
    
    // Retourner une fonction de désabonnement
    return () => {
      this.wsCallbacks.delete(callback);
    };
  }

  /**
   * Notifier tous les callbacks d'un événement
   */
  private notifyCallbacks(event: WebSocketEvent): void {
    this.wsCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(' Erreur dans le callback WebSocket:', error);
      }
    });
  }

  /**
   * Rejoindre une room spécifique pour une destination
   */
  public joinDestinationRoom(destinationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-destination-room', destinationId);
    }
  }

  /**
   * Quitter une room spécifique
   */
  public leaveDestinationRoom(destinationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-destination-room', destinationId);
    }
  }

  /**
   * Déconnecter le WebSocket
   */
  public disconnectWebSocket(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.socket?.disconnect();
    this.socket = null;
  }


  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any, defaultMessage: string): never {
    // Gestion d'erreur silencieuse en développement uniquement
    if (import.meta.env.DEV) {
      console.error(' Erreur DestinationService:', error);
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
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        credentials: 'include', // Important pour les cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const destination = await response.json();
      
      // Nettoyer l'imagePath
      if (destination.imagePath && destination.imagePath.includes('/')) {
        destination.imagePath = destination.imagePath.split('/').pop() || destination.imagePath;
      }
      
      return destination;
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
      const url = new URL(`${this.baseUrl}`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) {
        url.searchParams.append('search', search);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      
      // Nettoyer les imagePath
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map((dest: Destination) => ({
          ...dest,
          imagePath: dest.imagePath && dest.imagePath.includes('/') 
            ? dest.imagePath.split('/').pop() || dest.imagePath 
            : dest.imagePath
        }));
      }
      
      return result;
    } catch (error: any) {
      this.handleError(error, 'Erreur lors du chargement des destinations');
    }
  }

  /**
   * Récupérer toutes les destinations sans pagination
   */
  async getAllDestinationsWithoutPagination(): Promise<Destination[]> {
    try {
      const response = await fetch(`${this.baseUrl}/all`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      let destinations = await response.json();
      
      // S'assurer qu'on a un tableau
      if (!Array.isArray(destinations)) {
        if (destinations && destinations.data && Array.isArray(destinations.data)) {
          destinations = destinations.data;
        } else {
          destinations = [];
        }
      }
      
      // Nettoyer les imagePath - ne garder que le nom du fichier
      destinations = destinations.map((dest: Destination) => ({
        ...dest,
        imagePath: dest.imagePath && dest.imagePath.includes('/') 
          ? dest.imagePath.split('/').pop() || dest.imagePath 
          : dest.imagePath
      }));
      
      return destinations;
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

      // Valider l'image
      const imageValidation = this.validateImageFile(data.imageFile);
      if (!imageValidation.isValid) {
        throw new Error(imageValidation.error);
      }

      // Préparation FormData
      const formData = new FormData();
      formData.append('country', data.country.trim());
      formData.append('text', data.text.trim());
      formData.append('image', data.imageFile);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        credentials: 'include', // Important pour les cookies
        body: formData,
        // Ne pas définir Content-Type, le navigateur le fera automatiquement avec boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 409) {
          throw new Error('Cette destination existe déjà');
        }

        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        if (response.status === 403) {
          throw new Error('Droits administrateur requis');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      
      // Nettoyer l'imagePath
      if (result.imagePath && result.imagePath.includes('/')) {
        result.imagePath = result.imagePath.split('/').pop() || result.imagePath;
      }
      
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

      // Valider l'image si fournie
      if (data.imageFile) {
        const imageValidation = this.validateImageFile(data.imageFile);
        if (!imageValidation.isValid) {
          throw new Error(imageValidation.error);
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

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        credentials: 'include', // Important pour les cookies
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error('Destination non trouvée');
        }

        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
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
      
      // Nettoyer l'imagePath
      if (result.imagePath && result.imagePath.includes('/')) {
        result.imagePath = result.imagePath.split('/').pop() || result.imagePath;
      }
      
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

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Important pour les cookies
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
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        if (response.status === 403) {
          throw new Error('Droits administrateur requis');
        }

        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      // Pas de toast ici, la notification est gérée par le WebSocket
      return;
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
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        credentials: 'include',
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

      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query.trim())}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      let destinations = await response.json();
      
      // S'assurer qu'on a un tableau
      if (!Array.isArray(destinations)) {
        destinations = [];
      }
      
      // Nettoyer les imagePath
      destinations = destinations.map((dest: Destination) => ({
        ...dest,
        imagePath: dest.imagePath && dest.imagePath.includes('/') 
          ? dest.imagePath.split('/').pop() || dest.imagePath 
          : dest.imagePath
      }));
      
      return destinations;
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