// AdminRendezVousService.ts
import { useAuth } from '../../context/AuthContext';

export interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  status: 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  avisAdmin?: 'Favorable' | 'Défavorable';
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: 'user' | 'admin';
  cancellationReason?: string;
}

export interface CreateRendezVousData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  destination: string;
  destinationAutre: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre: string;
}

export interface RendezvousResponse {
  data: Rendezvous[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL;

export const useAdminRendezVousService = () => {
  const { user, isAuthenticated, refreshAuth } = useAuth();

  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!isAuthenticated || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    const makeRequest = async (): Promise<Response> => {
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      };

      const response = await fetch(`${API_URL}${url}`, config);

      if (response.status === 401) {
        // Tentative de rafraîchissement du token
        const refreshed = await refreshAuth();
        if (refreshed) {
          // Retenter la requête après rafraîchissement
          return await fetch(`${API_URL}${url}`, config);
        }
        throw new Error('Session expirée');
      }

      return response;
    };

    try {
      const response = await makeRequest();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Erreur ${response.status}: ${response.statusText}`
        );
      }

      return response;
    } catch (error: unknown) {
      if ((error as Error).message === 'Session expirée') {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
      throw error;
    }
  };

  const fetchRendezvous = async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = '',
    selectedStatus: string = 'tous',
    date?: string
  ): Promise<RendezvousResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (searchTerm) params.append('search', searchTerm);
    if (selectedStatus && selectedStatus !== 'tous')
      params.append('status', selectedStatus);
    if (date) params.append('date', date);

    const response = await makeAuthenticatedRequest(
      `/api/rendezvous?${params.toString()}`
    );
    return await response.json();
  };

  const fetchAvailableDates = async (): Promise<string[]> => {
    const response = await makeAuthenticatedRequest(
      '/api/rendezvous/available-dates'
    );
    return await response.json();
  };

  const fetchAvailableSlots = async (date: string): Promise<string[]> => {
    if (!date) return [];

    const response = await makeAuthenticatedRequest(
      `/api/rendezvous/available-slots?date=${encodeURIComponent(date)}`
    );
    return await response.json();
  };

  const updateStatus = async (
    id: string,
    status: string,
    avisAdmin?: string
  ): Promise<Rendezvous> => {
    const bodyData: any = { status };

    // STRICTEMENT conforme à la logique backend
    if (status === 'Terminé') {
      if (!avisAdmin || !['Favorable', 'Défavorable'].includes(avisAdmin)) {
        throw new Error(
          "La note de l'avis admin (Favorable ou Défavorable) est obligatoire pour terminer un rendez-vous"
        );
      }
      bodyData.avisAdmin = avisAdmin;
    } else {
      // Nettoyer l'avisAdmin si le statut n'est pas "Terminé"
      bodyData.avisAdmin = null;
    }

    const response = await makeAuthenticatedRequest(
      `/api/rendezvous/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      }
    );

    return await response.json();
  };

  const deleteRendezvous = async (id: string): Promise<void> => {
    await makeAuthenticatedRequest(`/api/rendezvous/${id}`, {
      method: 'DELETE',
    });
  };

  const createRendezvous = async (
    createData: CreateRendezVousData
  ): Promise<Rendezvous> => {
    // LOGIQUE STRICTE IDENTIQUE AU BACKEND
    const processedData: any = {
      firstName: createData.firstName.trim(),
      lastName: createData.lastName.trim(),
      email: createData.email.toLowerCase().trim(),
      telephone: createData.telephone.trim(),
      date: createData.date,
      time: createData.time,
      niveauEtude: createData.niveauEtude,
    };

    // Destination - logique backend stricte
    if (createData.destination === 'Autre') {
      if (
        !createData.destinationAutre ||
        createData.destinationAutre.trim() === ''
      ) {
        throw new Error('Veuillez préciser votre destination');
      }
      processedData.destination = createData.destinationAutre.trim();
      processedData.destinationAutre = createData.destinationAutre.trim();
    } else {
      processedData.destination = createData.destination;
      processedData.destinationAutre = undefined;
    }

    // Filière - logique backend stricte
    if (createData.filiere === 'Autre') {
      if (!createData.filiereAutre || createData.filiereAutre.trim() === '') {
        throw new Error('Veuillez préciser votre filière');
      }
      processedData.filiere = createData.filiereAutre.trim();
      processedData.filiereAutre = createData.filiereAutre.trim();
    } else {
      processedData.filiere = createData.filiere;
      processedData.filiereAutre = undefined;
    }

    // Validation finale conforme au backend
    if (!processedData.destination || processedData.destination.trim() === '') {
      throw new Error('La destination est obligatoire');
    }

    if (!processedData.filiere || processedData.filiere.trim() === '') {
      throw new Error('La filière est obligatoire');
    }

    const response = await makeAuthenticatedRequest('/api/rendezvous', {
      method: 'POST',
      body: JSON.stringify(processedData),
    });

    return await response.json();
  };

  return {
    fetchRendezvous,
    fetchAvailableDates,
    fetchAvailableSlots,
    updateStatus,
    deleteRendezvous,
    createRendezvous,
  };
};
