// ==================== CONSTANTES IDENTIQUES AU BACKEND ====================
const RENDEZVOUS_STATUS = {
  PENDING: 'En attente' as const,
  CONFIRMED: 'Confirmé' as const,
  COMPLETED: 'Terminé' as const,
  CANCELLED: 'Annulé' as const,
} as const;

const ADMIN_OPINION = {
  FAVORABLE: 'Favorable' as const,
  UNFAVORABLE: 'Défavorable' as const,
} as const;

// Constantes pour la cohérence avec le backend
const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat',
] as const;

const DESTINATIONS = [
  'Russie',
  'Chypre',
  'Chine',
  'Maroc',
  'Algérie',
  'Turquie',
  'France',
  'Autre',
] as const;

const FILIERES = [
  'Informatique',
  'Médecine',
  'Droit',
  'Commerce',
  'Ingénierie',
  'Architecture',
  'Autre',
] as const;

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
] as const;

const CANCELLATION_THRESHOLD_HOURS = 2;
const AUTO_EXPIRE_MINUTES = 10;

// Interface Rendezvous alignée avec le backend
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
  status: string;
  avisAdmin?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
  // Propriétés calculées
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

  constructor(private auth: AuthFunctions) {}

  /**
   * Constantes statiques pour la cohérence
   */
  static readonly STATUS = RENDEZVOUS_STATUS;
  static readonly ADMIN_OPINION = ADMIN_OPINION;
  static readonly EDUCATION_LEVELS = EDUCATION_LEVELS;
  static readonly DESTINATIONS = DESTINATIONS;
  static readonly FILIERES = FILIERES;
  static readonly TIME_SLOTS = TIME_SLOTS;

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
  async fetchUserRendezvous(
    params: FetchRendezvousParams
  ): Promise<ApiResponse> {
    return this.addToQueue(async () => {
      try {
        // VALIDATION AVANT REQUÊTE - Éviter les requêtes inutiles
        if (
          params.status &&
          !UserRendezvousService.isValidStatus(params.status)
        ) {
          console.warn(
            `Statut filtré invalide côté frontend: ${params.status}`
          );
          return {
            data: [],
            total: 0,
            page: params.page,
            limit: params.limit,
            totalPages: 0,
          };
        }

        if (params.page < 1) {
          console.warn('Numéro de page invalide côté frontend');
          return {
            data: [],
            total: 0,
            page: 1,
            limit: params.limit,
            totalPages: 0,
          };
        }

        const urlParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
        });

        if (params.status) {
          urlParams.append('status', params.status);
        }

        const endpoint = `/api/rendezvous/user?${urlParams.toString()}`;

        const response = await this.auth.fetchWithAuth(endpoint);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (
            response.status === 400 &&
            errorData.message?.includes('Statut invalide')
          ) {
            console.warn('Backend a rejeté le filtre de statut');
            return {
              data: [],
              total: 0,
              page: params.page,
              limit: params.limit,
              totalPages: 0,
            };
          }

          if (response.status === 429) {
            const waitTime = 5000;
            console.log(`Rate limit détecté, attente de ${waitTime}ms`);
            await this.wait(waitTime);
            return this.fetchUserRendezvous(params);
          }

          throw new Error(errorData.message || `Erreur ${response.status}`);
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((rdv: Rendezvous) => {
            if (!rdv._id) {
              console.warn('Rendez-vous sans ID reçu');
            }

            if (!UserRendezvousService.isValidStatus(rdv.status)) {
              console.warn(`Statut invalide reçu: ${rdv.status}`);
            }
          });
        }

        return data;
      } catch (error: any) {
        if (error.message.startsWith('RATE_LIMIT:')) {
          const waitTime = parseInt(error.message.split(':')[1]);
          await this.wait(waitTime);
          return this.fetchUserRendezvous(params);
        }

        if (
          error.message !== 'SESSION_EXPIRED' &&
          error.message !== 'SESSION_CHECK_IN_PROGRESS' &&
          !error.message.includes('STATUT_INVALIDE')
        ) {
          console.error('Erreur fetchUserRendezvous:', error.message);
          return {
            data: [],
            total: 0,
            page: params.page,
            limit: params.limit,
            totalPages: 0,
          };
        }

        throw error;
      }
    });
  }

  /**
   * Annule un rendez-vous (soft delete - changement de statut en "Annulé")
   * Aligné avec le backend qui retourne l'objet mis à jour
   */
  async cancelRendezvous(rdvId: string, reason?: string): Promise<Rendezvous> {
    console.log('cancelRendezvous called with id:', rdvId);

    if (!rdvId || rdvId === 'undefined') {
      throw new Error('ID de rendez-vous invalide');
    }

    try {
      const response = await this.auth.fetchWithAuth(
        `/api/rendezvous/${rdvId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: reason ? JSON.stringify({ cancellationReason: reason }) : undefined,
        }
      );

      if (!response.ok) {
        let errorData: { message?: any; error?: any };
        try {
          const responseText = await response.text();
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch {
          errorData = {};
        }

        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED');
        }

        if (response.status === 400) {
          if (errorData.message?.includes('2 heures')) {
            throw new Error(
              "Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l'heure prévue"
            );
          }
          if (errorData.message?.includes('terminé')) {
            throw new Error(
              "Impossible d'annuler un rendez-vous terminé"
            );
          }
        }

        if (response.status === 403) {
          throw new Error(
            'Vous ne pouvez annuler que vos propres rendez-vous'
          );
        }

        const errorMessage =
          errorData.message || errorData.error || "Erreur lors de l'annulation";
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Réponse serveur vide');
      }

      const updatedRdv = JSON.parse(responseText);
      
      // Vérifier que le statut a bien été changé en "Annulé"
      if (updatedRdv.status !== RENDEZVOUS_STATUS.CANCELLED) {
        console.warn('Le rendez-vous a été modifié mais son statut n\'est pas "Annulé"');
      }

      return updatedRdv;
    } catch (error: any) {
      console.error(' Erreur cancelRendezvous:', error.message);
      throw error;
    }
  }


/**
 * Récupère un rendez-vous par son ID
 */
async getRendezvousById(id: string): Promise<Rendezvous> {
  if (!id || id === 'undefined') {
    throw new Error('ID de rendez-vous invalide');
  }

  const response = await this.auth.fetchWithAuth(`/api/rendezvous/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Rendez-vous non trouvé');
    }
    if (response.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }
    throw new Error('Erreur lors de la récupération du rendez-vous');
  }

  return response.json();
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

    // Vérifier si pas déjà passé
    if (rdv.date && rdv.time) {
      const now = new Date();
      const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);

      // Marge de 10 minutes comme dans le backend
      const tenMinutesAgo = new Date(
        now.getTime() - AUTO_EXPIRE_MINUTES * 60 * 1000
      );

      // Si le rendez-vous est dans le passé de plus de 10 minutes
      if (rdvDateTime < tenMinutesAgo) {
        return false;
      }

      // Vérifier la règle des 2 heures
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

      const tenMinutesAgo = new Date(
        now.getTime() - AUTO_EXPIRE_MINUTES * 60 * 1000
      );

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