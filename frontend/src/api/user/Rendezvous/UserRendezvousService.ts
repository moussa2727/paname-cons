// UserRendezvousService.ts
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

  constructor(
    private accessToken: string | null,
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
    const makeRequest = async (token: string): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });
    };

    if (!this.accessToken) {
      throw new Error('Session expirée');
    }

    let response = await makeRequest(this.accessToken);

    if (response.status === 401) {
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('access_token') || '';
          response = await makeRequest(newToken);
        } else {
          throw new Error('Session expirée');
        }
      } catch (error) {
        throw new Error('Session expirée');
      }
    }

    return response;
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
        if (response.status === 401) {
          throw new Error('Session expirée');
        }
        
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      
      if (error.message.includes('Session expirée')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        this.logout();
        throw error;
      }
      
      toast.error('Impossible de charger vos rendez-vous');
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
      console.error('Erreur annulation:', error);
      
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