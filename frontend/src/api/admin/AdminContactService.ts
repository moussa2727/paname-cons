// AdminContactService.ts
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
  page?: number;
  limit?: number;
  isRead?: boolean;
  search?: string;
}

// ===== HOOK PERSONNALISÉ =====
export const useContactService = () => {
  const { isAuthenticated, user, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Fonction de requête sécurisée AVEC délégation complète de l'authentification
  const secureFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
      requireAdmin = false
    ) => {
      // Vérification des droits administrateur - délégation au AuthContext
      if (requireAdmin) {
        if (!isAuthenticated) {
          throw new Error(
            'Authentification requise pour accéder à cette ressource'
          );
        }
        if (!user) {
          throw new Error('Utilisateur non authentifié');
        }
        // Vérification robuste du rôle admin via le AuthContext
        const isAdmin = user.role === 'admin' || user.isAdmin === true;
        if (!isAdmin) {
          throw new Error('Accès refusé : droits administrateur requis');
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // Construction des headers - le AuthContext gère les cookies automatiquement
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...options.headers,
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers,
          credentials: 'include', // Les cookies sont gérés automatiquement
        });

        clearTimeout(timeoutId);

        // Gestion des erreurs d'authentification - délégation au AuthContext
        if (response.status === 401) {
          // Tentative de rafraîchissement du token via AuthContext
          const refreshed = await refreshAuth();
          if (!refreshed) {
            throw new Error('Session expirée, veuillez vous reconnecter');
          }
          // Si le rafraîchissement a réussi, on relance la requête
          return await secureFetch(endpoint, options, requireAdmin);
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message ||
              `Erreur ${response.status}: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Timeout de la requête');
        }
        throw err;
      }
    },
    [API_URL, isAuthenticated, user, refreshAuth]
  );

  // 📋 Récupérer tous les messages avec pagination et filtres
  const getAllContacts = useCallback(
    async (filters: ContactFilters = {}): Promise<ContactResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const { page = 1, limit = 20, isRead, search } = filters;

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (isRead !== undefined) params.append('isRead', isRead.toString());
        if (search) params.append('search', search.trim());

        return await secureFetch(
          `/api/contact?${params}`,
          {
            method: 'GET',
          },
          true // Requiert les droits admin
        );
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors de la récupération des messages';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 📊 Obtenir les statistiques des messages
  const getContactStats = useCallback(async (): Promise<ContactStats> => {
    setIsLoading(true);
    setError(null);

    try {
      return await secureFetch(
        '/api/contact/stats',
        {
          method: 'GET',
        },
        true // Requiert les droits admin
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors de la récupération des statistiques';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [secureFetch]);

  // 👁️ Récupérer un message spécifique
  const getContact = useCallback(
    async (id: string): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        return await secureFetch(
          `/api/contact/${id}`,
          {
            method: 'GET',
          },
          true // Requiert les droits admin
        );
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors de la récupération du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // ✅ Marquer un message comme lu
  const markAsRead = useCallback(
    async (id: string): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await secureFetch(
          `/api/contact/${id}/read`,
          {
            method: 'PATCH',
          },
          true // Requiert les droits admin
        );

        toast.success('Message marqué comme lu');
        return result.contact;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors du marquage du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 📩 Répondre à un message
  const replyToMessage = useCallback(
    async (id: string, reply: string): Promise<Contact> => {
      if (!reply || reply.trim().length < 1) {
        throw new Error('La réponse ne peut pas être vide');
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await secureFetch(
          `/api/contact/${id}/reply`,
          {
            method: 'POST',
            body: JSON.stringify({ reply: reply.trim() }),
          },
          true // Requiert les droits admin
        );

        toast.success('Réponse envoyée avec succès');
        return result.contact;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur lors de l'envoi de la réponse";
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 🗑️ Supprimer un message
  const deleteContact = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await secureFetch(
          `/api/contact/${id}`,
          {
            method: 'DELETE',
          },
          true // Requiert les droits admin
        );

        toast.success('Message supprimé avec succès');
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors de la suppression du message';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  // 📧 Envoyer un message de contact (public)
  const createContact = useCallback(
    async (contactData: CreateContactDto): Promise<Contact> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await secureFetch(
          '/api/contact',
          {
            method: 'POST',
            body: JSON.stringify(contactData),
          },
          false // Public - ne requiert PAS les droits admin
        );

        toast.success('Message envoyé avec succès');
        return result.contact;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur lors de l'envoi du message";
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [secureFetch]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Données
    isLoading,
    error,

    // Fonctions admin
    getAllContacts,
    getContactStats,
    getContact,
    markAsRead,
    replyToMessage,
    deleteContact,

    // Fonction publique
    createContact,

    // Utilitaires
    clearError,

    // Métadonnées (délégation au AuthContext)
    isAdmin: user?.role === 'admin' || user?.isAdmin === true,
    canAccessAdmin:
      isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true),
  };
};

// Hook spécialisé pour l'admin
export const AdminContactService = () => {
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
    clearError: contactService.clearError,
    isAdmin: contactService.isAdmin,
    canAccessAdmin: contactService.canAccessAdmin,
  };
};

export default AdminContactService;
