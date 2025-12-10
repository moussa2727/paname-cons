import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

// Types - en accord avec rendezvous.types.ts
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
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: 'admin' | 'user';
  cancellationReason?: string;
}

export interface RendezvousListResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useRendezvous = () => {
  const { fetchWithAuth, user } = useAuth();

  // Messages
  const MESSAGES = {
    ERROR: {
      TOO_MANY_REQUESTS: 'Veuillez patienter quelques secondes avant de réessayer.',
      FETCH: 'Erreur lors de la récupération des rendez-vous',
      NOT_FOUND: 'Rendez-vous non trouvé',
      UNAUTHORIZED: 'Session expirée. Veuillez vous reconnecter.',
      CANCELLATION: 'Erreur lors de l\'annulation',
      NETWORK: 'Erreur réseau. Vérifiez votre connexion.',
      NO_USER: 'Utilisateur non connecté',
    },
    SUCCESS: {
      CANCELLED: 'Rendez-vous annulé avec succès !',
    }
  };

  /**
   * Récupérer les rendez-vous de l'utilisateur
   * Utilise la nouvelle route /api/rendezvous/user
   */
  const getUserRendezvous = async (
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<RendezvousListResponse> => {
    try {
      // Vérifier que l'utilisateur est connecté
      if (!user) {
        console.warn('❌ Tentative d\'accès sans utilisateur connecté');
        throw new Error(MESSAGES.ERROR.NO_USER);
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status && status !== 'Tous') {
        queryParams.append('status', status);
      }

      console.log(`📡 GET /api/rendezvous/user?${queryParams}`);
      
      const response = await fetchWithAuth(`/api/rendezvous/user?${queryParams}`);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limiting - retourner un objet vide sans throw
          console.warn('⚠️ Rate limit atteint, retour vide');
          return {
            data: [],
            total: 0,
            page: 1,
            limit: limit,
            totalPages: 0
          };
        }
        
        if (response.status === 401 || response.status === 403) {
          console.error('🔒 Accès non autorisé, déconnexion peut-être nécessaire');
          throw new Error(MESSAGES.ERROR.UNAUTHORIZED);
        }
        
        if (response.status === 404) {
          // Pas de rendez-vous - retourner objet vide normal
          console.log('ℹ️ Aucun rendez-vous trouvé pour cet utilisateur');
          return {
            data: [],
            total: 0,
            page: 1,
            limit: limit,
            totalPages: 0
          };
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Erreur serveur ${response.status}:`, errorData);
        throw new Error(errorData.message || `Erreur serveur (${response.status})`);
      }

      const data = await response.json();
      
      console.log(`✅ ${data.data?.length || 0} rendez-vous récupérés`, {
        page: data.page,
        total: data.total,
        totalPages: data.totalPages
      });
      
      // Retourner même si vide
      return {
        data: Array.isArray(data.data) ? data.data : [],
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || limit,
        totalPages: data.totalPages || 0
      };
      
    } catch (error: any) {
      console.error('❌ Erreur getUserRendezvous:', error.message);
      
      // Pour toutes les erreurs réseau, retourner un objet vide
      return {
        data: [],
        total: 0,
        page: 1,
        limit: limit,
        totalPages: 0
      };
    }
  };

  /**
   * Récupérer un rendez-vous spécifique
   * Route: GET /api/rendezvous/:id
   */
  const getRendezvousById = async (id: string): Promise<Rendezvous> => {
    try {
      if (!id) {
        throw new Error('ID du rendez-vous requis');
      }

      console.log(`📡 GET /api/rendezvous/${id}`);
      const response = await fetchWithAuth(`/api/rendezvous/${id}`);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(MESSAGES.ERROR.TOO_MANY_REQUESTS);
        }
        
        if (response.status === 404) {
          throw new Error(MESSAGES.ERROR.NOT_FOUND);
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error(MESSAGES.ERROR.UNAUTHORIZED);
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Erreur GET /api/rendezvous/${id}:`, errorData);
        throw new Error(errorData.message || MESSAGES.ERROR.FETCH);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error(MESSAGES.ERROR.NOT_FOUND);
      }
      
      console.log(`✅ Rendez-vous ${id} récupéré`);
      return data;
    } catch (error: any) {
      console.error('❌ Erreur getRendezvousById:', error.message);
      throw error;
    }
  };

  /**
   * Annuler un rendez-vous
   * Route: DELETE /api/rendezvous/:id
   * Un utilisateur ne peut annuler que les rendez-vous "Confirmé"
   */
  const cancelRendezvous = async (id: string): Promise<Rendezvous> => {
    try {
      if (!id) {
        throw new Error('ID du rendez-vous requis');
      }

      console.log(`📡 DELETE /api/rendezvous/${id}`);
      const response = await fetchWithAuth(`/api/rendezvous/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(MESSAGES.ERROR.TOO_MANY_REQUESTS);
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Erreur DELETE /api/rendezvous/${id}:`, errorData);
        
        if (response.status === 400) {
          if (errorData.message?.includes('moins de 2 heures')) {
            throw new Error('Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l\'heure prévue');
          } else if (errorData.message?.includes('confirmés')) {
            throw new Error('Vous ne pouvez annuler que les rendez-vous confirmés');
          } else if (errorData.message?.includes('non trouvé')) {
            throw new Error(MESSAGES.ERROR.NOT_FOUND);
          }
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error(MESSAGES.ERROR.UNAUTHORIZED);
        }
        
        throw new Error(errorData.message || MESSAGES.ERROR.CANCELLATION);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('Erreur lors de l\'annulation');
      }
      
      console.log(`✅ Rendez-vous ${id} annulé`);
      toast.success(MESSAGES.SUCCESS.CANCELLED, { 
        autoClose: 3000,
        position: 'top-right'
      });
      return data;
    } catch (error: any) {
      console.error('❌ Erreur cancelRendezvous:', error.message);
      toast.error(error.message, {
        autoClose: 4000,
        position: 'top-right'
      });
      throw error;
    }
  };

  /**
   * Créer un nouveau rendez-vous
   * Route: POST /api/rendezvous
   * Le statut par défaut est "Confirmé" (selon le backend)
   */
  const createRendezvous = async (data: any): Promise<Rendezvous> => {
    try {
      console.log('📡 POST /api/rendezvous', data);
      const response = await fetchWithAuth('/api/rendezvous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur création rendez-vous:', errorData);
        throw new Error(errorData.message || 'Erreur lors de la création du rendez-vous');
      }

      const result = await response.json();
      console.log('✅ Rendez-vous créé:', result._id);
      return result;
    } catch (error: any) {
      console.error('❌ Erreur createRendezvous:', error.message);
      throw error;
    }
  };

  return {
    // Méthodes principales
    getUserRendezvous,
    getRendezvousById,
    cancelRendezvous,
    createRendezvous,
    
    // Informations utilisateur
    currentUser: user,
  };
};
