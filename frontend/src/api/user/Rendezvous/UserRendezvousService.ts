// UserRendezvousService.ts - VERSION CORRIGÉE
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

export class UserRendezvousService {
  private API_URL = import.meta.env.VITE_API_URL;
  private readonly API_TIMEOUT = 15000;

  constructor(
    private access_token: string | null,
    private refreshToken: () => Promise<boolean>,
    private logout: () => void
  ) {}

  /**
   * Méthode générique pour les appels API avec gestion du token
   */
  private async fetchWithAuth(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    // Contrôleur pour timeout
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(
      () => controller.abort(),
      this.API_TIMEOUT
    );

    const makeRequest = async (token: string): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });
    };

    if (!this.access_token) {
      globalThis.clearTimeout(timeoutId);
      throw new Error('SESSION_EXPIRED');
    }

    try {
      let response = await makeRequest(this.access_token);

      if (response.status === 401) {
        try {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Récupérer le nouveau token (sera passé par le contexte)
            const newToken = this.access_token;
            if (!newToken) {
              throw new Error('SESSION_EXPIRED');
            }
            response = await makeRequest(newToken);
          } else {
            throw new Error('SESSION_EXPIRED');
          }
        } catch (error) {
          throw new Error('SESSION_EXPIRED');
        }
      }

      globalThis.clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      globalThis.clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      
      if (error.message === 'SESSION_EXPIRED') {
        throw new Error('SESSION_EXPIRED');
      }
      
      throw error;
    }
  }

  /**
   * Récupère les rendez-vous de l'utilisateur
   */
  async fetchUserRendezvous(params: FetchRendezvousParams): Promise<ApiResponse> {
    try {
      const urlParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
      });

      if (params.status) {
        urlParams.append('status', params.status);
      }

      const response = await this.fetchWithAuth(
        `${this.API_URL}/api/rendezvous/user?${urlParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Gestion d'erreur silencieuse en développement uniquement
      if (import.meta.env.DEV) {
        console.error('Erreur fetchUserRendezvous:', error.message);
      }

      // Afficher un toast uniquement pour les erreurs non liées à la session
      if (error.message !== 'SESSION_EXPIRED') {
        toast.error(this.getUserFriendlyMessage(error.message));
      }

      throw error;
    }
  }

  /**
   * Annule un rendez-vous
   */
  async cancelRendezvous(rdvId: string): Promise<Rendezvous> {
    try {
      const response = await this.fetchWithAuth(
        `${this.API_URL}/api/rendezvous/${rdvId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'annulation');
      }

      const result = await response.json();
      toast.success('Rendez-vous annulé avec succès');
      return result;
    } catch (error: any) {
      // Gestion d'erreur silencieuse en développement uniquement
      if (import.meta.env.DEV) {
        console.error('Erreur cancelRendezvous:', error.message);
      }

      if (error.message === 'SESSION_EXPIRED') {
        throw error; // Laisser le hook gérer la session expirée
      }
      
      if (error.message.includes('à moins de 2 heures')) {
        toast.error('Impossible d\'annuler à moins de 2 heures du rendez-vous');
      } else if (error.message.includes('non confirmé')) {
        toast.error('Vous ne pouvez annuler que les rendez-vous confirmés');
      } else {
        toast.error(error.message || 'Erreur lors de l\'annulation');
      }
      
      throw error;
    }
  }

  /**
   * Messages d'erreur utilisateur-friendly
   */
  private getUserFriendlyMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'SESSION_EXPIRED': 'Session expirée',
      'Délai de connexion dépassé': 'Délai de connexion dépassé',
      'Erreur 400': 'Requête incorrecte',
      'Erreur 401': 'Session expirée',
      'Erreur 403': 'Accès refusé',
      'Erreur 404': 'Rendez-vous non trouvé',
      'Erreur 500': 'Erreur serveur',
    };

    return messages[errorCode] || 'Une erreur est survenue';
  }

  /**
   * Formate une date en français
   */
  static formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Formate une heure
   */
  static formatTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}h${minutes}`;
  }

  /**
   * Vérifie si un rendez-vous peut être annulé
   */
  static canCancelRendezvous(rdv: Rendezvous): boolean {
    if (rdv.status !== 'Confirmé') return false;
    return rdv.canBeCancelledByUser !== false;
  }

  /**
   * Récupère la destination effective
   */
  static getEffectiveDestination(rdv: Rendezvous): string {
    return rdv.effectiveDestination || rdv.destination;
  }

  /**
   * Récupère la filière effective
   */
  static getEffectiveFiliere(rdv: Rendezvous): string {
    return rdv.effectiveFiliere || rdv.filiere;
  }
}