import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

// ===== INTERFACES =====
export interface Contact {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  message: string;
  isRead: boolean;
  adminResponse?: string;
  respondedAt?: Date;
  respondedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactStats {
  total: number;
  unread: number;
  read: number;
  responded: number;
  thisMonth: number;
  lastMonth: number;
}

export interface CreateContactDto {
  firstName?: string;
  lastName?: string;
  email: string;
  message: string;
}

export interface ContactFilters {
  page: number;
  limit: number;
  isRead?: boolean;
  search?: string;
}

export interface ReplyDto {
  reply: string;
}

// ===== HOOK PERSONNALISÉ =====
export const useContactService = () => {
  const { fetchWithAuth, user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Fonction utilitaire pour vérifier les droits admin
  const isUserAdmin = (currentUser: any): boolean => {
    return currentUser?.role === 'admin';
  };

  // Fonction de requête sécurisée avec gestion d'erreur
  const secureFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
      requireAdmin = false
    ): Promise<any> => {
      if (requireAdmin && (!isAuthenticated || !isUserAdmin(user))) {
        throw new Error('Accès refusé : droits administrateur requis');
      }

      try {
        const response = requireAdmin 
          ? await fetchWithAuth(endpoint, options)
          : await fetch(endpoint, options);

        // Gestion des erreurs HTTP
        if (response.status === 401) {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }

        if (response.status === 403) {
          throw new Error('Accès refusé : droits insuffisants');
        }

        if (response.status === 404) {
          throw new Error('Ressource non trouvée');
        }

        if (response.status === 429) {
          throw new Error('Trop de requêtes, veuillez patienter');
        }

        if (response.status === 409) {
          throw new Error('Conflit : cette ressource existe déjà');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Erreur ${response.status}`);
        }

        return await response.json();
      } catch (err: any) {
        if (err.message === 'SESSION_EXPIRED') {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
        throw err;
      }
    },
    [fetchWithAuth, isAuthenticated, user]
  );

  // Validation des données de contact
  const validateContactData = (data: CreateContactDto): void => {
    if (!data.email || !data.email.trim()) {
      throw new Error('L\'email est obligatoire');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Format d\'email invalide');
    }

    if (!data.message || !data.message.trim()) {
      throw new Error('Le message est obligatoire');
    }

    if (data.message.trim().length < 10) {
      throw new Error('Le message doit contenir au moins 10 caractères');
    }

    if (data.message.trim().length > 2000) {
      throw new Error('Le message ne doit pas dépasser 2000 caractères');
    }

    if (data.firstName && data.firstName.trim().length > 50) {
      throw new Error('Le prénom ne doit pas dépasser 50 caractères');
    }

    if (data.lastName && data.lastName.trim().length > 50) {
      throw new Error('Le nom ne doit pas dépasser 50 caractères');
    }
  };

  // Récupérer tous les messages avec pagination et filtres
  const getAllContacts = useCallback(
    async (filters: ContactFilters = { page: 1, limit: 20 }): Promise<ContactResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const { page = 1, limit = 20, isRead, search } = filters;

        // Validation des paramètres
        if (page < 1) {
          throw new Error('Le numéro de page doit être supérieur à 0');
        }

        if (limit < 1 || limit > 100) {
          throw new Error('La limite doit être entre 1 et 100');
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (isRead !== undefined) params.append('isRead', isRead.toString());
        if (search) params.append('search', search.trim());

        const response = await secureFetch(
          `${API_URL}/contact?${params}`,
          { method: 'GET' },
          true
        );

        return response as ContactResponse;
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de la récupération des messages';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch, API_URL]
  );

  // Obtenir les statistiques des messages
  const getContactStats = useCallback(async (): Promise<ContactStats> => {
    setIsLoading(true);
    setError(null);

    try {
      const stats = await secureFetch(
        `${API_URL}/contact/stats`,
        { method: 'GET' },
        true
      );

      return stats as ContactStats;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la récupération des statistiques';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [secureFetch, API_URL]);

  // Récupérer un message spécifique
  const getContact = useCallback(
    async (id: string): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id || id.length !== 24) {
          throw new Error('ID de message invalide');
        }

        const contact = await secureFetch(
          `${API_URL}/contact/${id}`,
          { method: 'GET' },
          true
        );

        return contact as Contact;
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de la récupération du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch, API_URL]
  );

  // Marquer un message comme lu
  const markAsRead = useCallback(
    async (id: string): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id || id.length !== 24) {
          throw new Error('ID de message invalide');
        }

        const result = await secureFetch(
          `${API_URL}/contact/${id}/read`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          true
        );

        const contact = result.contact;
        toast.success('Message marqué comme lu');
        return contact;
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors du marquage du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch, API_URL]
  );

  // Répondre à un message
  const replyToMessage = useCallback(
    async (id: string, reply: string): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id || id.length !== 24) {
          throw new Error('ID de message invalide');
        }

        if (!reply || reply.trim().length < 1) {
          throw new Error('La réponse ne peut pas être vide');
        }

        const result = await secureFetch(
          `${API_URL}/contact/${id}/reply`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reply: reply.trim() }),
          },
          true
        );

        const contact = result.contact;
        toast.success('Réponse envoyée avec succès');
        return contact;
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de l\'envoi de la réponse';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch, API_URL]
  );

  // Supprimer un message
  const deleteContact = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id || id.length !== 24) {
          throw new Error('ID de message invalide');
        }

        await secureFetch(
          `${API_URL}/contact/${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          true
        );

        toast.success('Message supprimé avec succès');
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de la suppression du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch, API_URL]
  );

  // Envoyer un message de contact (public)
  const createContact = useCallback(
    async (contactData: CreateContactDto): Promise<{ message: string; contact: Contact }> => {
      setIsLoading(true);
      setError(null);

      try {
        validateContactData(contactData);

        const response = await fetch(`${API_URL}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: contactData.firstName?.trim() || undefined,
            lastName: contactData.lastName?.trim() || undefined,
            email: contactData.email.trim(),
            message: contactData.message.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Erreur ${response.status}`);
        }

        const result = await response.json();
        toast.success('Message envoyé avec succès');
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de l\'envoi du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [API_URL]
  );

  // Rechercher des messages
  const searchContacts = useCallback(
    async (query: string, page = 1, limit = 20): Promise<ContactResponse> => {
      return getAllContacts({
        page,
        limit,
        search: query.trim(),
      });
    },
    [getAllContacts]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    isLoading,
    error,

    // Fonctions admin
    getAllContacts,
    getContactStats,
    getContact,
    markAsRead,
    replyToMessage,
    deleteContact,
    searchContacts,

    // Fonction publique
    createContact,

    // Utilitaires
    clearError,
    validateContactData,

    // Métadonnées
    isAdmin: isUserAdmin(user),
    canAccessAdmin: isAuthenticated && isUserAdmin(user),
  };
};

// Hook spécialisé pour l'admin
export const useAdminContactService = () => {
  const contactService = useContactService();

  return {
    isLoading: contactService.isLoading,
    error: contactService.error,
    getAllContacts: contactService.getAllContacts,
    getContactStats: contactService.getContactStats,
    getContact: contactService.getContact,
    markAsRead: contactService.markAsRead,
    replyToMessage: contactService.replyToMessage,
    deleteContact: contactService.deleteContact,
    searchContacts: contactService.searchContacts,
    clearError: contactService.clearError,
    isAdmin: contactService.isAdmin,
    canAccessAdmin: contactService.canAccessAdmin,
  };
};

// Service autonome (non-hook) pour les composants non-React
export class ContactAPIService {
  private API_URL: string;

  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL;
  }

  async createContact(contactData: CreateContactDto): Promise<{ message: string; contact: Contact }> {
    const response = await fetch(`${this.API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: contactData.firstName?.trim() || undefined,
        lastName: contactData.lastName?.trim() || undefined,
        email: contactData.email.trim(),
        message: contactData.message.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Erreur ${response.status}`);
    }

    return await response.json();
  }

  validateContactData(data: CreateContactDto): void {
    if (!data.email || !data.email.trim()) {
      throw new Error('L\'email est obligatoire');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Format d\'email invalide');
    }

    if (!data.message || !data.message.trim()) {
      throw new Error('Le message est obligatoire');
    }

    if (data.message.trim().length < 10) {
      throw new Error('Le message doit contenir au moins 10 caractères');
    }

    if (data.message.trim().length > 2000) {
      throw new Error('Le message ne doit pas dépasser 2000 caractères');
    }

    if (data.firstName && data.firstName.trim().length > 50) {
      throw new Error('Le prénom ne doit pas dépasser 50 caractères');
    }

    if (data.lastName && data.lastName.trim().length > 50) {
      throw new Error('Le nom ne doit pas dépasser 50 caractères');
    }
  }
}

export const contactAPIService = new ContactAPIService();
export default useContactService;