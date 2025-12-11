import { toast } from 'react-toastify';

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

export type RendezvousStatus = 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
export type AdminOpinion = 'Favorable' | 'Défavorable';

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

type FetchWithAuth = (endpoint: string, options?: RequestInit) => Promise<Response>;

const API_ENDPOINTS = {
  BASE: '/api/rendezvous',
  LIST: '/api/rendezvous',
  CREATE: '/api/rendezvous',
  GET_ONE: (id: string) => `/api/rendezvous/${id}`,
  UPDATE: (id: string) => `/api/rendezvous/${id}`,
  UPDATE_STATUS: (id: string) => `/api/rendezvous/${id}/status`,
  DELETE: (id: string) => `/api/rendezvous/${id}`,
  CONFIRM: (id: string) => `/api/rendezvous/${id}/confirm`,
  AVAILABLE_SLOTS: '/api/rendezvous/available-slots',
  AVAILABLE_DATES: '/api/rendezvous/available-dates',
} as const;

const TOAST_MESSAGES = {
  FETCH_SUCCESS: 'Rendez-vous chargés',
  CREATE_SUCCESS: 'Rendez-vous créé avec succès',
  UPDATE_SUCCESS: 'Rendez-vous mis à jour',
  STATUS_UPDATE_SUCCESS: 'Statut mis à jour',
  DELETE_SUCCESS: 'Rendez-vous annulé',
  CONFIRM_SUCCESS: 'Rendez-vous confirmé',
  FETCH_ERROR: 'Erreur lors du chargement',
  CREATE_ERROR: 'Erreur lors de la création',
  UPDATE_ERROR: 'Erreur lors de la mise à jour',
  DELETE_ERROR: "Erreur lors de l'annulation",
  NETWORK_ERROR: 'Erreur réseau',
  UNAUTHORIZED: 'Accès non autorisé',
  VALIDATION_ERROR: 'Données invalides',
  RATE_LIMIT_ERROR: 'Trop de requêtes, veuillez patienter',
} as const;

export class AdminRendezVousService {
  private fetchWithAuth: FetchWithAuth;
  private lastRequestTime: number = 0;
  private  MIN_REQUEST_INTERVAL = 2000; // 2 secondes minimum entre les requêtes
  private requestQueue: Promise<any> = Promise.resolve();
  private isProcessingQueue: boolean = false;
  private activeRequests: Set<string> = new Set();
  private requestTimeout: number = 30000; // 30 secondes timeout

  constructor(fetchWithAuth: FetchWithAuth) {
    this.fetchWithAuth = fetchWithAuth;
  }

  private buildQueryString(params: FilterParams): string {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.date) searchParams.append('date', params.date);
    if (params.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async rateLimitedFetch(endpoint: string, options?: RequestInit): Promise<Response> {
    const requestId = `${endpoint}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.activeRequests.add(requestId);
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Attendre si la dernière requête était trop récente
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`⏰ Attente requise (${waitTime}ms, minimum ${this.MIN_REQUEST_INTERVAL}ms)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequestTime = Date.now();
      
      // Ajouter un timeout à la requête
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      try {
        const response = await this.fetchWithAuth(endpoint, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  private async queueRequest<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${operationName}-${Date.now()}`;
      
      this.requestQueue = this.requestQueue
        .then(async () => {
          this.isProcessingQueue = true;
          try {
            console.log(`⌛ Début de l'opération: ${operationName}`);
            const result = await operation();
            console.log(`✅ Opération réussie: ${operationName}`);
            resolve(result);
          } catch (error) {
            console.error(`❌ Erreur dans l'opération ${operationName}:`, error);
            reject(error);
          } finally {
            this.isProcessingQueue = false;
          }
        })
        .catch((error) => {
          console.error(`❌ Erreur dans la file d'attente pour ${operationName}:`, error);
          reject(error);
        });
    });
  }

  private async handleResponse<T>(response: Response, operation: string): Promise<T> {
    if (!response.ok) {
      // Gestion spécifique du rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '2';
        const waitTime = parseInt(retryAfter) * 1000;
        console.warn(`⚠️ Rate limiting détecté: ${retryAfter} secondes`);
        toast.warning(`Trop de requêtes. Réessayez dans ${retryAfter} secondes`, {
          autoClose: 3000,
        });
        throw new Error('TOO MANY REQUESTS');
      }

      if (response.status === 401 || response.status === 403) {
        toast.error(TOAST_MESSAGES.UNAUTHORIZED, {
          autoClose: 3000,
        });
        throw new Error('Unauthorized');
      }

      if (response.status === 400) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || TOAST_MESSAGES.VALIDATION_ERROR;
          toast.error(errorMessage, {
            autoClose: 3000,
          });
          throw new Error(errorMessage);
        } catch {
          toast.error(TOAST_MESSAGES.VALIDATION_ERROR, {
            autoClose: 3000,
          });
          throw new Error(TOAST_MESSAGES.VALIDATION_ERROR);
        }
      }

      if (response.status === 404) {
        toast.error('Rendez-vous non trouvé', {
          autoClose: 3000,
        });
        throw new Error('Not found');
      }

      try {
        const errorData = await response.json();
        const errorMessage = errorData.message || `Erreur: ${response.status}`;
        toast.error(errorMessage, {
          autoClose: 3000,
        });
        throw new Error(errorMessage);
      } catch {
        toast.error(`Erreur serveur: ${response.status}`, {
          autoClose: 3000,
        });
        throw new Error(`HTTP ${response.status}`);
      }
    }

    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('Erreur de parsing JSON:', error);
      toast.error('Erreur lors du traitement de la réponse', {
        autoClose: 3000,
      });
      throw new Error('Erreur lors du traitement de la réponse');
    }
  }

  async getAllRendezvous(filters: FilterParams = {}): Promise<RendezvousListResponse> {
    return this.queueRequest(async () => {
      try {
        const queryString = this.buildQueryString(filters);
        console.log(`📤 Requête GET: ${API_ENDPOINTS.LIST}${queryString}`);
        
        const response = await this.rateLimitedFetch(`${API_ENDPOINTS.LIST}${queryString}`);

        const data = await this.handleResponse<RendezvousListResponse>(
          response,
          'getAllRendezvous'
        );

        console.log(`✅ ${data.data.length} rendez-vous chargés sur ${data.total} total`);
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            toast.error('La requête a expiré. Veuillez réessayer.', {
              autoClose: 3000,
            });
            throw new Error('Request timeout');
          }
          
          if (error.message === 'Unauthorized') {
            throw error;
          }
          
          if (error.message === 'TOO MANY REQUESTS') {
            // Ne pas afficher de toast supplémentaire, déjà géré dans handleResponse
            throw error;
          }
          
          if (!error.message.includes('TOO MANY REQUESTS') && 
              !error.message.includes('Unauthorized')) {
            toast.error(TOAST_MESSAGES.FETCH_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'getAllRendezvous');
  }

  async getRendezvousById(id: string): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      if (!id || id.trim() === '') {
        toast.error('ID rendez-vous invalide', {
          autoClose: 3000,
        });
        throw new Error('Invalid ID');
      }

      try {
        console.log(`📤 Requête GET: ${API_ENDPOINTS.GET_ONE(id)}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.GET_ONE(id));

        const data = await this.handleResponse<Rendezvous>(
          response,
          'getRendezvousById'
        );

        console.log(`✅ Rendez-vous ${id} chargé avec succès`);
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.FETCH_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'getRendezvousById');
  }

  async createRendezvous(data: CreateRendezvousData): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      try {
        // Validation des données requises
        const requiredFields = ['userId', 'firstName', 'lastName', 'email', 'date', 'time', 'destination', 'filiere', 'niveauEtude'];
        const missingFields = requiredFields.filter(field => !data[field as keyof CreateRendezvousData]);
        
        if (missingFields.length > 0) {
          toast.error(`Champs manquants: ${missingFields.join(', ')}`, {
            autoClose: 3000,
          });
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        console.log(`📤 Requête POST: ${API_ENDPOINTS.CREATE}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.CREATE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await this.handleResponse<Rendezvous>(
          response,
          'createRendezvous'
        );

        toast.success(TOAST_MESSAGES.CREATE_SUCCESS, {
          autoClose: 3000,
        });
        console.log(`✅ Rendez-vous créé avec ID: ${result._id}`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.CREATE_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'createRendezvous');
  }

  async updateRendezvous(id: string, data: UpdateRendezvousData): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      if (!id || id.trim() === '') {
        toast.error('ID rendez-vous invalide', {
          autoClose: 3000,
        });
        throw new Error('Invalid ID');
      }

      try {
        console.log(`📤 Requête PUT: ${API_ENDPOINTS.UPDATE(id)}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.UPDATE(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await this.handleResponse<Rendezvous>(
          response,
          'updateRendezvous'
        );

        toast.success(TOAST_MESSAGES.UPDATE_SUCCESS, {
          autoClose: 3000,
        });
        console.log(`✅ Rendez-vous ${id} mis à jour`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.UPDATE_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'updateRendezvous');
  }

  async updateStatus(
    id: string,
    status: RendezvousStatus,
    avisAdmin?: AdminOpinion
  ): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      if (!id || id.trim() === '') {
        toast.error('ID rendez-vous invalide', {
          autoClose: 3000,
        });
        throw new Error('Invalid ID');
      }

      if (status === 'Terminé' && !avisAdmin) {
        toast.error('Avis admin requis pour terminer un rendez-vous', {
          autoClose: 3000,
        });
        throw new Error('Missing avisAdmin');
      }

      try {
        console.log(`📤 Requête PUT: ${API_ENDPOINTS.UPDATE_STATUS(id)}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.UPDATE_STATUS(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, avisAdmin }),
        });

        const result = await this.handleResponse<Rendezvous>(
          response,
          'updateStatus'
        );

        toast.success(TOAST_MESSAGES.STATUS_UPDATE_SUCCESS, {
          autoClose: 3000,
        });
        console.log(`✅ Statut du rendez-vous ${id} mis à jour: ${status}`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.UPDATE_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'updateStatus');
  }

  async confirmRendezvous(id: string): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      if (!id || id.trim() === '') {
        toast.error('ID rendez-vous invalide', {
          autoClose: 3000,
        });
        throw new Error('Invalid ID');
      }

      try {
        console.log(`📤 Requête PUT: ${API_ENDPOINTS.CONFIRM(id)}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.CONFIRM(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await this.handleResponse<Rendezvous>(
          response,
          'confirmRendezvous'
        );

        toast.success(TOAST_MESSAGES.CONFIRM_SUCCESS, {
          autoClose: 3000,
        });
        console.log(`✅ Rendez-vous ${id} confirmé`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.UPDATE_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'confirmRendezvous');
  }

  async cancelRendezvous(id: string): Promise<Rendezvous> {
    return this.queueRequest(async () => {
      if (!id || id.trim() === '') {
        toast.error('ID rendez-vous invalide', {
          autoClose: 3000,
        });
        throw new Error('Invalid ID');
      }

      try {
        console.log(`📤 Requête DELETE: ${API_ENDPOINTS.DELETE(id)}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.DELETE(id), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await this.handleResponse<Rendezvous>(
          response,
          'cancelRendezvous'
        );

        toast.success(TOAST_MESSAGES.DELETE_SUCCESS, {
          autoClose: 3000,
        });
        console.log(`✅ Rendez-vous ${id} annulé`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error(TOAST_MESSAGES.DELETE_ERROR, {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'cancelRendezvous');
  }

  async getAvailableSlots(date: string): Promise<string[]> {
    return this.queueRequest(async () => {
      if (!date || date.trim() === '') {
        toast.error('Date requise', {
          autoClose: 3000,
        });
        throw new Error('Missing date');
      }

      try {
        console.log(`📤 Requête GET: ${API_ENDPOINTS.AVAILABLE_SLOTS}?date=${date}`);
        const response = await this.rateLimitedFetch(
          `${API_ENDPOINTS.AVAILABLE_SLOTS}?date=${encodeURIComponent(date)}`
        );

        const data = await this.handleResponse<string[]>(
          response,
          'getAvailableSlots'
        );

        console.log(`✅ ${data.length} créneaux disponibles pour ${date}`);
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error('Erreur lors du chargement des créneaux', {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'getAvailableSlots');
  }

  async getAvailableDates(): Promise<string[]> {
    return this.queueRequest(async () => {
      try {
        console.log(`📤 Requête GET: ${API_ENDPOINTS.AVAILABLE_DATES}`);
        const response = await this.rateLimitedFetch(API_ENDPOINTS.AVAILABLE_DATES);

        const data = await this.handleResponse<string[]>(
          response,
          'getAvailableDates'
        );

        console.log(`✅ ${data.length} dates disponibles`);
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message !== 'Unauthorized') {
            toast.error('Erreur lors du chargement des dates', {
              autoClose: 3000,
            });
          }
        }
        throw error;
      }
    }, 'getAvailableDates');
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  resetRateLimiting(): void {
    console.log('🔄 Réinitialisation du rate limiting');
    this.lastRequestTime = 0;
    this.requestQueue = Promise.resolve();
    this.isProcessingQueue = false;
    this.activeRequests.clear();
  }

  isBusy(): boolean {
    const isRateLimited = Date.now() - this.lastRequestTime < this.MIN_REQUEST_INTERVAL;
    return this.isProcessingQueue || isRateLimited || this.activeRequests.size > 0;
  }

  getEstimatedWaitTime(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest >= this.MIN_REQUEST_INTERVAL) {
      return 0;
    }
    
    const rateLimitWait = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    const queueWait = this.activeRequests.size * this.MIN_REQUEST_INTERVAL;
    
    return rateLimitWait + queueWait;
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  cancelAllRequests(): void {
    console.log('🚫 Annulation de toutes les requêtes en cours');
    this.activeRequests.clear();
    this.requestQueue = Promise.resolve();
    this.isProcessingQueue = false;
  }

  // Méthode pour mettre à jour l'intervalle minimum entre les requêtes
  setMinRequestInterval(intervalMs: number): void {
    if (intervalMs < 500) {
      console.warn(`Intervalle ${intervalMs}ms trop court, utilisation de 500ms minimum`);
      this.MIN_REQUEST_INTERVAL = 500;
    } else {
      this.MIN_REQUEST_INTERVAL = intervalMs;
    }
    console.log(`⏱️ Intervalle minimum entre requêtes défini à ${this.MIN_REQUEST_INTERVAL}ms`);
  }

  // Méthode pour mettre à jour le timeout des requêtes
  setRequestTimeout(timeoutMs: number): void {
    if (timeoutMs < 1000) {
      console.warn(`Timeout ${timeoutMs}ms trop court, utilisation de 1000ms minimum`);
      this.requestTimeout = 1000;
    } else {
      this.requestTimeout = timeoutMs;
    }
    console.log(`⏱️ Timeout des requêtes défini à ${this.requestTimeout}ms`);
  }
}