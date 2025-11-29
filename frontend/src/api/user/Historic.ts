const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: string;
  destination: string;
  avisAdmin?: string;
  niveauEtude: string;
  filiere: string;
}

export interface UserStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
}

class HistoricService {
  private static async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Conforme avec l'AuthContext qui utilise les cookies
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée - Veuillez vous reconnecter');
        }
        if (response.status === 403) {
          throw new Error('Accès non autorisé');
        }
        if (response.status === 404) {
          throw new Error('Ressource non trouvée');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur réseau lors de la requête');
    }
  }

  static async getUserStats(userEmail: string): Promise<UserStats> {
    if (!userEmail) {
      throw new Error('Email utilisateur requis');
    }

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/rendezvous/user/stats?email=${encodeURIComponent(userEmail)}`
    );

    const data = await response.json();
    return data;
  }

  static async getCompletedRendezvous(
    userEmail: string
  ): Promise<Rendezvous[]> {
    if (!userEmail) {
      throw new Error('Email utilisateur requis');
    }

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/rendezvous/user/completed?email=${encodeURIComponent(userEmail)}`
    );

    const data = await response.json();
    return data.data || [];
  }

  static async getCancelledRendezvous(
    userEmail: string
  ): Promise<Rendezvous[]> {
    if (!userEmail) {
      throw new Error('Email utilisateur requis');
    }

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/rendezvous/user/cancelled?email=${encodeURIComponent(userEmail)}`
    );

    const data = await response.json();
    return data.data || [];
  }
}

export { HistoricService };
