// ==================== IMPORT DES DÉPENDANCES ====================
import { toast } from 'react-toastify';

// ==================== CONSTANTES D'API ====================
const API_BASE_URL = import.meta.env.VITE_API_URL;
const ENDPOINTS = {
  RENDEZVOUS_BASE: '/api/rendezvous',
  RENDEZVOUS_USER: '/api/rendezvous/user',
  AVAILABLE_SLOTS: '/api/rendezvous/available-slots',
  AVAILABLE_DATES: '/api/rendezvous/available-dates',
  
  BY_ID: (id: string) => `/api/rendezvous/${id}`,
  UPDATE_STATUS: (id: string) => `/api/rendezvous/${id}/status`,
  CONFIRM: (id: string) => `/api/rendezvous/${id}/confirm`,
} as const;

// ==================== CONSTANTES DE STATUT ====================
export const RENDEZVOUS_STATUS = {
  PENDING: 'En attente' as const,
  CONFIRMED: 'Confirmé' as const,
  COMPLETED: 'Terminé' as const,
  CANCELLED: 'Annulé' as const
} as const;

export const ADMIN_OPINION = {
  FAVORABLE: 'Favorable' as const,
  UNFAVORABLE: 'Défavorable' as const
} as const;

export const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat'
] as const;

// ==================== TYPES ====================
export type RendezvousStatus = typeof RENDEZVOUS_STATUS[keyof typeof RENDEZVOUS_STATUS];
export type AdminOpinion = typeof ADMIN_OPINION[keyof typeof ADMIN_OPINION];
export type EducationLevel = typeof EDUCATION_LEVELS[number];

export interface RendezVous {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: EducationLevel;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
  status: RendezvousStatus;
  avisAdmin?: AdminOpinion;
  cancelledAt?: Date;
  cancelledBy?: 'admin' | 'user';
  cancellationReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateRendezVousDto {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
  destination?: string;
  destinationAutre?: string;
  niveauEtude?: EducationLevel;
  filiere?: string;
  filiereAutre?: string;
  date?: string;
  time?: string;
  status?: RendezvousStatus;
  avisAdmin?: AdminOpinion;
}

export interface FindAllFilters {
  page?: number;
  limit?: number;
  status?: RendezvousStatus;
  date?: string;
  search?: string;
}

export interface FindUserRendezVousFilters {
  page?: number;
  limit?: number;
  status?: RendezvousStatus;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== MESSAGES TOAST ====================
const TOAST_MESSAGES = {
  // Succès
  FETCH_SUCCESS: 'Rendez-vous chargés avec succès',
  UPDATE_SUCCESS: 'Rendez-vous mis à jour avec succès',
  STATUS_UPDATE_SUCCESS: 'Statut mis à jour avec succès',
  CONFIRM_SUCCESS: 'Rendez-vous confirmé avec succès',
  DELETE_SUCCESS: 'Rendez-vous annulé avec succès',
  
  // Erreurs
  FETCH_ERROR: 'Erreur lors du chargement des rendez-vous',
  UPDATE_ERROR: 'Erreur lors de la mise à jour du rendez-vous',
  STATUS_UPDATE_ERROR: 'Erreur lors de la mise à jour du statut',
  CONFIRM_ERROR: 'Erreur lors de la confirmation du rendez-vous',
  DELETE_ERROR: 'Erreur lors de l\'annulation du rendez-vous',
  VALIDATION_ERROR: 'Données de formulaire invalides',
  UNAUTHORIZED: 'Session expirée. Veuillez vous reconnecter.',
  FORBIDDEN: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
  NOT_FOUND: 'Rendez-vous non trouvé',
  RATE_LIMIT: 'Trop de requêtes. Veuillez patienter quelques instants.',
} as const;

// ==================== SERVICE CLASS ====================
export class AdminRendezVousService {
  /**
   * Fonction fetchWithAuth fournie par le AuthContext
   * NOTE: fetchWithAuth doit déjà inclure l'API_BASE_URL
   */
  private fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
  
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 secondes entre les requêtes

  constructor(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    if (!fetchWithAuth) {
      throw new Error('fetchWithAuth est requis - utilisez useAuth().fetchWithAuth');
    }
    this.fetchWithAuth = fetchWithAuth;
  }

  /**
   * Ajoute une requête à la file d'attente
   */
  private async addToQueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          // Respecter l'intervalle minimum entre les requêtes
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          
          if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await this.wait(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
          }
          
          const result = await requestFn();
          this.lastRequestTime = Date.now();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Traite la file d'attente
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.requestQueue.length > 0) {
        const requestFn = this.requestQueue.shift();
        if (requestFn) {
          await requestFn();
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Attendre un certain temps
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== MÉTHODES ADMIN ====================

  /**
   * Récupérer tous les rendez-vous avec pagination et filtres (ADMIN UNIQUEMENT)
   * Correspond à: GET /api/rendezvous?page=1&limit=10&status=...&date=...&search=...
   */
  async findAll(filters?: FindAllFilters): Promise<PaginatedResponse<RendezVous>> {
    return this.addToQueue(async () => {
      try {
        const params = new URLSearchParams();
        
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.status) params.append('status', filters.status);
        if (filters?.date) params.append('date', filters.date);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        const endpoint = queryString 
          ? `${ENDPOINTS.RENDEZVOUS_BASE}?${queryString}` 
          : ENDPOINTS.RENDEZVOUS_BASE;

        const response = await this.fetchWithAuth(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.FETCH_ERROR);
        }

        const data = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous chargés:', data.total);
        }

        // Transformation des données pour correspondre au type RendezVous
        const typedData = {
          ...data,
          data: data.data.map((item: any) => ({
            ...item,
            status: item.status as RendezvousStatus,
            avisAdmin: item.avisAdmin as AdminOpinion | undefined,
            niveauEtude: item.niveauEtude as EducationLevel,
            cancelledBy: item.cancelledBy as 'admin' | 'user' | undefined,
            cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : undefined,
            createdAt: new Date(item.createdAt),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
          }))
        };

        return typedData;
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.FETCH_ERROR);
        throw error;
      }
    });
  }

  /**
   * Récupérer les rendez-vous de l'utilisateur connecté
   * Correspond à: GET /api/rendezvous/user?page=1&limit=10&status=...
   */
  async findUserRendezVous(filters?: FindUserRendezVousFilters): Promise<PaginatedResponse<RendezVous>> {
    return this.addToQueue(async () => {
      try {
        const params = new URLSearchParams();
        
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.status) params.append('status', filters.status);

        const queryString = params.toString();
        const endpoint = queryString 
          ? `${ENDPOINTS.RENDEZVOUS_USER}?${queryString}` 
          : ENDPOINTS.RENDEZVOUS_USER;

        const response = await this.fetchWithAuth(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.FETCH_ERROR);
        }

        const data = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous utilisateur chargés:', data.total);
        }

        return data;
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.FETCH_ERROR);
        throw error;
      }
    });
  }

  /**
   * Récupérer un rendez-vous par ID avec validation d'ID
   * Correspond à: GET /api/rendezvous/:id
   */
  async findOne(id: string): Promise<RendezVous> {
    return this.addToQueue(async () => {
      try {
        if (!this.isValidMongoId(id)) {
          throw new Error('ID du rendez-vous invalide');
        }

        const response = await this.fetchWithAuth(ENDPOINTS.BY_ID(id), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.FETCH_ERROR);
        }

        const data = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous chargé:', data._id);
        }

        return {
          ...data,
          status: data.status as RendezvousStatus,
          avisAdmin: data.avisAdmin as AdminOpinion | undefined,
          niveauEtude: data.niveauEtude as EducationLevel,
          cancelledBy: data.cancelledBy as 'admin' | 'user' | undefined,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        };
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.FETCH_ERROR);
        throw error;
      }
    });
  }

  /**
   * Mettre à jour un rendez-vous avec validation d'ID
   * Correspond à: PUT /api/rendezvous/:id
   */
  async update(id: string, updateDto: UpdateRendezVousDto): Promise<RendezVous> {
    return this.addToQueue(async () => {
      try {
        if (!this.isValidMongoId(id)) {
          throw new Error('ID du rendez-vous invalide');
        }

        // Validation des données avant envoi
        this.validateUpdateDto(updateDto);

        const response = await this.fetchWithAuth(ENDPOINTS.BY_ID(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateDto),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.UPDATE_ERROR);
        }

        const data = await response.json();
        
        toast.success(TOAST_MESSAGES.UPDATE_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous mis à jour:', data._id);
        }

        return {
          ...data,
          status: data.status as RendezvousStatus,
          avisAdmin: data.avisAdmin as AdminOpinion | undefined,
          niveauEtude: data.niveauEtude as EducationLevel,
          cancelledBy: data.cancelledBy as 'admin' | 'user' | undefined,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        };
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.UPDATE_ERROR);
        throw error;
      }
    });
  }

  /**
   * Mettre à jour le statut d'un rendez-vous avec validation d'ID et rate limiting
   * Correspond à: PUT /api/rendezvous/:id/status
   */
  async updateStatus(
    id: string, 
    status: RendezvousStatus, 
    avisAdmin?: AdminOpinion
  ): Promise<RendezVous> {
    return this.addToQueue(async () => {
      try {
        if (!this.isValidMongoId(id)) {
          throw new Error('ID du rendez-vous invalide');
        }

        if (!status) {
          throw new Error('Statut requis');
        }

        // Validation: avisAdmin obligatoire pour "Terminé"
        if (status === RENDEZVOUS_STATUS.COMPLETED && !avisAdmin) {
          throw new Error('L\'avis admin est obligatoire pour terminer un rendez-vous');
        }

        const body: any = { status };
        if (avisAdmin) {
          body.avisAdmin = avisAdmin;
        }

        const response = await this.fetchWithAuth(ENDPOINTS.UPDATE_STATUS(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.STATUS_UPDATE_ERROR);
        }

        const data = await response.json();
        
        toast.success(TOAST_MESSAGES.STATUS_UPDATE_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Statut mis à jour:', { id, status, avisAdmin });
        }

        return {
          ...data,
          status: data.status as RendezvousStatus,
          avisAdmin: data.avisAdmin as AdminOpinion | undefined,
          niveauEtude: data.niveauEtude as EducationLevel,
          cancelledBy: data.cancelledBy as 'admin' | 'user' | undefined,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        };
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.STATUS_UPDATE_ERROR);
        throw error;
      }
    });
  }

  /**
   * Confirmer un rendez-vous en attente avec validation d'ID
   * Correspond à: PUT /api/rendezvous/:id/confirm
   */
  async confirm(id: string): Promise<RendezVous> {
    return this.addToQueue(async () => {
      try {
        if (!this.isValidMongoId(id)) {
          throw new Error('ID du rendez-vous invalide');
        }

        const response = await this.fetchWithAuth(ENDPOINTS.CONFIRM(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.CONFIRM_ERROR);
        }

        const data = await response.json();
        
        toast.success(TOAST_MESSAGES.CONFIRM_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous confirmé:', data._id);
        }

        return {
          ...data,
          status: data.status as RendezvousStatus,
          avisAdmin: data.avisAdmin as AdminOpinion | undefined,
          niveauEtude: data.niveauEtude as EducationLevel,
          cancelledBy: data.cancelledBy as 'admin' | 'user' | undefined,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        };
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.CONFIRM_ERROR);
        throw error;
      }
    });
  }

  /**
   * Annuler un rendez-vous avec validation d'ID et rate limiting
   * Correspond à: DELETE /api/rendezvous/:id
   */
  async delete(id: string): Promise<RendezVous> {
    return this.addToQueue(async () => {
      try {
        if (!this.isValidMongoId(id)) {
          throw new Error('ID du rendez-vous invalide');
        }

        const response = await this.fetchWithAuth(ENDPOINTS.BY_ID(id), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, TOAST_MESSAGES.DELETE_ERROR);
        }

        const data = await response.json();
        
        toast.success(TOAST_MESSAGES.DELETE_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Rendez-vous annulé:', data._id);
        }

        return {
          ...data,
          status: data.status as RendezvousStatus,
          avisAdmin: data.avisAdmin as AdminOpinion | undefined,
          niveauEtude: data.niveauEtude as EducationLevel,
          cancelledBy: data.cancelledBy as 'admin' | 'user' | undefined,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        };
      } catch (error: any) {
        this.handleError(error, TOAST_MESSAGES.DELETE_ERROR);
        throw error;
      }
    });
  }

  // ==================== MÉTHODES PUBLIQUES (SANS AUTH) ====================

  /**
   * Obtenir les créneaux disponibles pour une date
   * Correspond à: GET /api/rendezvous/available-slots?date=YYYY-MM-DD
   */
  async getAvailableSlots(date: string): Promise<string[]> {
    return this.addToQueue(async () => {
      try {
        if (!date) {
          throw new Error('Date requise');
        }

        const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AVAILABLE_SLOTS}?date=${encodeURIComponent(date)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, 'Erreur lors de la récupération des créneaux');
        }

        return await response.json();
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Erreur lors de la récupération des créneaux:', error);
        }
        throw error;
      }
    });
  }

  /**
   * Obtenir les dates disponibles
   * Correspond à: GET /api/rendezvous/available-dates
   */
  async getAvailableDates(): Promise<string[]> {
    return this.addToQueue(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AVAILABLE_DATES}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleErrorResponse(response, 'Erreur lors de la récupération des dates');
        }

        return await response.json();
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Erreur lors de la récupération des dates:', error);
        }
        throw error;
      }
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Valider les données de mise à jour
   */
  private validateUpdateDto(dto: UpdateRendezVousDto): void {
    // Email
    if (dto.email && !this.isValidEmail(dto.email)) {
      throw new Error('Format d\'email invalide');
    }

    // Téléphone
    if (dto.telephone && !this.isValidPhone(dto.telephone)) {
      throw new Error('Format de téléphone invalide');
    }

    // Date
    if (dto.date && !this.isValidDate(dto.date)) {
      throw new Error('Format de date invalide (YYYY-MM-DD requis)');
    }

    // Time
    if (dto.time && !this.isValidTime(dto.time)) {
      throw new Error('Créneau horaire invalide (09:00-16:30, par pas de 30min)');
    }

    // Destination "Autre"
    if (dto.destination === 'Autre' && (!dto.destinationAutre || dto.destinationAutre.trim() === '')) {
      throw new Error('La destination "Autre" nécessite une précision');
    }

    // Filière "Autre"
    if (dto.filiere === 'Autre' && (!dto.filiereAutre || dto.filiereAutre.trim() === '')) {
      throw new Error('La filière "Autre" nécessite une précision');
    }
  }

  /**
   * Valider un ID MongoDB
   */
  private isValidMongoId(id: string): boolean {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return false;
    }
    
    // Validation basique d'ObjectId MongoDB (24 caractères hexadécimaux)
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    return mongoIdRegex.test(id.trim());
  }

  /**
   * Valider un email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valider un téléphone
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Valider une date (YYYY-MM-DD)
   */
  private isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    return dateRegex.test(date);
  }

  /**
   * Valider un créneau horaire (09:00-16:30, par pas de 30min)
   */
  private isValidTime(time: string): boolean {
    const timeRegex = /^(09|1[0-6]):(00|30)$/;
    return timeRegex.test(time);
  }

  /**
   * Gérer les erreurs de réponse HTTP avec gestion du rate limiting
   */
  private async handleErrorResponse(response: Response, defaultMessage: string): Promise<never> {
    let errorMessage = defaultMessage;
    
    try {
      const errorData = await response.json();
      
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      }
      
      // Gestion du rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
        errorMessage = `RATE_LIMIT:${waitTime}`;
      }
      
      // Messages spécifiques par code de statut
      switch (response.status) {
        case 400:
          errorMessage = errorData.message || TOAST_MESSAGES.VALIDATION_ERROR;
          break;
        case 401:
          errorMessage = TOAST_MESSAGES.UNAUTHORIZED;
          break;
        case 403:
          errorMessage = TOAST_MESSAGES.FORBIDDEN;
          break;
        case 404:
          errorMessage = TOAST_MESSAGES.NOT_FOUND;
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
      }
    } catch (e) {
      // Si on ne peut pas parser la réponse, utiliser le message par défaut
      if (import.meta.env.DEV) {
        console.warn('⚠️ Impossible de parser la réponse d\'erreur:', e);
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * Gérer les erreurs générales avec gestion du rate limiting
   */
  private handleError(error: any, defaultMessage: string): void {
    const errorMessage = error.message || defaultMessage;
    
    // Gestion du rate limiting
    if (errorMessage.startsWith('RATE_LIMIT:')) {
      const waitTime = parseInt(errorMessage.split(':')[1]);
      if (import.meta.env.DEV) {
        console.log(`⏳ Rate limit détecté, attente de ${waitTime}ms`);
      }
      return;
    }
    
    if (import.meta.env.DEV) {
      console.error('❌ Erreur AdminRendezVousService:', {
        message: errorMessage,
        stack: error.stack,
      });
    }

    // Ne pas afficher de toast si c'est une erreur SESSION_EXPIRED
    // (déjà gérée par fetchWithAuth)
    if (errorMessage === 'SESSION_EXPIRED' || errorMessage === 'SESSION_CHECK_IN_PROGRESS') {
      return;
    }

    // Ne pas afficher de toast pour les erreurs 401/403
    // (déjà gérées par fetchWithAuth avec redirection)
    if (errorMessage.includes('Session expirée') || 
        errorMessage.includes('Accès refusé')) {
      return;
    }

    // Afficher le toast d'erreur pour les autres cas
    toast.error(errorMessage, { autoClose: 5000 });
  }

  // ==================== MÉTHODES HELPER STATIQUES ====================

  /**
   * Obtenir le label du statut
   */
  static getStatusLabel(status: RendezvousStatus): string {
    return status;
  }

  /**
   * Obtenir la couleur du statut pour l'UI
   */
  static getStatusColor(status: RendezvousStatus): string {
    switch (status) {
      case RENDEZVOUS_STATUS.PENDING:
        return 'orange';
      case RENDEZVOUS_STATUS.CONFIRMED:
        return 'blue';
      case RENDEZVOUS_STATUS.COMPLETED:
        return 'green';
      case RENDEZVOUS_STATUS.CANCELLED:
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Formater une date pour l'affichage
   */
  static formatDate(dateString: string): string {
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
  }

  /**
   * Formater une heure pour l'affichage
   */
  static formatTime(timeString: string): string {
    return timeString;
  }

  /**
   * Formater une date et heure complètes
   */
  static formatDateTime(dateString: string, timeString: string): string {
    try {
      const dateTime = new Date(`${dateString}T${timeString}:00`);
      return dateTime.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return `${dateString} ${timeString}`;
    }
  }

  /**
   * Obtenir la destination effective (gère le cas "Autre")
   */
  static getEffectiveDestination(rdv: RendezVous): string {
    return rdv.destination === 'Autre' && rdv.destinationAutre
      ? rdv.destinationAutre
      : rdv.destination;
  }

  /**
   * Obtenir la filière effective (gère le cas "Autre")
   */
  static getEffectiveFiliere(rdv: RendezVous): string {
    return rdv.filiere === 'Autre' && rdv.filiereAutre
      ? rdv.filiereAutre
      : rdv.filiere;
  }

  /**
   * Vérifier si un statut est valide
   */
  static isValidStatus(status: string): boolean {
    return Object.values(RENDEZVOUS_STATUS).includes(status as RendezvousStatus);
  }

  /**
   * Vérifier si un avis admin est valide
   */
  static isValidAdminOpinion(opinion: string): boolean {
    return Object.values(ADMIN_OPINION).includes(opinion as AdminOpinion);
  }

  /**
   * Vérifier si un ID est valide (public pour le composant)
   */
  static isValidId(id: string): boolean {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return false;
    }
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    return mongoIdRegex.test(id.trim());
  }

  /**
   * Vérifier si un rendez-vous peut être annulé
   * Note: Cette logique est principalement gérée côté backend
   */
  static canCancelRendezvous(rdv: RendezVous): boolean {
    if (rdv.status === RENDEZVOUS_STATUS.CANCELLED || 
        rdv.status === RENDEZVOUS_STATUS.COMPLETED) {
      return false;
    }
    return true;
  }

  /**
   * Obtenir la couleur de l'avis admin
   */
  static getAdminOpinionColor(opinion: AdminOpinion): string {
    switch (opinion) {
      case ADMIN_OPINION.FAVORABLE:
        return 'green';
      case ADMIN_OPINION.UNFAVORABLE:
        return 'red';
      default:
        return 'gray';
    }
  }
}

// ==================== HOOK PERSONNALISÉ POUR UTILISATION ====================
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export function useAdminRendezVousService(): AdminRendezVousService {
  const authContext = useContext(AuthContext);
  
  if (!authContext || !authContext.fetchWithAuth) {
    throw new Error('useAdminRendezVousService doit être utilisé à l\'intérieur d\'AuthProvider');
  }
  
  return new AdminRendezVousService(authContext.fetchWithAuth);
}