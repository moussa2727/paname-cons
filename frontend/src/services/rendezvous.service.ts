// ============================================================
// rendezvous.service.ts
// Version alignée strictement sur le backend
// ============================================================

import { apiFetch } from "../context/AuthContext";
import type {
  TimeSlot,
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  CompleteRendezvousDto,
  RendezvousQueryDto,
  RendezvousResponseDto,
  PaginatedRendezvousResponseDto,
  RendezvousStatisticsDto,
  AvailableSlotsDto,
  AvailabilityCheckDto,
  AvailableDatesResponseDto,
  RendezvousFilters,
  ApiError,
} from "../types/rendezvous.types";

class RendezvousService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL as string;
  }

  /**
   * Construit l'URL avec les paramètres de requête
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Formate une date en YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
  }

  /**
   * Gère les erreurs API
   */
  private async handleError(response: Response): Promise<never> {
    let errorMessage = `Erreur ${response.status}`;

    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignorer
    }

    throw new Error(errorMessage);
  }

  /**
   * Traite la réponse API
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await this.handleError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    // Si la réponse a une structure enveloppée (data), l'extraire
    // SAUF si c'est déjà une réponse paginée (qui a déjà une propriété 'data')
    if (data && typeof data === "object" && "data" in data && 
        !("total" in data) && !("page" in data) && !("limit" in data)) {
      return data.data as T;
    }

    return data as T;
  }

  /**
   * GET /rendezvous/available-slots/:date
   */
  async getAvailableSlots(date: Date | string): Promise<AvailableSlotsDto> {
    const dateStr = this.formatDate(date);
    const url = `${this.baseUrl}/rendezvous/available-slots/${encodeURIComponent(dateStr)}`;

    const response = await apiFetch(url);
    return this.handleResponse<AvailableSlotsDto>(response);
  }

  /**
   * GET /rendezvous/available-dates
   */
  async getAvailableDates(
    startDate?: Date | string,
    endDate?: Date | string,
  ): Promise<AvailableDatesResponseDto[]> {
    const params: Record<string, string> = {};

    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);

    const url = this.buildUrl("/rendezvous/available-dates", params);
    const response = await apiFetch(url);

    return this.handleResponse<AvailableDatesResponseDto[]>(response);
  }

  /**
   * GET /rendezvous/check-availability
   */
  async checkAvailability(
    date: Date | string,
    time: TimeSlot,
  ): Promise<AvailabilityCheckDto> {
    const dateStr = this.formatDate(date);
    const url = `${this.baseUrl}/rendezvous/check-availability?date=${encodeURIComponent(dateStr)}&time=${encodeURIComponent(time)}`;

    const response = await apiFetch(url);
    return this.handleResponse<AvailabilityCheckDto>(response);
  }

  /**
   * POST /rendezvous
   */
  async createRendezvous(
    data: CreateRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/rendezvous`;

    const response = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RendezvousResponseDto>(response);
  }

  /**
   * GET /rendezvous/by-email/:email
   */
  async getRendezvousByEmail(email: string): Promise<RendezvousResponseDto[]> {
    const url = `${this.baseUrl}/rendezvous/by-email/${encodeURIComponent(email)}`;

    const response = await apiFetch(url);
    return this.handleResponse<RendezvousResponseDto[]>(response);
  }

  /**
   * GET /rendezvous/:id
   */
  async getRendezvousById(id: string): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/rendezvous/${id}`;

    const response = await apiFetch(url);
    return this.handleResponse<RendezvousResponseDto>(response);
  }

  /**
   * PATCH /rendezvous/:id/cancel
   */
  async cancelRendezvous(
    id: string,
    data: CancelRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/rendezvous/${id}/cancel`;

    const response = await apiFetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RendezvousResponseDto>(response);
  }

  /**
   * GET /admin/rendezvous/all
   */
  async searchRendezvous(
    params: RendezvousQueryDto,
  ): Promise<PaginatedRendezvousResponseDto> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });

    const url = `${this.baseUrl}/admin/rendezvous/all${
      searchParams.toString() ? `?${searchParams}` : ""
    }`;

    const response = await apiFetch(url);
    return this.handleResponse<PaginatedRendezvousResponseDto>(response);
  }

  /**
   * GET /admin/rendezvous/statistics
   */
  async getStatistics(): Promise<RendezvousStatisticsDto> {
    const response = await apiFetch(`${this.baseUrl}/admin/rendezvous/statistics`);
    return this.handleResponse<RendezvousStatisticsDto>(response);
  }

  /**
   * GET /rendezvous/by-date/:date
   */
  async getRendezvousByDate(date: string): Promise<RendezvousResponseDto[]> {
    const url = `${this.baseUrl}/rendezvous/by-date/${encodeURIComponent(date)}`;

    const response = await apiFetch(url);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * PATCH /admin/rendezvous/:id/patch
   */
  async updateRendezvous(
    id: string,
    data: UpdateRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/admin/rendezvous/${id}/patch`;

    const response = await apiFetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RendezvousResponseDto>(response);
  }

  /**
   * PATCH /admin/rendezvous/:id/complete
   */
  async completeRendezvous(
    id: string,
    data: CompleteRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/admin/rendezvous/${id}/complete`;

    const response = await apiFetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RendezvousResponseDto>(response);
  }

  /**
   * DELETE /admin/rendezvous/:id/delete
   */
  async deleteRendezvous(id: string): Promise<void> {
    const url = `${this.baseUrl}/admin/rendezvous/${id}/delete`;

    const response = await apiFetch(url, { method: "DELETE" });
    await this.handleResponse<void>(response);
  }

  /**
   * GET /admin/rendezvous/all avec filtres simplifiés
   */
  async getUpcomingRendezvous(limit = 10): Promise<RendezvousResponseDto[]> {
    const today = new Date();
    const dateStr = this.formatDate(today);

    // Utiliser la logique par défaut du backend (PENDING + CONFIRMED)
    const params: RendezvousQueryDto = {
      date: dateStr,
      sortBy: "date",
      sortOrder: "asc",
      limit,
    };

    const result = await this.searchRendezvous(params);
    return result.data;
  }

  /**
   * Export CSV
   */
  async exportToCSV(filters?: RendezvousFilters): Promise<string> {
    const params: RendezvousQueryDto = {
      limit: 1000,
      ...(filters && {
        ...(filters.status && { 
          status: Array.isArray(filters.status) ? filters.status[0] : filters.status 
        }),
        ...(filters.dateRange && { 
          startDate: filters.dateRange.start, 
          endDate: filters.dateRange.end 
        }),
        ...(filters.searchTerm && { search: filters.searchTerm }),
        ...(filters.avisAdmin && { hasAvis: true }),
        ...(filters.hasProcedure !== undefined && { hasProcedure: filters.hasProcedure }),
      })
    };

    const result = await this.searchRendezvous(params);

    const headers = [
      "ID",
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Destination",
      "Niveau d'étude",
      "Filière",
      "Date",
      "Heure",
      "Statut",
      "Avis Admin",
      "Date création",
    ];

    const rows = result.data.map((rdv) => [
      rdv.id,
      rdv.firstName,
      rdv.lastName,
      rdv.email,
      rdv.telephone,
      rdv.effectiveDestination,
      rdv.effectiveNiveauEtude,
      rdv.effectiveFiliere,
      rdv.date,
      rdv.time,
      rdv.status,
      rdv.avisAdmin || "",
      new Date(rdv.createdAt).toLocaleDateString("fr-FR"),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const rendezvousService = new RendezvousService();