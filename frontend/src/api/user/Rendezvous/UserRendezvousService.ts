
import { toast } from 'react-toastify';

// ==================== CONSTANTES IDENTIQUES AU BACKEND ====================
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


// Constantes pour la cohérence avec le backend
const CANCELLATION_THRESHOLD_HOURS = 2;
const AUTO_EXPIRE_MINUTES = 10;

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
  status: string;
  avisAdmin?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
  effectiveDestination?: string;
  effectiveFiliere?: string;
  isPast?: boolean;
  canBeCancelledByUser?: boolean;
}

export interface ApiResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FetchRendezvousParams {
  page: number;
  limit: number;
  status?: string;
}

export interface AuthFunctions {
  getAccessToken: () => string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => void;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

export class UserRendezvousService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000;

  constructor(
    private auth: AuthFunctions
  ) {}

  /**
   * Constantes statiques pour la cohérence
   */
  static readonly STATUS = RENDEZVOUS_STATUS;
  static readonly ADMIN_OPINION = ADMIN_OPINION;

  /**
   * Vérifie si un statut est valide (cohérent avec le backend)
   */
  static isValidStatus(status: string): boolean {
    return Object.values(RENDEZVOUS_STATUS).includes(status as any);
  }

  /**
   * Vérifie si un avis admin est valide
   */
  static isValidAdminOpinion(avis: string): boolean {
    return Object.values(ADMIN_OPINION).includes(avis as any);
  }

  private async addToQueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
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

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Récupère les rendez-vous de l'utilisateur avec validation des statuts
   */
  async fetchUserRendezvous(params: FetchRendezvousParams): Promise<ApiResponse> {
    return this.addToQueue(async () => {
      try {
        const urlParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
        });

        // Validation du statut si spécifié (cohérent avec le backend)
        if (params.status) {
          if (!UserRendezvousService.isValidStatus(params.status)) {
            throw new Error(`Statut invalide: ${params.status}`);
          }
          urlParams.append('status', params.status);
        }

        const endpoint = `/api/rendezvous/user?${urlParams.toString()}`;
        
        // if (import.meta.env.DEV) {
        //   console.log('Envoi requête rendez-vous avec paramètres:', Object.fromEntries(urlParams));
        // }

        const response = await this.auth.fetchWithAuth(endpoint);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Gestion spécifique des erreurs backend
          if (response.status === 400 && errorData.message?.includes('Statut invalide')) {
            throw new Error(`STATUT_INVALIDE:${errorData.message}`);
          }
          
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
            throw new Error(`RATE_LIMIT:${waitTime}`);
          }
          
          if (response.status === 403 && errorData.message?.includes('compte')) {
            throw new Error('NO_ACCOUNT_FOR_EMAIL');
          }
          
          throw new Error(errorData.message || `Erreur ${response.status}`);
        }

        const data = await response.json();
        
        // Validation des données reçues
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((rdv: Rendezvous) => {
            if (!UserRendezvousService.isValidStatus(rdv.status)) {
              console.warn(`⚠️ Statut invalide reçu du backend: ${rdv.status}`);
            }
            
            if (rdv.avisAdmin && !UserRendezvousService.isValidAdminOpinion(rdv.avisAdmin)) {
              console.warn(`⚠️ Avis admin invalide reçu: ${rdv.avisAdmin}`);
            }
          });
        }
        
        return data;
      } catch (error: any) {
        if (error.message.startsWith('RATE_LIMIT:')) {
          const waitTime = parseInt(error.message.split(':')[1]);
          
          // if (import.meta.env.DEV) {
          //   console.log(`⏳ Rate limit détecté, attente de ${waitTime}ms`);
          // }
          
          await this.wait(waitTime);
          return this.fetchUserRendezvous(params);
        }
        
        if (error.message.startsWith('STATUT_INVALIDE:')) {
          const errorMsg = error.message.split(':')[1];
          toast.error(`Filtre invalide: ${errorMsg}`);
          throw new Error('INVALID_STATUS_FILTER');
        }
        
        if (error.message === 'NO_ACCOUNT_FOR_EMAIL') {
          toast.error('Aucun compte trouvé pour cet email. Veuillez d\'abord créer un compte.');
          throw error;
        }
        
        if (import.meta.env.DEV) {
          console.error('❌ Erreur fetchUserRendezvous:', error.message);
        }

        if (error.message !== 'SESSION_EXPIRED' && 
            error.message !== 'SESSION_CHECK_IN_PROGRESS' &&
            error.message !== 'INVALID_STATUS_FILTER') {
          toast.error('Impossible de charger vos rendez-vous');
        }
        
        throw error;
      }
    });
  }

  /**
   * Annule un rendez-vous avec validation stricte
   */
  async cancelRendezvous(rdvId: string): Promise<Rendezvous> {
    return this.addToQueue(async () => {
      try {
        const response = await this.auth.fetchWithAuth(
          `/api/rendezvous/${rdvId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const errorData = await response.json();
          
          // Gestion spécifique des erreurs backend
          if (response.status === 400) {
            if (errorData.message.includes('à moins de 2 heures')) {
              throw new Error('CANCELLATION_TOO_LATE');
            }
            if (errorData.message.includes('non confirmé')) {
              throw new Error('NOT_CONFIRMED_RENDEZVOUS');
            }
            if (errorData.message.includes('terminé ou expiré')) {
              throw new Error('COMPLETED_OR_EXPIRED');
            }
          }
          
          if (response.status === 403) {
            if (errorData.message.includes('vos propres rendez-vous')) {
              throw new Error('NOT_YOUR_RENDEZVOUS');
            }
          }
          
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
            throw new Error(`RATE_LIMIT:${waitTime}`);
          }
          
          throw new Error(errorData.message || 'Erreur lors de l\'annulation');
        }

        const result = await response.json();
        
        // Vérification que le statut est bien "Annulé"
        if (result.status !== RENDEZVOUS_STATUS.CANCELLED) {
          console.warn(`⚠️ Rendez-vous annulé mais statut différent: ${result.status}`);
        }
        
        toast.success('Rendez-vous annulé avec succès');
        return result;
      } catch (error: any) {
        if (error.message.startsWith('RATE_LIMIT:')) {
          const waitTime = parseInt(error.message.split(':')[1]);
          await this.wait(waitTime);
          return this.cancelRendezvous(rdvId);
        }
        
        if (import.meta.env.DEV) {
          console.error('❌ Erreur cancelRendezvous:', error.message);
        }

        if (error.message === 'CANCELLATION_TOO_LATE') {
          toast.error('Impossible d\'annuler à moins de 2 heures du rendez-vous');
        } else if (error.message === 'NOT_CONFIRMED_RENDEZVOUS') {
          toast.error('Vous ne pouvez annuler que les rendez-vous confirmés');
        } else if (error.message === 'COMPLETED_OR_EXPIRED') {
          toast.error('Impossible d\'annuler un rendez-vous terminé ou expiré');
        } else if (error.message === 'NOT_YOUR_RENDEZVOUS') {
          toast.error('Vous ne pouvez annuler que vos propres rendez-vous');
        } else if (error.message !== 'SESSION_EXPIRED' && 
                   error.message !== 'SESSION_CHECK_IN_PROGRESS') {
          toast.error(error.message || 'Erreur lors de l\'annulation');
        }
        
        throw error;
      }
    });
  }

  /**
   * Formate une date en français
   */
  static formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  }

  /**
   * Formate une heure
   */
  static formatTime(timeStr: string): string {
    try {
      const [hours, minutes] = timeStr.split(':');
      if (!hours || !minutes) {
        return 'Heure invalide';
      }
      return `${hours}h${minutes}`;
    } catch {
      return 'Heure invalide';
    }
  }

  /**
   * Vérifie si un rendez-vous peut être annulé (cohérent avec backend)
   */
  static canCancelRendezvous(rdv: Rendezvous): boolean {
    // Seuls les rendez-vous "Confirmé" peuvent être annulés par l'utilisateur
    if (rdv.status !== RENDEZVOUS_STATUS.CONFIRMED) return false;
    
    // Vérifier si pas déjà passé de plus de 10 minutes (AUTO_EXPIRE_MINUTES)
    if (rdv.date && rdv.time) {
      const now = new Date();
      const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
      
      // Marge de 10 minutes comme dans le backend
      const tenMinutesAgo = new Date(now.getTime() - AUTO_EXPIRE_MINUTES * 60 * 1000);
      
      // Si le rendez-vous est dans le passé de plus de 10 minutes
      if (rdvDateTime < tenMinutesAgo) {
        return false;
      }
      
      // Vérifier la règle des 2 heures (CANCELLATION_THRESHOLD_HOURS)
      const twoHoursMs = CANCELLATION_THRESHOLD_HOURS * 60 * 60 * 1000;
      const timeUntilRdv = rdvDateTime.getTime() - now.getTime();
      
      return timeUntilRdv > twoHoursMs;
    }
    
    return rdv.canBeCancelledByUser !== false;
  }

  /**
   * Récupère la destination effective (cohérent avec backend)
   */
  static getEffectiveDestination(rdv: Rendezvous): string {
    if (rdv.effectiveDestination) {
      return rdv.effectiveDestination;
    }
    
    // Logique identique au backend : si destination = "Autre", utiliser destinationAutre
    if (rdv.destination === 'Autre' && rdv.destinationAutre) {
      return rdv.destinationAutre;
    }
    
    return rdv.destination;
  }

  /**
   * Récupère la filière effective (cohérent avec backend)
   */
  static getEffectiveFiliere(rdv: Rendezvous): string {
    if (rdv.effectiveFiliere) {
      return rdv.effectiveFiliere;
    }
    
    // Logique identique au backend : si filière = "Autre", utiliser filiereAutre
    if (rdv.filiere === 'Autre' && rdv.filiereAutre) {
      return rdv.filiereAutre;
    }
    
    return rdv.filiere;
  }

  /**
   * Vérifie si un rendez-vous est passé (cohérent avec backend)
   */
  static isRendezvousPast(rdv: Rendezvous): boolean {
    if (!rdv.date || !rdv.time) return false;
    
    try {
      const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
      const now = new Date();
      
      // Marge de 10 minutes comme AUTO_EXPIRE_MINUTES dans le backend
      const tenMinutesAgo = new Date(now.getTime() - AUTO_EXPIRE_MINUTES * 60 * 1000);
      
      return rdvDateTime < tenMinutesAgo;
    } catch {
      return false;
    }
  }

  /**
   * Obtient la couleur du statut (cohérent avec le backend)
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case RENDEZVOUS_STATUS.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case RENDEZVOUS_STATUS.CONFIRMED:
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case RENDEZVOUS_STATUS.COMPLETED:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case RENDEZVOUS_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-300';
      case RENDEZVOUS_STATUS.EXPIRED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  /**
   * Obtient la couleur de l'avis admin
   */
  static getAvisColor(avis: string): string {
    switch (avis) {
      case ADMIN_OPINION.FAVORABLE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case ADMIN_OPINION.UNFAVORABLE:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }
}