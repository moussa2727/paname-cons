// hooks/useMessages.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { MessagesService } from "../services/message.service";
import type {
  ContactResponseDto,
  ContactQueryDto,
  ContactStatistics,
} from "../types/message.types";
import { toast } from "react-toastify";

interface UseMessagesFilters {
  search: string;
  isRead?: boolean;
  isReplied?: boolean;
  showDeleted: boolean;
  sortBy: "createdAt" | "email";
  sortOrder: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

interface UseMessagesReturn {
  // Données
  messages: ContactResponseDto[];
  stats: ContactStatistics | null;
  unreadCount: number;
  selectedMessage: ContactResponseDto | null;

  // États
  isLoading: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  // Filtres
  filters: UseMessagesFilters;

  // Actions
  refresh: () => Promise<void>;
  setFilter: (filter: Partial<UseMessagesFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  selectMessage: (message: ContactResponseDto | null) => void;
  respond: (id: string, response: string) => Promise<void>;
  markAsRead: (id: string, isRead: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removePermanent: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const DEFAULT_FILTERS: UseMessagesFilters = {
  search: "",
  isRead: undefined,
  isReplied: undefined,
  showDeleted: false,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<ContactResponseDto[]>([]);
  const [stats, setStats] = useState<ContactStatistics | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] =
    useState<ContactResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<UseMessagesFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Refs pour éviter les boucles
  const filtersRef = useRef(filters);
  const paginationRef = useRef(pagination);

  // Synchroniser les refs avec les états
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Fonction de chargement sans dépendances circulaires
  const fetchMessages = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const query: ContactQueryDto = {
        page: paginationRef.current.page,
        limit: paginationRef.current.limit,
        search: filtersRef.current.search || undefined,
        isRead: filtersRef.current.isRead,
        isReplied: filtersRef.current.isReplied,
        showDeleted: filtersRef.current.showDeleted,
        sortBy: filtersRef.current.sortBy,
        sortOrder: filtersRef.current.sortOrder,
        startDate: filtersRef.current.startDate,
        endDate: filtersRef.current.endDate,
      };

      const [listResult, statsResult] = await Promise.all([
        MessagesService.findAll(query),
        MessagesService.getStatistics(),
      ]);

      // Vérifier si listResult est un tableau direct ou un objet avec data
      const messagesData = Array.isArray(listResult)
        ? listResult
        : listResult.data || [];
      console.log("[useMessages] Messages received:", messagesData.length);

      setMessages(messagesData);
      setStats(statsResult);
      setUnreadCount(statsResult.unread);

      // Gérer la pagination selon le format de réponse
      const paginationData = Array.isArray(listResult)
        ? {
            page: 1,
            limit: 10,
            total: listResult.length,
            totalPages: 1,
          }
        : {
            page: listResult.page || 1,
            limit: listResult.limit || 10,
            total: listResult.total || 0,
            totalPages: listResult.totalPages || 1,
          };

      setPagination((prev) => ({
        ...prev,
        ...paginationData,
        hasNextPage: paginationData.page < paginationData.totalPages,
        hasPrevPage: paginationData.page > 1,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur de chargement";
      setError(message);
      toast.error(message);
      console.log("[useMessages] fetchMessages error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Pas de dépendances grâce aux refs

  // Chargement initial
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Rechargement quand les filtres ou pagination changent
  useEffect(() => {
    if (!isLoading) {
      fetchMessages(false);
    }
  }, [
    filters.isRead,
    filters.isReplied,
    filters.showDeleted,
    filters.sortBy,
    filters.sortOrder,
    filters.startDate,
    filters.endDate,
    pagination.page,
    isLoading,
    fetchMessages,
  ]);

  // Rechargement manuel
  const refresh = useCallback(async () => {
    await fetchMessages(false);
  }, [fetchMessages]);

  const setFilter = useCallback((newFilter: Partial<UseMessagesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const respond = useCallback(
    async (id: string, response: string) => {
      try {
        await MessagesService.respond(id, {
          response,
          markAsRead: true,
        });
        toast.success("Réponse envoyée avec succès");
        setSelectedMessage(null);
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'envoi de la réponse";
        toast.error(message);
        console.error("[useMessages] respond error:", err);
      }
    },
    [refresh],
  );

  const markAsRead = useCallback(async (id: string, isRead: boolean) => {
    try {
      await MessagesService.markAsRead(id, isRead);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, isRead } : msg)),
      );
      setUnreadCount((prev) => (isRead ? Math.max(0, prev - 1) : prev + 1));
      toast.success(isRead ? "Marqué comme lu" : "Marqué comme non lu");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      toast.error(message);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      try {
        await MessagesService.remove(id);
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        setUnreadCount((prev) => {
          const wasUnread = messages.find((m) => m.id === id)?.isRead === false;
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
        toast.success("Message supprimé");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la suppression";
        toast.error(message);
      }
    },
    [messages],
  );

  const removePermanent = useCallback(
    async (id: string) => {
      try {
        await MessagesService.removePermanent(id);
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        setUnreadCount((prev) => {
          const wasUnread = messages.find((m) => m.id === id)?.isRead === false;
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
        toast.success("Message supprimé définitivement");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de la suppression définitive";
        toast.error(message);
      }
    },
    [messages],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await MessagesService.markAllAsRead();
      setMessages((prev) => prev.map((msg) => ({ ...msg, isRead: true })));
      setUnreadCount(0);
      toast.success("Tous les messages marqués comme lus");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      toast.error(message);
    }
  }, []);

  return {
    messages,
    stats,
    unreadCount,
    selectedMessage,
    isLoading,
    error,
    pagination,
    filters,
    refresh,
    setFilter,
    resetFilters,
    setPage,
    selectMessage: setSelectedMessage,
    respond,
    markAsRead,
    remove,
    removePermanent,
    markAllAsRead,
  };
}
