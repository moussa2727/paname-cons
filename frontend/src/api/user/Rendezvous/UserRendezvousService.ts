// UserRendezvousService.ts - VERSION SIMPLIFIÉE ET CORRIGÉE
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

// Interface pour les fonctions d'authentification du contexte
export interface AuthFunctions {
  getAccessToken: () => string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => void;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

export class UserRendezvousService {
  private API_URL = import.meta.env.VITE_API_URL;

  constructor(
    private auth: AuthFunctions
  ) {}

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

      // Utilisation directe de fetchWithAuth du contexte Auth
      const response = await this.auth.fetchWithAuth(
        `${this.API_URL}/api/rendezvous/user?${urlParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur fetchUserRendezvous:', error.message);
      }

      // La gestion de SESSION_EXPIRED est déjà faite par fetchWithAuth
      // On ne fait pas de toast pour SESSION_EXPIRED car fetchWithAuth s'en occupe
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
      // Utilisation directe de fetchWithAuth du contexte Auth
      const response = await this.auth.fetchWithAuth(
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
      if (import.meta.env.DEV) {
        console.error('❌ Erreur cancelRendezvous:', error.message);
      }

      if (error.message !== 'SESSION_EXPIRED') {
        if (error.message.includes('à moins de 2 heures')) {
          toast.error('Impossible d\'annuler à moins de 2 heures du rendez-vous');
        } else if (error.message.includes('non confirmé')) {
          toast.error('Vous ne pouvez annuler que les rendez-vous confirmés');
        } else {
          toast.error(error.message || 'Erreur lors de l\'annulation');
        }
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
      'SESSION_CHECK_IN_PROGRESS': 'Vérification de session en cours',
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