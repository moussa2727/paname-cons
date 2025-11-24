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

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const useAdminRendezVousService = () => {
  const { token, refreshToken } = useAuth();

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('Token non disponible');
    }

    const makeRequest = async (currentToken: string): Promise<Response> => {
      return fetch(`${API_URL}${url}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      });
    };

    let response = await makeRequest(token);

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('token');
        if (newToken) {
          response = await makeRequest(newToken);
        } else {
          throw new Error('Token non disponible après rafraîchissement');
        }
      } else {
        throw new Error('Session expirée');
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la requête');
    }

    return response;
  };

  const fetchRendezvous = async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = '',
    selectedStatus: string = 'tous'
  ): Promise<{ data: Rendezvous[]; total: number }> => {
    let url = `/api/rendezvous?page=${page}&limit=${limit}`;
    
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
    if (selectedStatus && selectedStatus !== 'tous') url += `&status=${encodeURIComponent(selectedStatus)}`;

    const response = await makeAuthenticatedRequest(url);
    const data = await response.json();
    
    return {
      data: data.data || [],
      total: data.total || 0
    };
  };

  const fetchAvailableDates = async (): Promise<string[]> => {
    const response = await makeAuthenticatedRequest('/api/rendezvous/available-dates');
    return await response.json();
  };

  const fetchAvailableSlots = async (date: string): Promise<string[]> => {
    if (!date) return [];
    
    const response = await makeAuthenticatedRequest(`/api/rendezvous/available-slots?date=${date}`);
    return await response.json();
  };

  const updateStatus = async (
    id: string, 
    status: string, 
    avisAdmin?: string
  ): Promise<Rendezvous> => {
    const bodyData: any = { status };
    
    if (status === 'Terminé') {
      if (!avisAdmin || (avisAdmin !== 'Favorable' && avisAdmin !== 'Défavorable')) {
        throw new Error('L\'avis admin (Favorable ou Défavorable) est obligatoire pour terminer un rendez-vous');
      }
      bodyData.avisAdmin = avisAdmin;
    }

    const response = await makeAuthenticatedRequest(`/api/rendezvous/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(bodyData),
    });

    return await response.json();
  };

  const deleteRendezvous = async (id: string): Promise<void> => {
    await makeAuthenticatedRequest(`/api/rendezvous/${id}`, {
      method: 'DELETE',
    });
  };

  const createRendezvous = async (createData: CreateRendezVousData): Promise<Rendezvous> => {
    // LOGIQUE STRICTE POUR LES CHAMPS "AUTRE" - IDENTIQUE AU BACKEND
    const processedData: any = {
      firstName: createData.firstName.trim(),
      lastName: createData.lastName.trim(),
      email: createData.email.trim(),
      telephone: createData.telephone.trim(),
      date: createData.date,
      time: createData.time,
      niveauEtude: createData.niveauEtude
    };

    // Destination - logique stricte
    if (createData.destination === 'Autre') {
      if (!createData.destinationAutre || createData.destinationAutre.trim() === '') {
        throw new Error('Veuillez préciser votre destination');
      }
      processedData.destination = createData.destinationAutre.trim();
      processedData.destinationAutre = createData.destinationAutre.trim();
    } else {
      processedData.destination = createData.destination;
    }

    // Filière - logique stricte
    if (createData.filiere === 'Autre') {
      if (!createData.filiereAutre || createData.filiereAutre.trim() === '') {
        throw new Error('Veuillez préciser votre filière');
      }
      processedData.filiere = createData.filiereAutre.trim();
      processedData.filiereAutre = createData.filiereAutre.trim();
    } else {
      processedData.filiere = createData.filiere;
    }

    // Validation finale
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