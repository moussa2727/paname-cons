import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// Types exportés - parfaitement alignés avec le backend
export type RendezvousStatus = 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé' | 'Expiré';
export type AdminOpinion = 'Favorable' | 'Défavorable';

export interface Rendezvous {
  _id: string;
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
  cancelledAt?: Date;
  cancelledBy?: 'admin' | 'user' | 'system';
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  dateTime?: Date;
  effectiveDestination?: string;
  effectiveFiliere?: string;
  isPast?: boolean;
  isExpired?: boolean;
  canBeCancelledByUser?: boolean;
  canBeModified?: boolean;
  canBeMarkedAsCompleted?: boolean;
  isToday?: boolean;
  minutesUntilExpiration?: number;
  isLate?: boolean;
}

export interface RendezvousListResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRendezvousData {
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
  email?: string;
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
  cancellationReason?: string;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  status?: RendezvousStatus;
  date?: string;
  search?: string;
}

export interface AvailabilityCheck {
  available: boolean;
  message: string;
}

export interface MonthlyStats {
  period: string;
  total: number;
  byStatus: Array<{ _id: string; count: number }>;
  dailyStats: Array<{ _id: string; count: number }>;
  comparison: {
    currentMonth: number;
    previousMonth: number;
    difference: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  averagePerDay: number;
}

export interface DestinationStats {
  byDestination: Array<{
    destination: string;
    count: number;
    uniqueUsers: number;
  }>;
  autresDestinations: Array<{ _id: string; count: number }>;
  totalDestinations: number;
}

export interface RealTimeStats {
  timestamp: Date;
  today: string;
  currentHour: string;
  todayStats: Array<{ _id: string; count: number }>;
  hourStats: Array<{ _id: string; count: number }>;
  pendingConfirmations: number;
  recentChanges: Array<{
    firstName: string;
    lastName: string;
    status: string;
    updatedAt: Date;
    time: string;
  }>;
  nextHour: {
    hour: string;
    count: number;
    appointments: Array<{
      firstName: string;
      lastName: string;
      time: string;
      status: string;
    }>;
  };
}

export interface StatsResponse {
  total: number;
  byStatus: Array<{ _id: string; count: number }>;
  upcoming: number;
  today: number;
  byDate: Array<{ _id: string; count: number }>;
  stats: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  recentActivities: Array<{
    hour: string;
    count: number;
    appointments: Array<{
      firstName: string;
      lastName: string;
      time: string;
      status: string;
    }>;
  }>;
  userStats: {
    uniqueUsers: number;
    mostActiveUsers: Array<{
      email: string;
      count: number;
      lastAppointment: Date;
    }>;
  };
  popularSlots: Array<{ time: string; count: number }>;
}

// Constantes alignées avec le backend
const RENDEZVOUS_STATUS = {
  PENDING: 'En attente' as const,
  CONFIRMED: 'Confirmé' as const,
  COMPLETED: 'Terminé' as const,
  CANCELLED: 'Annulé' as const,
  EXPIRED: 'Expiré' as const
} as const;

const ADMIN_OPINION = {
  FAVORABLE: 'Favorable' as const,
  UNFAVORABLE: 'Défavorable' as const
} as const;

const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat'
] as const;

const DESTINATIONS = [
  'France',
  'Canada',
  'Belgique',
  'Suisse',
  'États-Unis',
  'Autre'
] as const;

const FILIERES = [
  'Informatique',
  'Médecine',
  'Droit',
  'Commerce',
  'Ingénierie',
  'Architecture',
  'Autre'
] as const;

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30'
] as const;

// Regex alignées avec le backend
const TIME_SLOT_REGEX = /^(09|1[0-6]):(00|30)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Messages d'erreur - utiliser un Record au lieu d'un type trop strict
const ERROR_MESSAGES: Record<string, string> = {
  // Génériques
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer.',
  UNAUTHORIZED: 'Session expirée. Veuillez vous reconnecter.',
  FORBIDDEN: 'Accès non autorisé.',
  NOT_FOUND: 'Rendez-vous non trouvé.',
  VALIDATION_ERROR: 'Données invalides.',
  RATE_LIMIT: 'Trop de requêtes. Veuillez patienter.',
  
  // Validation
  INVALID_ID: 'ID de rendez-vous invalide.',
  INVALID_EMAIL: 'Format d\'email invalide.',
  INVALID_PHONE: 'Format de téléphone invalide.',
  INVALID_DATE: 'Format de date invalide (YYYY-MM-DD requis).',
  INVALID_TIME: 'Créneau horaire invalide (09:00-16:30, par pas de 30min).',
  INVALID_STATUS: 'Statut invalide.',
  INVALID_OPINION: 'Avis admin invalide.',
  INVALID_EDUCATION: 'Niveau d\'étude invalide.',
  INVALID_DESTINATION: 'Destination invalide.',
  INVALID_FILIERE: 'Filière invalide.',
  
  // Logique métier
  ACCOUNT_REQUIRED: 'Vous devez avoir un compte pour prendre un rendez-vous. Veuillez vous inscrire d\'abord.',
  EMAIL_MISMATCH: 'L\'email doit correspondre exactement à votre compte de connexion',
  ALREADY_CONFIRMED: 'Vous avez déjà un rendez-vous confirmé',
  SLOT_UNAVAILABLE: 'Ce créneau horaire n\'est pas disponible',
  DATE_FULL: 'Tous les créneaux sont complets pour cette date',
  PAST_DATE: 'Vous ne pouvez pas réserver une date passée',
  PAST_SLOT: 'Vous ne pouvez pas réserver un créneau passé',
  WEEKEND: 'Les réservations sont fermées le week-end',
  HOLIDAY: 'Les réservations sont fermées les jours fériés',
  INVALID_TIME_RANGE: 'Les horaires disponibles sont entre 9h00 et 16h30',
  INVALID_TIME_STEP: 'Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)',
  COMPLETED_NO_EDIT: 'Impossible de modifier un rendez-vous terminé',
  CANCEL_THRESHOLD: 'Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l\'heure prévue',
  CANCEL_ONLY_CONFIRMED: 'Vous ne pouvez annuler que les rendez-vous confirmés',
  ADMIN_REQUIRED_STATUS: 'Seuls les administrateurs peuvent changer le statut',
  TERMINATE_REQUIRES_AVIS: 'L\'avis admin est obligatoire pour terminer un rendez-vous',
  TERMINATE_FUTURE_FORBIDDEN: 'Impossible de marquer comme terminé un rendez-vous futur. Seuls les rendez-vous dont la date/heure est passée peuvent être terminés.',
  TERMINATE_TOO_OLD: 'Impossible de marquer comme terminé un rendez-vous trop ancien (plus d\'une semaine)',
  DESTINATION_REQUIRED: 'La destination "Autre" nécessite une précision',
  FILIERE_REQUIRED: 'La filière "Autre" nécessite une précision',
  NO_ACCOUNT_FOUND: 'Aucun compte trouvé pour cet email. Veuillez d\'abord créer un compte.',
  CANT_UPDATE_OTHERS: 'Vous ne pouvez modifier que vos propres rendez-vous',
  EXPIRED_NO_ACTION: 'Impossible d\'effectuer cette action sur un rendez-vous expiré',
  
  // Succès
  CREATE_SUCCESS: 'Rendez-vous créé avec succès',
  UPDATE_SUCCESS: 'Rendez-vous mis à jour',
  STATUS_UPDATE_SUCCESS: 'Statut mis à jour',
  DELETE_SUCCESS: 'Rendez-vous annulé',
  CONFIRM_SUCCESS: 'Rendez-vous confirmé',
  TERMINATE_SUCCESS: 'Rendez-vous terminé',
  FETCH_SUCCESS: 'Rendez-vous chargés',
};

class RendezvousService {
  private fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
  private baseUrl: string;
  private lastRequestTime: number = 0;
  private MIN_REQUEST_INTERVAL = 1000;
  private requestQueue: Promise<any> = Promise.resolve();
  private isProcessingQueue: boolean = false;
  private activeRequests: Set<string> = new Set();
  private requestTimeout: number = 30000;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    this.fetchWithAuth = fetchWithAuth;
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }

  // ==================== VALIDATION UTILITIES ====================

  private validateMongoId(id: string): boolean {
    return MONGO_ID_REGEX.test(id);
  }

  private validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }

  private validatePhone(phone: string): boolean {
    return PHONE_REGEX.test(phone);
  }

  private validateDate(date: string): boolean {
    if (!DATE_REGEX.test(date)) return false;
    
    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return !isNaN(dateObj.getTime()) && dateObj >= today;
  }

  private validateTime(time: string): boolean {
    if (!TIME_SLOT_REGEX.test(time)) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const timeInHours = hours + minutes / 60;
    
    return timeInHours >= 9 && timeInHours <= 16.5;
  }

  private validateStatus(status: string): boolean {
    return Object.values(RENDEZVOUS_STATUS).includes(status as RendezvousStatus);
  }

  private validateAdminOpinion(opinion: string): boolean {
    return Object.values(ADMIN_OPINION).includes(opinion as AdminOpinion);
  }

  private validateEducationLevel(level: string): boolean {
    return EDUCATION_LEVELS.includes(level as any);
  }

  private validateDestination(destination: string): boolean {
    return DESTINATIONS.includes(destination as any);
  }

  private validateFiliere(filiere: string): boolean {
    return FILIERES.includes(filiere as any);
  }

  private buildQueryString(params: FilterParams): string {
    const searchParams = new URLSearchParams();
    
    if (params.page !== undefined) searchParams.append('page', params.page.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.date) searchParams.append('date', params.date);
    if (params.search) searchParams.append('search', params.search.trim());
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // ==================== ERROR HANDLING ====================

  private async handleResponse<T>(response: Response, operation: string): Promise<T> {
    if (!response.ok) {
      let errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      
      try {
        const errorData = await response.json();
        
        if (errorData.message) {
          errorMessage = errorData.message;
          
          // Mapping des messages d'erreur spécifiques du backend
          if (errorMessage.includes('compte pour prendre un rendez-vous')) {
            errorMessage = ERROR_MESSAGES.ACCOUNT_REQUIRED;
          } else if (errorMessage.includes('doit correspondre exactement')) {
            errorMessage = ERROR_MESSAGES.EMAIL_MISMATCH;
          } else if (errorMessage.includes('déjà un rendez-vous confirmé')) {
            errorMessage = ERROR_MESSAGES.ALREADY_CONFIRMED;
          } else if (errorMessage.includes('créneau horaire n\'est pas disponible')) {
            errorMessage = ERROR_MESSAGES.SLOT_UNAVAILABLE;
          } else if (errorMessage.includes('Tous les créneaux sont complets')) {
            errorMessage = ERROR_MESSAGES.DATE_FULL;
          } else if (errorMessage.includes('date passée') || errorMessage.includes('Date invalide ou passée')) {
            errorMessage = ERROR_MESSAGES.PAST_DATE;
          } else if (errorMessage.includes('créneau passé')) {
            errorMessage = ERROR_MESSAGES.PAST_SLOT;
          } else if (errorMessage.includes('week-end')) {
            errorMessage = ERROR_MESSAGES.WEEKEND;
          } else if (errorMessage.includes('jours fériés')) {
            errorMessage = ERROR_MESSAGES.HOLIDAY;
          } else if (errorMessage.includes('horaires disponibles sont entre')) {
            errorMessage = ERROR_MESSAGES.INVALID_TIME_RANGE;
          } else if (errorMessage.includes('créneaux doivent être espacés')) {
            errorMessage = ERROR_MESSAGES.INVALID_TIME_STEP;
          } else if (errorMessage.includes('modifier un rendez-vous terminé')) {
            errorMessage = ERROR_MESSAGES.COMPLETED_NO_EDIT;
          } else if (errorMessage.includes('moins de 2 heures')) {
            errorMessage = ERROR_MESSAGES.CANCEL_THRESHOLD;
          } else if (errorMessage.includes('annuler que les rendez-vous confirmés')) {
            errorMessage = ERROR_MESSAGES.CANCEL_ONLY_CONFIRMED;
          } else if (errorMessage.includes('administrateurs peuvent changer le statut')) {
            errorMessage = ERROR_MESSAGES.ADMIN_REQUIRED_STATUS;
          } else if (errorMessage.includes('avis admin est obligatoire')) {
            errorMessage = ERROR_MESSAGES.TERMINATE_REQUIRES_AVIS;
          } else if (errorMessage.includes('Avis admin invalide')) {
            errorMessage = ERROR_MESSAGES.INVALID_OPINION;
          } else if (errorMessage.includes('marquer comme terminé un rendez-vous futur')) {
            errorMessage = ERROR_MESSAGES.TERMINATE_FUTURE_FORBIDDEN;
          } else if (errorMessage.includes('trop ancien')) {
            errorMessage = ERROR_MESSAGES.TERMINATE_TOO_OLD;
          } else if (errorMessage.includes('nécessite une précision')) {
            if (errorMessage.includes('destination')) {
              errorMessage = ERROR_MESSAGES.DESTINATION_REQUIRED;
            } else if (errorMessage.includes('filière')) {
              errorMessage = ERROR_MESSAGES.FILIERE_REQUIRED;
            }
          } else if (errorMessage.includes('Aucun compte trouvé')) {
            errorMessage = ERROR_MESSAGES.NO_ACCOUNT_FOUND;
          } else if (errorMessage.includes('vos propres rendez-vous')) {
            errorMessage = ERROR_MESSAGES.CANT_UPDATE_OTHERS;
          } else if (errorMessage.includes('expiré')) {
            errorMessage = ERROR_MESSAGES.EXPIRED_NO_ACTION;
          }
        }
        
        // Gestion des codes HTTP
        switch (response.status) {
          case 400:
            if (errorMessage === ERROR_MESSAGES.SERVER_ERROR) {
              errorMessage = errorData.message || ERROR_MESSAGES.VALIDATION_ERROR;
            }
            break;
          case 401:
            errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
            break;
          case 403:
            if (errorMessage === ERROR_MESSAGES.SERVER_ERROR) {
              errorMessage = ERROR_MESSAGES.FORBIDDEN;
            }
            break;
          case 404:
            errorMessage = ERROR_MESSAGES.NOT_FOUND;
            break;
          case 429:
            errorMessage = ERROR_MESSAGES.RATE_LIMIT;
            break;
        }
        
      } catch (parseError) {
        console.error('Erreur parsing error response:', parseError);
      }
      
      toast.error(errorMessage, {
        autoClose: 5000,
        position: "top-right",
      });
      
      throw new Error(errorMessage);
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

  // ==================== REQUEST MANAGEMENT ====================

  private async rateLimitedFetch(endpoint: string, options?: RequestInit): Promise<Response> {
    const requestId = `${endpoint}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Annuler la requête précédente du même type si elle existe
    this.cancelRequest(requestId);
    
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    try {
      this.activeRequests.add(requestId);
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequestTime = Date.now();
      
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      try {
        const response = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Requête annulée');
        }
        throw error;
      }
      
    } finally {
      this.activeRequests.delete(requestId);
      this.abortControllers.delete(requestId);
    }
  }

  private async queueRequest<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue = this.requestQueue
        .then(async () => {
          if (this.isProcessingQueue) {
            throw new Error('Une requête est déjà en cours de traitement');
          }
          
          this.isProcessingQueue = true;
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.isProcessingQueue = false;
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  // ==================== PUBLIC API METHODS ====================

  async createRendezvous(
    data: CreateRendezvousData, 
    userEmail: string, 
    isAdmin: boolean = false
  ): Promise<Rendezvous> {
    // Validation frontale stricte
    const validationErrors = this.validateCreateData(data, userEmail, isAdmin);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0], { autoClose: 3000 });
      throw new Error(validationErrors[0]);
    }

    const response = await this.rateLimitedFetch('/rendezvous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<Rendezvous>(
      response,
      'Création du rendez-vous'
    );

    toast.success(ERROR_MESSAGES.CREATE_SUCCESS, {
      autoClose: 3000,
      position: "top-right",
    });
    
    return result;
  }

  async getAllRendezvous(
    page: number = 1, 
    limit: number = 10, 
    filters: FilterParams = {}
  ): Promise<RendezvousListResponse> {
    // Validation des paramètres
    if (page < 1) {
      throw new Error('Le numéro de page doit être supérieur à 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('La limite doit être entre 1 et 100');
    }
    if (filters.status && !this.validateStatus(filters.status)) {
      throw new Error(ERROR_MESSAGES.INVALID_STATUS);
    }
    if (filters.date && !DATE_REGEX.test(filters.date)) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    const queryParams: FilterParams = { page, limit, ...filters };
    const queryString = this.buildQueryString(queryParams);
    
    const response = await this.rateLimitedFetch(`/rendezvous${queryString}`);
    
    return await this.handleResponse<RendezvousListResponse>(
      response,
      'Chargement des rendez-vous'
    );
  }

  async getUserRendezvous(
    userEmail: string,
    page: number = 1,
    limit: number = 10,
    status?: RendezvousStatus
  ): Promise<RendezvousListResponse> {
    if (!userEmail || !this.validateEmail(userEmail)) {
      throw new Error(ERROR_MESSAGES.INVALID_EMAIL);
    }
    if (page < 1) throw new Error('Page invalide');
    if (limit < 1 || limit > 100) throw new Error('Limite invalide');
    if (status && !this.validateStatus(status)) {
      throw new Error(ERROR_MESSAGES.INVALID_STATUS);
    }

    const queryParams: FilterParams = { page, limit };
    if (status) queryParams.status = status;
    
    const queryString = this.buildQueryString(queryParams);
    const response = await this.rateLimitedFetch(`/rendezvous/user${queryString}`);
    
    return await this.handleResponse<RendezvousListResponse>(
      response,
      'Chargement des rendez-vous utilisateur'
    );
  }

  async getRendezvousById(id: string, userEmail?: string, isAdmin: boolean = false): Promise<Rendezvous> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    const response = await this.rateLimitedFetch(`/rendezvous/${id}`);
    
    const data = await this.handleResponse<Rendezvous>(
      response,
      'Récupération du rendez-vous'
    );
    
    // Vérification des permissions
    if (!isAdmin && userEmail) {
      const normalizedRdvEmail = data.email.toLowerCase().trim();
      const normalizedUserEmail = userEmail.toLowerCase().trim();
      
      if (normalizedRdvEmail !== normalizedUserEmail) {
        toast.error(ERROR_MESSAGES.FORBIDDEN, { autoClose: 3000 });
        throw new Error(ERROR_MESSAGES.FORBIDDEN);
      }
    }
    
    return data;
  }

  async updateRendezvous(
    id: string, 
    data: UpdateRendezvousData, 
    userEmail: string, 
    isAdmin: boolean = false
  ): Promise<Rendezvous> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    // Validation frontale
    const validationErrors = this.validateUpdateData(data, userEmail, isAdmin);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0], { autoClose: 3000 });
      throw new Error(validationErrors[0]);
    }

    const response = await this.rateLimitedFetch(`/rendezvous/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<Rendezvous>(
      response,
      'Mise à jour du rendez-vous'
    );

    toast.success(ERROR_MESSAGES.UPDATE_SUCCESS, {
      autoClose: 3000,
      position: "top-right",
    });
    
    return result;
  }

  async updateRendezvousStatus(
    id: string, 
    status: RendezvousStatus, 
    avisAdmin?: AdminOpinion
  ): Promise<Rendezvous> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    if (!this.validateStatus(status)) {
      toast.error(ERROR_MESSAGES.INVALID_STATUS, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_STATUS);
    }

    // Validation spécifique pour "Terminé"
    if (status === RENDEZVOUS_STATUS.COMPLETED && !avisAdmin) {
      toast.error(ERROR_MESSAGES.TERMINATE_REQUIRES_AVIS, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.TERMINATE_REQUIRES_AVIS);
    }

    if (avisAdmin && !this.validateAdminOpinion(avisAdmin)) {
      toast.error(ERROR_MESSAGES.INVALID_OPINION, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_OPINION);
    }

    const body: any = { status };
    if (avisAdmin !== undefined) {
      body.avisAdmin = avisAdmin;
    }

    const response = await this.rateLimitedFetch(`/rendezvous/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await this.handleResponse<Rendezvous>(
      response,
      'Mise à jour du statut'
    );

    toast.success(ERROR_MESSAGES.STATUS_UPDATE_SUCCESS, {
      autoClose: 3000,
      position: "top-right",
    });
    
    return result;
  }

  async cancelRendezvous(
    id: string, 
    userEmail: string, 
    isAdmin: boolean = false, 
    cancellationReason?: string
  ): Promise<Rendezvous> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    const body = cancellationReason ? { cancellationReason } : undefined;

    const response = await this.rateLimitedFetch(`/rendezvous/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await this.handleResponse<Rendezvous>(
      response,
      'Annulation du rendez-vous'
    );

    toast.success(ERROR_MESSAGES.DELETE_SUCCESS, {
      autoClose: 3000,
      position: "top-right",
    });
    
    return result;
  }

  async confirmRendezvous(id: string): Promise<Rendezvous> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    const response = await this.rateLimitedFetch(`/rendezvous/${id}/confirm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await this.handleResponse<Rendezvous>(
      response,
      'Confirmation du rendez-vous'
    );

    toast.success(ERROR_MESSAGES.CONFIRM_SUCCESS, {
      autoClose: 3000,
      position: "top-right",
    });
    
    return result;
  }

  async getAvailableSlots(date: string): Promise<string[]> {
    if (!DATE_REGEX.test(date)) {
      toast.error(ERROR_MESSAGES.INVALID_DATE, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    const response = await this.rateLimitedFetch(
      `/rendezvous/available-slots?date=${encodeURIComponent(date)}`
    );

    return await this.handleResponse<string[]>(
      response,
      'Chargement des créneaux disponibles'
    );
  }

  async getAvailableDates(): Promise<string[]> {
    const response = await this.rateLimitedFetch('/rendezvous/available-dates');
    
    return await this.handleResponse<string[]>(
      response,
      'Chargement des dates disponibles'
    );
  }

  async checkAvailability(
    id: string, 
    date?: string, 
    time?: string
  ): Promise<AvailabilityCheck> {
    if (!this.validateMongoId(id)) {
      toast.error(ERROR_MESSAGES.INVALID_ID, { autoClose: 3000 });
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (time) params.append('time', time);

    const queryString = params.toString();
    const response = await this.rateLimitedFetch(
      `/rendezvous/${id}/check-availability${queryString ? `?${queryString}` : ''}`
    );

    return await this.handleResponse<AvailabilityCheck>(
      response,
      'Vérification de disponibilité'
    );
  }

  async getStatistics(): Promise<StatsResponse> {
    const response = await this.rateLimitedFetch('/rendezvous/stats/overview');
    
    return await this.handleResponse<StatsResponse>(
      response,
      'Chargement des statistiques'
    );
  }

  async getMonthlyStats(year?: number, month?: number): Promise<MonthlyStats> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());

    const queryString = params.toString();
    const response = await this.rateLimitedFetch(
      `/rendezvous/stats/monthly${queryString ? `?${queryString}` : ''}`
    );

    return await this.handleResponse<MonthlyStats>(
      response,
      'Chargement des statistiques mensuelles'
    );
  }

  async getDestinationStats(): Promise<DestinationStats> {
    const response = await this.rateLimitedFetch('/rendezvous/stats/destinations');
    
    return await this.handleResponse<DestinationStats>(
      response,
      'Chargement des statistiques des destinations'
    );
  }

  async getRealTimeStats(): Promise<RealTimeStats> {
    const response = await this.rateLimitedFetch('/rendezvous/stats/realtime');
    
    return await this.handleResponse<RealTimeStats>(
      response,
      'Chargement des statistiques temps réel'
    );
  }

  async getCurrentUserConfirmedRendezvous(email: string): Promise<Rendezvous | null> {
    if (!this.validateEmail(email)) {
      throw new Error(ERROR_MESSAGES.INVALID_EMAIL);
    }

    const response = await this.rateLimitedFetch(`/rendezvous/current/confirmed?email=${encodeURIComponent(email)}`);
    
    if (response.status === 404) {
      return null;
    }

    return await this.handleResponse<Rendezvous>(
      response,
      'Récupération du rendez-vous confirmé'
    );
  }

  // ==================== VALIDATION METHODS ====================

  private validateCreateData(
    data: CreateRendezvousData, 
    userEmail: string, 
    isAdmin: boolean
  ): string[] {
    const errors: string[] = [];

    // Validation des champs requis
    if (!data.firstName?.trim()) errors.push('Le prénom est obligatoire');
    if (!data.lastName?.trim()) errors.push('Le nom est obligatoire');
    if (!data.email?.trim()) errors.push("L'email est obligatoire");
    if (!data.telephone?.trim()) errors.push('Le téléphone est obligatoire');
    if (!data.destination?.trim()) errors.push('La destination est obligatoire');
    if (!data.niveauEtude?.trim()) errors.push("Le niveau d'étude est obligatoire");
    if (!data.filiere?.trim()) errors.push('La filière est obligatoire');
    if (!data.date?.trim()) errors.push('La date est obligatoire');
    if (!data.time?.trim()) errors.push("L'heure est obligatoire");

    // Validation des formats
    if (data.email && !this.validateEmail(data.email)) {
      errors.push(ERROR_MESSAGES.INVALID_EMAIL);
    }
    if (data.telephone && !this.validatePhone(data.telephone)) {
      errors.push(ERROR_MESSAGES.INVALID_PHONE);
    }
    if (data.date && !DATE_REGEX.test(data.date)) {
      errors.push(ERROR_MESSAGES.INVALID_DATE);
    }
    if (data.time && !TIME_SLOT_REGEX.test(data.time)) {
      errors.push(ERROR_MESSAGES.INVALID_TIME);
    }

    // Validation des énumérations
    if (data.destination && !this.validateDestination(data.destination)) {
      errors.push(ERROR_MESSAGES.INVALID_DESTINATION);
    }
    if (data.niveauEtude && !this.validateEducationLevel(data.niveauEtude)) {
      errors.push(ERROR_MESSAGES.INVALID_EDUCATION);
    }
    if (data.filiere && !this.validateFiliere(data.filiere)) {
      errors.push(ERROR_MESSAGES.INVALID_FILIERE);
    }

    // Validation des champs "Autre"
    if (data.destination === 'Autre' && (!data.destinationAutre || data.destinationAutre.trim() === '')) {
      errors.push(ERROR_MESSAGES.DESTINATION_REQUIRED);
    }
    if (data.filiere === 'Autre' && (!data.filiereAutre || data.filiereAutre.trim() === '')) {
      errors.push(ERROR_MESSAGES.FILIERE_REQUIRED);
    }

    // Validation email pour non-admins
    if (!isAdmin && data.email) {
      const normalizedDtoEmail = data.email.toLowerCase().trim();
      const normalizedUserEmail = userEmail.toLowerCase().trim();
      
      if (normalizedDtoEmail !== normalizedUserEmail) {
        errors.push(ERROR_MESSAGES.EMAIL_MISMATCH);
      }
    }

    // Validation date/heure
    if (data.date && data.time) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(data.date);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.push(ERROR_MESSAGES.PAST_DATE);
      }
      
      const todayStr = new Date().toISOString().split('T')[0];
      if (data.date === todayStr) {
        const [hours, minutes] = data.time.split(':').map(Number);
        const now = new Date();
        const selectedTime = new Date();
        selectedTime.setHours(hours, minutes, 0, 0);
        
        if (selectedTime < now) {
          errors.push(ERROR_MESSAGES.PAST_SLOT);
        }
      }
    }

    return errors;
  }

  private validateUpdateData(
    data: UpdateRendezvousData, 
    userEmail: string, 
    isAdmin: boolean
  ): string[] {
    const errors: string[] = [];

    // Validation des formats
    if (data.email && !this.validateEmail(data.email)) {
      errors.push(ERROR_MESSAGES.INVALID_EMAIL);
    }
    if (data.telephone && !this.validatePhone(data.telephone)) {
      errors.push(ERROR_MESSAGES.INVALID_PHONE);
    }
    if (data.date && !DATE_REGEX.test(data.date)) {
      errors.push(ERROR_MESSAGES.INVALID_DATE);
    }
    if (data.time && !TIME_SLOT_REGEX.test(data.time)) {
      errors.push(ERROR_MESSAGES.INVALID_TIME);
    }

    // Validation des énumérations
    if (data.destination && !this.validateDestination(data.destination)) {
      errors.push(ERROR_MESSAGES.INVALID_DESTINATION);
    }
    if (data.niveauEtude && !this.validateEducationLevel(data.niveauEtude)) {
      errors.push(ERROR_MESSAGES.INVALID_EDUCATION);
    }
    if (data.filiere && !this.validateFiliere(data.filiere)) {
      errors.push(ERROR_MESSAGES.INVALID_FILIERE);
    }
    if (data.status && !this.validateStatus(data.status)) {
      errors.push(ERROR_MESSAGES.INVALID_STATUS);
    }
    if (data.avisAdmin && !this.validateAdminOpinion(data.avisAdmin)) {
      errors.push(ERROR_MESSAGES.INVALID_OPINION);
    }

    // Validation des champs "Autre"
    if (data.destination === 'Autre' && (!data.destinationAutre || data.destinationAutre.trim() === '')) {
      errors.push(ERROR_MESSAGES.DESTINATION_REQUIRED);
    }
    if (data.filiere === 'Autre' && (!data.filiereAutre || data.filiereAutre.trim() === '')) {
      errors.push(ERROR_MESSAGES.FILIERE_REQUIRED);
    }

    // Validation email pour non-admins
    if (!isAdmin && data.email) {
      const normalizedUpdateEmail = data.email.toLowerCase().trim();
      const normalizedUserEmail = userEmail.toLowerCase().trim();
      
      if (normalizedUpdateEmail !== normalizedUserEmail) {
        errors.push(ERROR_MESSAGES.EMAIL_MISMATCH);
      }
    }

    // Validation statut pour non-admins
    if (!isAdmin && data.status && data.status !== RENDEZVOUS_STATUS.CANCELLED) {
      errors.push(ERROR_MESSAGES.ADMIN_REQUIRED_STATUS);
    }

    // Validation statut "Terminé"
    if (data.status === RENDEZVOUS_STATUS.COMPLETED) {
      if (!data.avisAdmin) {
        errors.push(ERROR_MESSAGES.TERMINATE_REQUIRES_AVIS);
      }
      if (data.avisAdmin && !this.validateAdminOpinion(data.avisAdmin)) {
        errors.push(ERROR_MESSAGES.INVALID_OPINION);
      }
    }

    return errors;
  }

  // ==================== UTILITY METHODS ====================

  resetRateLimiting(): void {
    this.lastRequestTime = 0;
    this.requestQueue = Promise.resolve();
    this.isProcessingQueue = false;
    this.activeRequests.clear();
    // Annuler toutes les requêtes en cours
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
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
    this.activeRequests.clear();
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    this.requestQueue = Promise.resolve();
    this.isProcessingQueue = false;
  }

  setMinRequestInterval(intervalMs: number): void {
    this.MIN_REQUEST_INTERVAL = Math.max(500, intervalMs);
  }

  setRequestTimeout(timeoutMs: number): void {
    this.requestTimeout = Math.max(1000, timeoutMs);
  }

  // Méthodes pour les listes d'options
  getEducationLevels(): string[] {
    return [...EDUCATION_LEVELS];
  }

  getDestinations(): string[] {
    return [...DESTINATIONS];
  }

  getFilieres(): string[] {
    return [...FILIERES];
  }

  getTimeSlots(): string[] {
    return [...TIME_SLOTS];
  }

  getStatuses(): RendezvousStatus[] {
    return Object.values(RENDEZVOUS_STATUS);
  }

  getAdminOpinions(): AdminOpinion[] {
    return Object.values(ADMIN_OPINION);
  }

  // Méthodes de formatage
  formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDisplayTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours}h${minutes === 0 ? '00' : minutes}`;
  }

  // Méthodes de vérification
  isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date.getDay() === 0 || date.getDay() === 6;
  }

  isPastTimeSlot(dateStr: string, timeStr: string): boolean {
    const now = new Date();
    const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return slotDateTime < now;
  }

  // Masquage email
  maskEmail(email: string): string {
    if (!email) return '***';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***';
    
    if (localPart.length <= 2) {
      return `${localPart.charAt(0)}***@${domain}`;
    }
    return `${localPart.charAt(0)}***${localPart.charAt(localPart.length - 1)}@${domain}`;
  }
}

// Hook personnalisé React
export function useRendezvousService(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>) {
  return useMemo(() => new RendezvousService(fetchWithAuth), [fetchWithAuth]);
}

// Hook pour l'admin avec vérification de rôle
export function useAdminRendezvousService(
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>,
  userRole?: string
) {
  const service = useMemo(() => new RendezvousService(fetchWithAuth), [fetchWithAuth]);
  const isAdmin = userRole === 'admin';

  return {
    // Méthodes admin seulement
    getAllRendezvous: isAdmin ? service.getAllRendezvous.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    updateRendezvousStatus: isAdmin ? service.updateRendezvousStatus.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    confirmRendezvous: isAdmin ? service.confirmRendezvous.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    getStatistics: isAdmin ? service.getStatistics.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    getMonthlyStats: isAdmin ? service.getMonthlyStats.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    getDestinationStats: isAdmin ? service.getDestinationStats.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },
    getRealTimeStats: isAdmin ? service.getRealTimeStats.bind(service) : () => {
      toast.error('Accès administrateur requis', { autoClose: 3000 });
      throw new Error('Accès administrateur requis');
    },

    // Méthodes pour tous
    createRendezvous: service.createRendezvous.bind(service),
    getUserRendezvous: service.getUserRendezvous.bind(service),
    getRendezvousById: service.getRendezvousById.bind(service),
    updateRendezvous: service.updateRendezvous.bind(service),
    cancelRendezvous: service.cancelRendezvous.bind(service),
    getAvailableSlots: service.getAvailableSlots.bind(service),
    getAvailableDates: service.getAvailableDates.bind(service),
    checkAvailability: service.checkAvailability.bind(service),
    getCurrentUserConfirmedRendezvous: service.getCurrentUserConfirmedRendezvous.bind(service),

    // Utilitaires
    getEducationLevels: service.getEducationLevels.bind(service),
    getDestinations: service.getDestinations.bind(service),
    getFilieres: service.getFilieres.bind(service),
    getTimeSlots: service.getTimeSlots.bind(service),
    getStatuses: service.getStatuses.bind(service),
    getAdminOpinions: service.getAdminOpinions.bind(service),
    formatDisplayDate: service.formatDisplayDate.bind(service),
    formatDisplayTime: service.formatDisplayTime.bind(service),
    isWeekend: service.isWeekend.bind(service),
    isPastTimeSlot: service.isPastTimeSlot.bind(service),
    maskEmail: service.maskEmail.bind(service),

    // Gestion des requêtes
    resetRateLimiting: service.resetRateLimiting.bind(service),
    isBusy: service.isBusy.bind(service),
    getEstimatedWaitTime: service.getEstimatedWaitTime.bind(service),
    getActiveRequestCount: service.getActiveRequestCount.bind(service),
    cancelAllRequests: service.cancelAllRequests.bind(service),
    setMinRequestInterval: service.setMinRequestInterval.bind(service),
    setRequestTimeout: service.setRequestTimeout.bind(service),

    // Métadonnées
    isAdmin,
  };
}

// Fonction pour créer une instance standalone
export function createRendezvousService(fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>): RendezvousService {
  return new RendezvousService(fetchWithAuth);
}

export default RendezvousService;