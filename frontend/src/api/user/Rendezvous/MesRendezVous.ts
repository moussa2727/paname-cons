export interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
  destination: string;
  avisAdmin?: string;
  typeConsultation?: string;
  notes?: string;
  createdAt: string;
}

export interface RendezvousResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  totalPages: number;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class RendezvousService {
  private static async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}, 
    token: string,
    refreshToken: () => Promise<boolean>
  ): Promise<Response> {
    const makeRequest = async (currentToken: string): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include'
      });
    };

    let response = await makeRequest(token);

    // Gestion du token expiré
    if (response.status === 401) {
      console.log('🔄 Token expiré, tentative de rafraîchissement...');
      const refreshed = await refreshToken();
      if (refreshed) {
        console.log('✅ Token rafraîchi avec succès');
        const newToken = localStorage.getItem('token');
        if (newToken) {
          console.log('🔄 Nouvelle tentative avec le nouveau token...');
          response = await makeRequest(newToken);
        } else {
          throw new Error('Token non disponible après rafraîchissement');
        }
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }

    return response;
  }

// Récupérer les rendez-vous de l'utilisateur
// Récupérer les rendez-vous de l'utilisateur
static async getUserRendezvous(
    email: string, 
    page: number = 1, 
    limit: number = 6,
    status: string = '', // ← Paramètre optionnel avec valeur par défaut
    token: string,
    refreshToken: () => Promise<boolean>
  ): Promise<RendezvousResponse> {
    try {
      // CONSTRUIRE L'URL AVEC LE STATUS OPTIONNEL
      let url = `${API_URL}/api/rendezvous/user?email=${encodeURIComponent(email)}&page=${page}&limit=${limit}`;
      if (status && status !== '') {
        url += `&status=${encodeURIComponent(status)}`;
      }
  
      const response = await this.makeAuthenticatedRequest(
        url,
        { method: 'GET' },
        token,
        refreshToken
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur HTTP récupération rendez-vous:', response.status, errorData);
        throw new Error(errorData.message || 'Erreur lors de la récupération des rendez-vous');
      }
  
      const data = await response.json();
      console.log('✅ Rendez-vous récupérés avec succès:', data.data?.length || 0, 'rendez-vous');
      
      return {
        data: data.data || [],
        total: data.total || 0,
        page: data.page || 1,
        totalPages: Math.ceil((data.total || 0) / limit)
      };
  
    } catch (error) {
      console.error('💥 Erreur getUserRendezvous:', error);
      throw error;
    }
  }
  // Confirmer un rendez-vous
  static async confirmRendezvous(
    id: string,
    token: string,
    refreshToken: () => Promise<boolean>
  ): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${API_URL}/api/rendezvous/${id}/confirm`,
        { method: 'PUT' },
        token,
        refreshToken
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur HTTP confirmation:', response.status, errorData);
        throw new Error(errorData.message || 'Erreur lors de la confirmation du rendez-vous');
      }

      console.log('✅ Rendez-vous confirmé avec succès');
      
    } catch (error) {
      console.error('💥 Erreur confirmRendezvous:', error);
      throw error;
    }
  }

  // Annuler un rendez-vous
 // Annuler un rendez-vous
static async cancelRendezvous(
    id: string,
    token: string,
    refreshToken: () => Promise<boolean>
  ): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${API_URL}/api/rendezvous/${id}`,
        { method: 'DELETE' },
        token,
        refreshToken
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur HTTP annulation:', response.status, errorData);
        
        // ⚠️ AMÉLIORATION : Gestion spécifique des erreurs métier
        if (response.status === 400) {
          // Règle des 2 heures
          if (errorData.message?.includes('2 heures') || 
              errorData.message?.includes('2h')) {
            throw new Error('Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l\'heure prévue');
          }
          // Rendez-vous en cours existant
          if (errorData.message?.includes('déjà un rendez-vous')) {
            throw new Error('Vous avez déjà un rendez-vous en cours');
          }
          // Date passée
          if (errorData.message?.includes('date passée')) {
            throw new Error('Impossible de modifier un rendez-vous passé');
          }
        }
        
        throw new Error(errorData.message || 'Erreur lors de l\'annulation du rendez-vous');
      }
  
      console.log('✅ Rendez-vous annulé avec succès');
      
    } catch (error) {
      console.error('💥 Erreur cancelRendezvous:', error);
      throw error;
    }
  }

  // Vérifier si l'annulation est possible
  static canCancelRendezvous(rdv: Rendezvous): boolean {
    // Si déjà annulé ou terminé, impossible
    if (rdv.status === 'Annulé' || rdv.status === 'Terminé') return false;
    
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // STRICTEMENT supérieur à 2 heures (comme le backend)
    return hoursDiff > 2;
  }

  // Obtenir le message de temps restant
  static getTimeRemainingMessage(rdv: Rendezvous): string | null {
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Messages cohérents avec le backend
    if (hoursDiff <= 2 && hoursDiff > 0) {
      const minutesRemaining = Math.floor((timeDiff / (1000 * 60)) % 60);
      const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
      
      if (hoursRemaining > 0) {
        return `Annulation impossible : ${hoursRemaining}h ${minutesRemaining}min avant le rendez-vous`;
      } else {
        return `Annulation impossible : ${minutesRemaining}min avant le rendez-vous`;
      }
    }
    
    // Si le rendez-vous est passé
    if (hoursDiff <= 0) {
      return 'Ce rendez-vous est déjà passé';
    }
    
    return null;
  }

  // Formater la date
  static formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Formater l'heure
  static formatTime(timeStr: string): string {
    return timeStr.replace(':', 'h');
  }

  // Vérifier si un rendez-vous est à venir
  static isUpcoming(rdv: Rendezvous): boolean {
    const now = new Date();
    const rdvDate = new Date(`${rdv.date}T${rdv.time}`);
    return rdvDate > now && rdv.status !== 'Annulé';
  }

  // Obtenir la configuration du statut
  static getStatusConfig(status: string) {
    const config = {
      'Confirmé': { color: 'text-green-800 bg-green-100 border-green-200', icon: 'CheckCircle' },
      'En attente': { color: 'text-yellow-800 bg-yellow-100 border-yellow-200', icon: 'Clock' },
      'Terminé': { color: 'text-blue-800 bg-blue-100 border-blue-200', icon: 'CheckCircle' },
      'Annulé': { color: 'text-red-800 bg-red-100 border-red-200', icon: 'XCircle' }
    };
    return config[status as keyof typeof config] || config['En attente'];
  }
}