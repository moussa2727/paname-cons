import { apiFetch } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import type {
  ContactResponseDto,
  CreateContactDto,
  RespondContactDto,
  ContactQueryDto,
  ContactListResponse,
  ContactStatistics,
} from "../types/message.types";

const BASE_URL = import.meta.env.VITE_API_URL;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Erreur ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignorer
    }
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  const result = (data.data ?? data) as T;

  return result;
}

export const MessagesService = {
  // Routes publiques
  async create(payload: CreateContactDto): Promise<ContactResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await handleResponse<ContactResponseDto>(res);
      toast.success("Message envoyé avec succès");
      return result;
    } catch (error) {
      console.error("Erreur création message:", error);
      throw error;
    }
  },

  // Routes admin
  async findAll(query: ContactQueryDto = {}): Promise<ContactListResponse> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.set("page", String(query.page));
      if (query.limit) params.set("limit", String(query.limit));
      if (query.isRead !== undefined)
        params.set("isRead", String(query.isRead));
      if (query.isReplied !== undefined)
        params.set("isReplied", String(query.isReplied));
      if (query.email) params.set("email", query.email);
      if (query.search) params.set("search", query.search);
      if (query.startDate) params.set("startDate", query.startDate);
      if (query.endDate) params.set("endDate", query.endDate);
      if (query.sortBy) params.set("sortBy", query.sortBy);
      if (query.sortOrder) params.set("sortOrder", query.sortOrder);
      if (query.showDeleted) params.set("showDeleted", "true");

      const url = `${BASE_URL}/admin/contacts/all?${params}`;
      const res = await apiFetch(url);
      const result = await handleResponse<ContactListResponse>(res);

      return result;
    } catch (error) {
      console.error("Erreur récupération messages:", error);
      throw error;
    }
  },

  async getStatistics(): Promise<ContactStatistics> {
    try {
      const url = `${BASE_URL}/admin/contacts/statistics`;
      const res = await apiFetch(url);
      const result = await handleResponse<ContactStatistics>(res);

      return result;
    } catch (error) {
      console.error("Erreur récupération statistiques:", error);
      throw error;
    }
  },

  async getUnreadCount(): Promise<{ count: number }> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/unread-count`);
      return handleResponse<{ count: number }>(res);
    } catch (error) {
      console.error("Erreur récupération count unread:", error);
      throw error;
    }
  },

  async findById(id: string): Promise<ContactResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}`);
      return handleResponse<ContactResponseDto>(res);
    } catch (error) {
      console.error("Erreur récupération message:", error);
      throw error;
    }
  },

  async respond(
    id: string,
    payload: RespondContactDto,
  ): Promise<ContactResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await handleResponse<ContactResponseDto>(res);
      toast.success("Réponse envoyée avec succès");
      return result;
    } catch (error) {
      console.error("Erreur réponse message:", error);
      throw error;
    }
  },

  async markAsRead(id: string, isRead: boolean): Promise<ContactResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      const result = await handleResponse<ContactResponseDto>(res);
      toast.success(
        isRead ? "Message marqué comme lu" : "Message marqué comme non lu",
      );
      return result;
    } catch (error) {
      console.error("Erreur marquage lu/non lu:", error);
      throw error;
    }
  },

  async markAllAsRead(): Promise<{ count: number }> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/mark-all-read`, {
        method: "POST",
      });
      const result = await handleResponse<{ count: number }>(res);
      toast.success(`${result.count} message(s) marqué(s) comme lu(s)`);
      return result;
    } catch (error) {
      console.error("Erreur marquer tous lus:", error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/delete`, {
        method: "DELETE",
      });
      await handleResponse<void>(res);
      toast.success("Message supprimé avec succès");
    } catch (error) {
      console.error("Erreur suppression message:", error);
      throw error;
    }
  },

  async removePermanent(id: string): Promise<void> {
    try {
      const res = await apiFetch(
        `${BASE_URL}/admin/contacts/${id}/delete?permanent=true`,
        {
          method: "DELETE",
        },
      );
      await handleResponse<void>(res);
      toast.success("Message supprimé définitivement");
    } catch (error) {
      console.error("Erreur suppression définitive:", error);
      throw error;
    }
  },
};
